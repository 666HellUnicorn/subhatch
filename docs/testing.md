# Testing

No automated test suite yet. Manual test plan below.

## Test Plan

### Authentication

- [ ] Login with correct password → returns session token
- [ ] Login with wrong password → returns 401
- [ ] Login with missing password → returns 400
- [ ] Brute-force: 10 wrong attempts from same IP → 429 blocked for 15 min
- [ ] Successful login after block period → works again
- [ ] Pre-hashed `ADMIN_PASSWORD` (64 hex chars) → login with raw password works

### Session

- [ ] Authenticated requests include `Authorization: Bearer <token>` → accepted
- [ ] No token → 401 on protected endpoints
- [ ] Expired token (after 2h) → 401
- [ ] Logout → token invalidated, 401 on subsequent requests

### Nodes

- [ ] GET `/api/nodes` → returns env nodes + stored nodes
- [ ] PUT `/api/nodes` → saves valid nodes, skips invalid
- [ ] Empty nodes array → returns `saved: 0`
- [ ] Invalid node URI → filtered out
- [ ] Env-var nodes (`VLESS_NODES`) → shown as read-only in response

### Subscription

- [ ] GET `/sub` without `SUB_TOKEN` → returns base64 nodes
- [ ] GET `/sub?token=xxx` with correct token → returns base64 nodes
- [ ] GET `/sub?token=xxx` with wrong token → 401
- [ ] No nodes → empty response with `Profile-Update-Interval: 24`

### UI

- [ ] GET `/` → returns HTML page
- [ ] Login flow → redirect to main panel
- [ ] Add node via input → appears in list
- [ ] Delete stored node → removed from list
- [ ] Bulk import → nodes added, dupes skipped
- [ ] Copy subscription URL → copied to clipboard
- [ ] QR code → renders correctly
- [ ] Logout → returns to login page

### Platform Adapters

- [ ] Cloudflare Workers: deploy and verify all endpoints
- [ ] Node.js: `just run` and test all endpoints locally
- [ ] Docker: `docker compose up` and test all endpoints
