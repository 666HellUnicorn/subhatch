<p align="right">
  <a href="README.md">English</a> |
  <a href="README_zh-CN.md">简体中文</a>
</p>

# vless-sub

A lightweight, self-hosted subscription manager for proxy nodes.

Supports **VLESS · VMess · Trojan · Shadowsocks · Hysteria2 · TUIC**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Dichgrem/subhatch&env=ADMIN_PASSWORD,SUB_TOKEN&envDescription=Required%20environment%20variables&project-name=vless-sub&repository-name=subhatch)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Dichgrem/subhatch)

> **Vercel**: After deploy, create a Vercel KV store in the dashboard and link it — the button auto-fills `ADMIN_PASSWORD` + `SUB_TOKEN`.  
> **Netlify**: Deploys as a serverless function. Set `ADMIN_PASSWORD` and `SUB_TOKEN` in the Netlify UI. Uses in-memory storage — suitable for personal use.

---

## Features

- **Multi-platform** — Cloudflare Workers, Vercel Edge, Node.js / Docker
- **Web UI** — add, delete, bulk import nodes visually
- **Secure admin** — session tokens, brute-force rate limiting (10 attempts / 15 min)
- **Token-gated subscription** — subscription URL includes a secret token
- **Env-var nodes** — inject static nodes without touching the UI
- **Bulk import** — paste raw URIs or base64-encoded subscription content
- **QR code** — scan subscription URL directly from the UI
- **Zero dependencies** — plain ES Modules, no npm install needed for CF / Vercel
- **ADMIN_PASSWORD** can be a pre-computed SHA-256 hex string (64 hex chars) to avoid plaintext storage — or set the raw password directly.
- **Sessions** are random 32-byte hex tokens stored in KV with a 2-hour TTL.
- **Brute-force protection**: after 10 failed login attempts from the same IP within 15 minutes, further attempts are blocked for the duration of the window.
- **SUB_TOKEN** makes your subscription URL unguessable. Without it, `/sub` is public.
- **Env-var nodes** (`VLESS_NODES`) are never written to KV — they live only in the runtime environment.
- Sessions are stored client-side in `localStorage` and sent as a `Bearer` token — not stored in cookies, avoiding CSRF surface.

---

## Quick Start

### Option A — Cloudflare Workers (recommended, free)

```bash
# 1. Install wrangler
npm install -g wrangler
wrangler login

# 2. Create KV namespace
wrangler kv namespace create VLESS_KV
# → copy wrangler.toml.example to wrangler.toml and paste your id

# 3. Deploy (creates the Worker; will 500 until secrets are set)
wrangler deploy api/cloudflare.js

# 4. Set secrets
wrangler secret put ADMIN_PASSWORD
wrangler secret put SUB_TOKEN        # optional but recommended

# 5. (Optional) static nodes via env var
# In wrangler.toml [vars]:
# VLESS_NODES = "vless://...#MyNode1|vmess://...#MyNode2"

# 6. Redeploy to apply secrets
wrangler deploy api/cloudflare.js
```

Visit `https://your-worker.workers.dev` → login → manage nodes.

---

### Option B — Vercel Edge (free)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Create a Vercel KV database in the dashboard
#    Settings → Storage → Create KV → copy the env vars

# 3. Set environment variables in Vercel dashboard:
#    ADMIN_PASSWORD   (required)
#    SUB_TOKEN        (optional)
#    VLESS_NODES      (optional)
#    KV_REST_API_URL  (from Vercel KV)
#    KV_REST_API_TOKEN(from Vercel KV)

# 4. Deploy
vercel --prod
```

---

### Option C — Node.js / Docker (self-hosted VPS)

**Direct Node.js:**
```bash
ADMIN_PASSWORD=changeme SUB_TOKEN=mytoken node api/node.js
# Listens on :3000
```

**Docker:**
```bash
docker build -t vless-sub .

docker run -d \
  -p 3000:3000 \
  -v vless-data:/data \
  -e ADMIN_PASSWORD=your_strong_password \
  -e SUB_TOKEN=your_random_token \
  --name vless-sub \
  vless-sub
```

**Docker Compose:**
```yaml
services:
  vless-sub:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
    environment:
      - ADMIN_PASSWORD=your_strong_password
      - SUB_TOKEN=your_random_token
      - VLESS_NODES=vless://...#node1|vmess://...#node2
    restart: unless-stopped
```

---

## Project Structure

```
vless-sub/
├── src/
│   ├── core.js           # Platform-agnostic business logic
│   └── ui.html.js        # Web UI HTML template
├── api/
│   ├── cloudflare.js     # Cloudflare Workers entry
│   ├── vercel.js         # Vercel Edge entry
│   ├── node.js           # Node.js HTTP server
│   ├── netlify.js        # Netlify Functions entry
│   └── index.js          # Vercel re-export
├── netlify/
│   └── functions/
│       └── api.js        # Thin re-export → api/netlify.js
├── netlify.toml          # Netlify config
├── wrangler.toml         # Cloudflare Workers config
├── vercel.json           # Vercel routing config
├── Dockerfile
├── justfile              # Dev commands
└── package.json
```

---

## Environment Variables

| Variable        | Required | Description                                                |
|-----------------|----------|------------------------------------------------------------|
| `ADMIN_PASSWORD`| ✅ Yes   | Password for the Web UI admin login                        |
| `SUB_TOKEN`     | No       | Secret token required to access `/sub`. Highly recommended |
| `VLESS_NODES`   | No       | Static nodes (pipe `\|` or newline separated). Read-only in UI |
| `PORT`          | No       | Node.js only. Default: `3000`                              |
| `DATA_FILE`     | No       | Node.js only. Path to JSON store. Default: `./data.json`   |

---

## API Reference

| Method | Path           | Auth          | Description                        |
|--------|----------------|---------------|------------------------------------|
| GET    | `/`            | —             | Web UI                             |
| GET    | `/sub`         | token (opt.)  | Base64 subscription content        |
| POST   | `/api/login`   | password      | Returns session token              |
| POST   | `/api/logout`  | session       | Invalidates session                |
| GET    | `/api/nodes`   | session       | List env + stored nodes            |
| PUT    | `/api/nodes`   | session       | Save stored nodes (replaces all)   |
| GET    | `/api/sub-url` | session       | Returns the full subscription URL  |
| GET    | `/api/ping`    | —             | Health check                       |
