/**
 * Vercel Edge Runtime adapter
 *
 * Deploy: drop this file at /api/[...path].js (or use vercel.json rewrites)
 *
 * Uses Vercel KV (Redis-compatible) for storage.
 * Set these environment variables in the Vercel dashboard:
 *   ADMIN_PASSWORD   — required
 *   SUB_TOKEN        — optional
 *   VLESS_NODES      — optional
 *   KV_REST_API_URL  — from Vercel KV dashboard
 *   KV_REST_API_TOKEN— from Vercel KV dashboard
 */

export const runtime = "edge";

import { handleRequest } from "../src/core.js";

/**
 * Vercel KV REST adapter
 * Uses the @vercel/kv REST API directly so we don't need Node.js.
 */
function makeVercelKVStore(apiUrl, apiToken) {
	const headers = {
		Authorization: `Bearer ${apiToken}`,
		"Content-Type": "application/json",
	};

	async function kvCmd(...args) {
		const res = await fetch(
			`${apiUrl}/${args.map(encodeURIComponent).join("/")}`,
			{
				method: "GET",
				headers,
			},
		);
		if (!res.ok) return null;
		const data = await res.json();
		return data.result ?? null;
	}

	async function kvPost(body) {
		const res = await fetch(apiUrl, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		});
		return res.ok;
	}

	return {
		async get(key) {
			return kvCmd("get", key);
		},
		async set(key, value, ttlSeconds) {
			if (ttlSeconds) {
				return kvPost(["SET", key, value, "EX", String(Math.ceil(ttlSeconds))]);
			}
			return kvPost(["SET", key, value]);
		},
		async del(key) {
			return kvPost(["DEL", key]);
		},
	};
}

export default async function handler(req) {
	const {
		KV_REST_API_URL,
		KV_REST_API_TOKEN,
		ADMIN_PASSWORD,
		SUB_TOKEN,
		VLESS_NODES,
	} = process.env;

	if (!ADMIN_PASSWORD) {
		return new Response("ADMIN_PASSWORD env var is not set.", { status: 500 });
	}
	if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
		return new Response(
			"Vercel KV is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN env vars.",
			{ status: 500 },
		);
	}

	const store = makeVercelKVStore(KV_REST_API_URL, KV_REST_API_TOKEN);

	const normalizedEnv = {
		ADMIN_PASSWORD,
		SUB_TOKEN: SUB_TOKEN || "",
		VLESS_NODES: VLESS_NODES || "",
		store,
	};

	return handleRequest(req, normalizedEnv);
}
