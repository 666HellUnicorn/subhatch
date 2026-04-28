/**
 * Node.js adapter — self-hosted / Docker
 *
 * Uses a local JSON file as KV store (no Redis required).
 * For production self-hosting, swap makeFileStore() with makeRedisStore().
 *
 * Usage:
 *   ADMIN_PASSWORD=changeme SUB_TOKEN=mysecret node adapters/node.js
 *
 * Environment variables:
 *   ADMIN_PASSWORD   — required
 *   SUB_TOKEN        — optional
 *   VLESS_NODES      — optional, pipe/newline separated
 *   PORT             — default 3000
 *   DATA_FILE        — path to JSON store, default ./data.json
 */

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { handleRequest } from "../src/core.js";

// ─── File-based KV store ──────────────────────────────────────────────────────
const DATA_FILE =
	process.env.DATA_FILE ?? path.join(process.cwd(), "data.json");

let _db = null;
async function loadDB() {
	if (_db) return _db;
	try {
		const raw = await fs.readFile(DATA_FILE, "utf8");
		_db = JSON.parse(raw);
	} catch {
		_db = {};
	}
	return _db;
}

async function saveDB() {
	await fs.writeFile(DATA_FILE, JSON.stringify(_db, null, 2), "utf8");
}

function makeFileStore() {
	return {
		async get(key) {
			const db = await loadDB();
			const entry = db[key];
			if (!entry) return null;
			if (entry.exp && Date.now() > entry.exp) {
				delete db[key];
				await saveDB();
				return null;
			}
			return entry.val;
		},
		async set(key, value, ttlSeconds) {
			const db = await loadDB();
			db[key] = {
				val: String(value),
				exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
			};
			await saveDB();
		},
		async del(key) {
			const db = await loadDB();
			delete db[key];
			await saveDB();
		},
	};
}

// ─── Node.js Request → Web API Request adapter ───────────────────────────────
function nodeToWebRequest(req, body) {
	const host = req.headers.host || "localhost";
	const url = `http://${host}${req.url}`;
	const headers = new Headers();
	for (const [k, v] of Object.entries(req.headers)) {
		if (typeof v === "string") headers.set(k, v);
		else if (Array.isArray(v)) v.forEach((val) => headers.append(k, val));
	}
	return new Request(url, {
		method: req.method,
		headers,
		body: ["GET", "HEAD"].includes(req.method) ? null : body,
	});
}

// ─── Server ──────────────────────────────────────────────────────────────────
const store = makeFileStore();

const { ADMIN_PASSWORD, SUB_TOKEN, VLESS_NODES, PORT = "3000" } = process.env;

if (!ADMIN_PASSWORD) {
	console.error(
		"[vless-sub] ERROR: ADMIN_PASSWORD environment variable is not set.",
	);
	process.exit(1);
}

const env = {
	ADMIN_PASSWORD,
	SUB_TOKEN: SUB_TOKEN || "",
	VLESS_NODES: VLESS_NODES || "",
	store,
};

const server = http.createServer(async (req, res) => {
	// Collect body
	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	const body = chunks.length ? Buffer.concat(chunks) : null;

	const webReq = nodeToWebRequest(req, body);

	try {
		const webRes = await handleRequest(webReq, env);

		res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));
		const buf = await webRes.arrayBuffer();
		res.end(Buffer.from(buf));
	} catch (err) {
		console.error("[vless-sub] Unhandled error:", err);
		res.writeHead(500, { "Content-Type": "text/plain" });
		res.end("Internal Server Error");
	}
});

server.listen(Number(PORT), () => {
	console.log(`[vless-sub] Listening on http://0.0.0.0:${PORT}`);
	console.log(
		`[vless-sub] Sub URL: http://0.0.0.0:${PORT}/sub${SUB_TOKEN ? "?token=" + SUB_TOKEN : ""}`,
	);
});
