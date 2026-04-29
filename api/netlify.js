/**
 * Netlify Functions adapter
 *
 * Converts Netlify event to Web API Request/Response and delegates
 * to core.js. Uses in-memory storage — suitable for personal use.
 * For production, replace makeMemStore with a durable KV backend.
 */

import { handleRequest } from "../../src/core.js";

const store = new Map();

function makeMemStore() {
	return {
		async get(key) {
			const entry = store.get(key);
			if (!entry) return null;
			if (entry.exp && Date.now() > entry.exp) {
				store.delete(key);
				return null;
			}
			return entry.val;
		},
		async set(key, value, ttlSeconds) {
			store.set(key, {
				val: value,
				exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
			});
		},
		async del(key) {
			store.delete(key);
		},
	};
}

export const handler = async (event) => {
	const env = {
		ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
		SUB_TOKEN: process.env.SUB_TOKEN || "",
		VLESS_NODES: process.env.VLESS_NODES || "",
		store: makeMemStore(),
	};

	const url = new URL(event.rawUrl);
	const headers = new Headers(event.headers);
	const req = new Request(url, {
		method: event.httpMethod,
		headers,
		body: event.body || null,
	});

	const res = await handleRequest(req, env);

	return {
		statusCode: res.status,
		headers: Object.fromEntries(res.headers.entries()),
		body: await res.text(),
	};
};
