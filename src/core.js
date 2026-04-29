/**
 * vless-sub — Core Logic
 * Platform-agnostic. All handlers receive a normalized Env object.
 */

import { HTML_PAGE } from "./ui.html.js";

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const SESSION_TTL = 2 * 60 * 60 * 1000; // 2h
const BRUTE_WINDOW = 15 * 60 * 1000; // 15min window
const BRUTE_MAX = 10; // max attempts
const KV_NODES_KEY = "vless:nodes";
const KV_SESSION_PFX = "session:";
const KV_BRUTE_PFX = "brute:";

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function jsonResp(data, status = 200, extra = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json", ...extra },
	});
}

function textResp(text, status = 200, headers = {}) {
	return new Response(text, {
		status,
		headers: { "Content-Type": "text/plain; charset=utf-8", ...headers },
	});
}

async function sha256(str) {
	const buf = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(str),
	);
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function randomToken(len = 32) {
	const arr = new Uint8Array(len);
	crypto.getRandomValues(arr);
	return Array.from(arr)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function toBase64(str) {
	// Works in both browser and Workers/Node
	if (typeof btoa !== "undefined")
		return btoa(unescape(encodeURIComponent(str)));
	return Buffer.from(str, "utf8").toString("base64");
}

function clientIP(req) {
	return (
		req.headers.get("CF-Connecting-IP") ||
		req.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
		req.headers.get("X-Real-IP") ||
		"unknown"
	);
}

// ─────────────────────────────────────────────
//  KV abstraction — env.store must implement:
//    get(key) -> string | null
//    set(key, value, ttlSeconds?) -> void
//    del(key) -> void
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
//  Session helpers
// ─────────────────────────────────────────────
async function createSession(store) {
	const token = randomToken();
	const data = JSON.stringify({ ts: Date.now() });
	await store.set(KV_SESSION_PFX + token, data, SESSION_TTL / 1000);
	return token;
}

async function validateSession(store, token) {
	if (!token) return false;
	const raw = await store.get(KV_SESSION_PFX + token);
	if (!raw) return false;
	try {
		const { ts } = JSON.parse(raw);
		return Date.now() - ts < SESSION_TTL;
	} catch {
		return false;
	}
}

async function destroySession(store, token) {
	if (token) await store.del(KV_SESSION_PFX + token);
}

// ─────────────────────────────────────────────
//  Brute-force guard
// ─────────────────────────────────────────────
async function checkBrute(store, ip) {
	const key = KV_BRUTE_PFX + ip;
	const raw = await store.get(key);
	if (!raw) return { blocked: false, attempts: 0 };
	const { attempts, first } = JSON.parse(raw);
	if (Date.now() - first > BRUTE_WINDOW) {
		await store.del(key);
		return { blocked: false, attempts: 0 };
	}
	return { blocked: attempts >= BRUTE_MAX, attempts };
}

async function recordBrute(store, ip) {
	const key = KV_BRUTE_PFX + ip;
	const raw = await store.get(key);
	let attempts = 1,
		first = Date.now();
	if (raw) {
		const prev = JSON.parse(raw);
		if (Date.now() - prev.first < BRUTE_WINDOW) {
			attempts = prev.attempts + 1;
			first = prev.first;
		}
	}
	await store.set(
		key,
		JSON.stringify({ attempts, first }),
		BRUTE_WINDOW / 1000,
	);
}

async function clearBrute(store, ip) {
	await store.del(KV_BRUTE_PFX + ip);
}

// ─────────────────────────────────────────────
//  Node storage
// ─────────────────────────────────────────────
async function getNodes(store) {
	const raw = await store.get(KV_NODES_KEY);
	if (!raw) return [];
	try {
		return JSON.parse(raw);
	} catch {
		return [];
	}
}

async function saveNodes(store, nodes) {
	await store.set(KV_NODES_KEY, JSON.stringify(nodes));
}

// ─────────────────────────────────────────────
//  Auth helper — extracts session token from
//  Authorization header or session cookie
// ─────────────────────────────────────────────
function getSessionToken(req) {
	const auth = req.headers.get("Authorization") || "";
	if (auth.startsWith("Bearer ")) return auth.slice(7);
	// fallback: cookie
	const cookie = req.headers.get("Cookie") || "";
	const m = cookie.match(/session=([^;]+)/);
	return m ? m[1] : null;
}

// ─────────────────────────────────────────────
//  Route handlers
// ─────────────────────────────────────────────

/** POST /api/login */
async function handleLogin(req, env) {
	const ip = clientIP(req);
	const brute = await checkBrute(env.store, ip);
	if (brute.blocked) {
		return jsonResp(
			{ error: "Too many attempts. Try again in 15 minutes." },
			429,
		);
	}

	let body;
	try {
		body = await req.json();
	} catch {
		return jsonResp({ error: "Invalid JSON" }, 400);
	}

	const { password } = body || {};
	if (!password) return jsonResp({ error: "Password required" }, 400);

	const adminHash = await sha256(env.ADMIN_PASSWORD);
	const inputHash = await sha256(password);

	if (inputHash !== adminHash) {
		await recordBrute(env.store, ip);
		return jsonResp({ error: "Incorrect password" }, 401);
	}

	await clearBrute(env.store, ip);
	const token = await createSession(env.store);
	return jsonResp({ token });
}

/** POST /api/logout */
async function handleLogout(req, env) {
	const token = getSessionToken(req);
	await destroySession(env.store, token);
	return jsonResp({ ok: true });
}

/** GET /api/nodes */
async function handleGetNodes(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}

	// Env-var nodes take priority and are shown as read-only
	const envNodes = parseEnvNodes(env.VLESS_NODES);
	const storedNodes = await getNodes(env.store);
	return jsonResp({ envNodes, storedNodes });
}

/** PUT /api/nodes */
async function handleSaveNodes(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}

	let body;
	try {
		body = await req.json();
	} catch {
		return jsonResp({ error: "Invalid JSON" }, 400);
	}

	const { nodes } = body || {};
	if (!Array.isArray(nodes))
		return jsonResp({ error: "nodes must be an array" }, 400);

	// Validate each entry
	const valid = nodes.filter(
		(n) => typeof n === "string" && isValidNode(n.trim()),
	);
	await saveNodes(
		env.store,
		valid.map((n) => n.trim()),
	);
	return jsonResp({ ok: true, saved: valid.length });
}

/** GET /sub  — public subscription endpoint */
async function handleSub(req, env) {
	const url = new URL(req.url);

	// Token check (if SUB_TOKEN is set)
	if (env.SUB_TOKEN) {
		const t = url.searchParams.get("token");
		if (!t || t !== env.SUB_TOKEN) {
			return textResp("Unauthorized", 401);
		}
	}

	// Merge env nodes + stored nodes
	const envNodes = parseEnvNodes(env.VLESS_NODES);
	const stored = await getNodes(env.store);
	const all = [...envNodes, ...stored].filter(Boolean);

	if (all.length === 0) {
		return textResp("", 200, {
			"Content-Type": "text/plain",
			"Profile-Update-Interval": "24",
		});
	}

	const content = toBase64(all.join("\n"));
	return textResp(content, 200, {
		"Content-Type": "text/plain; charset=utf-8",
		"Profile-Update-Interval": "24",
		"Cache-Control": "no-store",
	});
}

/** GET /api/sub-url  — returns the subscription URL for display */
async function handleSubUrl(req, env) {
	const token = getSessionToken(req);
	if (!(await validateSession(env.store, token))) {
		return jsonResp({ error: "Unauthorized" }, 401);
	}
	const base = new URL(req.url).origin;
	const subPath = env.SUB_TOKEN ? `/sub?token=${env.SUB_TOKEN}` : "/sub";
	return jsonResp({ url: base + subPath });
}

/** GET /api/ping */
function handlePing() {
	return jsonResp({ ok: true, ts: Date.now() });
}

// ─────────────────────────────────────────────
//  Node validation
// ─────────────────────────────────────────────
const VALID_SCHEMES = [
	"vless://",
	"vmess://",
	"trojan://",
	"ss://",
	"ssr://",
	"hysteria2://",
	"hy2://",
	"tuic://",
];

function isValidNode(str) {
	return VALID_SCHEMES.some((s) => str.startsWith(s));
}

function parseEnvNodes(raw) {
	if (!raw) return [];
	// Support newline or pipe separated
	return raw
		.split(/[\n|]/)
		.map((s) => s.trim())
		.filter(isValidNode);
}

// ─────────────────────────────────────────────
//  Main router
// ─────────────────────────────────────────────
export async function handleRequest(req, env) {
	const url = new URL(req.url);
	const method = req.method.toUpperCase();
	const path = url.pathname.replace(/\/$/, "") || "/";

	// CORS preflight
	if (method === "OPTIONS") {
		return new Response(null, {
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		});
	}

	if (path === "/sub" && method === "GET") return handleSub(req, env);
	if (path === "/api/ping" && method === "GET") return handlePing();
	if (path === "/api/login" && method === "POST") return handleLogin(req, env);
	if (path === "/api/logout" && method === "POST")
		return handleLogout(req, env);
	if (path === "/api/nodes" && method === "GET")
		return handleGetNodes(req, env);
	if (path === "/api/nodes" && method === "PUT")
		return handleSaveNodes(req, env);
	if (path === "/api/sub-url" && method === "GET")
		return handleSubUrl(req, env);

	// Serve UI for all other GET paths
	if (method === "GET") return serveUI();

	return jsonResp({ error: "Not found" }, 404);
}

// ─────────────────────────────────────────────
//  UI
// ─────────────────────────────────────────────
function serveUI() {
	return new Response(HTML_PAGE, {
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}
