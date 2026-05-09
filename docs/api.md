# API Reference

## Public endpoints

| Method | Path       | Auth       | Description                         |
|--------|------------|------------|-------------------------------------|
| GET    | `/`        | —          | Web UI                              |
| GET    | `/sub`     | token      | Base64 subscription content         |
| GET    | `/api/ping`| —          | Health check                        |

## Admin endpoints (session required)

All `/api/*` endpoints except `/api/ping` require a valid session token in the `Authorization: Bearer <token>` header.

| Method | Path                | Description                          |
|--------|---------------------|--------------------------------------|
| POST   | `/api/login`        | Returns session token                |
| POST   | `/api/logout`       | Invalidates session                  |
| GET    | `/api/nodes`        | List env + stored nodes              |
| PUT    | `/api/nodes`        | Save stored nodes (replaces all)     |
| GET    | `/api/sub-url`      | Returns the primary subscription URL |
| PUT    | `/api/sub-token`    | Rotate the primary subscription token|
| GET    | `/api/sub-tokens`   | List all tokens (primary + scoped)   |
| POST   | `/api/sub-tokens`   | Create a scoped token               |
| PUT    | `/api/sub-tokens`   | Update a scoped token               |
| DELETE | `/api/sub-tokens`   | Delete a scoped token               |

## Scoped tokens

Scoped tokens allow sharing specific nodes with different people. Each scoped token has:
- `name` — optional display name
- `nodes` — array of node URIs this token can access

When a scoped token is used with `/sub?token=<scoped>`, only the assigned nodes are returned.

The **primary** token (set via `SUB_TOKEN` env var, `sub:token` KV key, or rotated via `/api/sub-token`) grants access to **all** nodes.

## POST /api/sub-tokens

Create a new scoped token.

```json
// Request
{ "name": "Friend A", "nodes": ["vless://abc@1.1.1.1:443#Tokyo"] }
// Response
{ "token": "<48-char-hex>", "name": "Friend A", "nodes": ["vless://abc@1.1.1.1:443#Tokyo"] }
```

## PUT /api/sub-tokens

Update a scoped token's name and/or node list.

```json
// Request
{ "token": "<48-char-hex>", "name": "New Name", "nodes": ["vless://..."] }
// Response
{ "token": "<48-char-hex>", "name": "New Name", "nodes": ["vless://..."] }
```

## DELETE /api/sub-tokens

Delete a scoped token. Token passed as query parameter.

```
DELETE /api/sub-tokens?token=<48-char-hex>
→ { "ok": true }
```

## GET /sub — Subscription endpoint

| Parameter | Description                              |
|-----------|------------------------------------------|
| `?token=` | Primary token → all nodes, scoped token → assigned nodes |

- No `SUB_TOKEN` set → `/sub` is public (all nodes, no token needed)
- `SUB_TOKEN` set → `/sub` requires `?token=<primary>` for all nodes, or `?token=<scoped>` for filtered
- Invalid tokens return `401` and are rate-limited (shared with login brute-force: 10 attempts / 15 min per IP)
- Response: `Content-Type: text/plain`, Base64-encoded, one URI per line

## Rate limiting

- `POST /api/login`: 10 wrong attempts / 15 min per IP
- `GET /sub`: invalid tokens count toward the same 10-attempt / 15 min per IP limit
- After 10 failures, returns `429 Too many requests`
- Successful login or valid sub access clears the counter
