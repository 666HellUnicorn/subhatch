<p align="right">
  <a href="README.md">English</a> |
  <a href="README_zh-CN.md">简体中文</a>
</p>


# vless-sub

轻量级、自托管的代理节点订阅管理器。  
支持 **VLESS · VMess · Trojan · Shadowsocks · Hysteria2 · TUIC**。

一次部署，即可导入 **husi / sing-box / NekoBox / Clash Meta / Shadowrocket** 等客户端。

---

## 特性

- **多平台** — Cloudflare Workers、Vercel Edge、Node.js / Docker
- **Web 管理界面** — 可视化添加、删除、批量导入节点
- **安全管理** — 会话 Token、暴力破解限流（15 分钟内最多 10 次）
- **Token 鉴权订阅** — 订阅地址可设置密钥访问
- **环境变量注入节点** — 无需通过 UI 即可添加固定节点
- **批量导入** — 支持粘贴原始 URI 或 base64 编码的订阅内容
- **二维码** — 在 UI 中直接扫码获取订阅地址
- **零依赖** — 纯 ES Modules，CF / Vercel 无需 npm install

---

## 快速开始

### 方案 A — Cloudflare Workers（推荐，免费）

```bash
# 1. 安装 wrangler
npm install -g wrangler
wrangler login

# 2. 创建 KV 命名空间
wrangler kv namespace create VLESS_KV
# → 将返回的 id 填入 wrangler.toml

# 3. 设置密钥
wrangler secret put ADMIN_PASSWORD
wrangler secret put SUB_TOKEN        # 可选，但强烈建议

# 4. （可选）通过环境变量添加固定节点
# 在 wrangler.toml 的 [vars] 中：
# VLESS_NODES = "vless://...#MyNode1|vmess://...#MyNode2"

# 5. 部署
wrangler deploy adapters/cloudflare.js
```

访问 `https://your-worker.workers.dev` → 登录 → 管理节点。

---

### 方案 B — Vercel Edge（免费）

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 在 Vercel 控制台创建 KV 数据库
#    Settings → Storage → Create KV → 复制环境变量

# 3. 在 Vercel 控制台设置环境变量：
#    ADMIN_PASSWORD   （必填）
#    SUB_TOKEN        （可选）
#    VLESS_NODES      （可选）
#    KV_REST_API_URL  （来自 Vercel KV）
#    KV_REST_API_TOKEN（来自 Vercel KV）

# 4. 部署
vercel --prod
```

---

### 方案 C — Node.js / Docker（自建 VPS）

**直接运行 Node.js：**
```bash
ADMIN_PASSWORD=changeme SUB_TOKEN=mytoken node adapters/node.js
# 监听 :3000 端口
```

**Docker：**
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

**Docker Compose：**
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

## 环境变量

| 变量            | 必填   | 说明                                         |
|-----------------|--------|----------------------------------------------|
| `ADMIN_PASSWORD`| ✅ 是  | Web 管理界面登录密码                           |
| `SUB_TOKEN`     | 否     | 访问 `/sub` 所需的密钥，强烈建议配置             |
| `VLESS_NODES`   | 否     | 固定节点（`\|` 或换行分隔），在 UI 中只读        |
| `PORT`          | 否     | 仅 Node.js。默认：`3000`                       |
| `DATA_FILE`     | 否     | 仅 Node.js。JSON 存储文件路径。默认：`./data.json` |

---

## API 参考

| 方法   | 路径           | 认证          | 说明                     |
|--------|----------------|---------------|--------------------------|
| GET    | `/`            | —             | Web 管理界面              |
| GET    | `/sub`         | token（可选） | Base64 订阅内容           |
| POST   | `/api/login`   | password      | 返回会话 Token            |
| POST   | `/api/logout`  | session       | 使会话失效                |
| GET    | `/api/nodes`   | session       | 列出环境变量和存储的节点    |
| PUT    | `/api/nodes`   | session       | 保存节点（全量替换）       |
| GET    | `/api/sub-url` | session       | 返回完整订阅地址           |
| GET    | `/api/ping`    | —             | 健康检查                  |

---

## 安全说明

- **ADMIN_PASSWORD** 从不以明文存储 — 仅通过 SHA-256 哈希比对。  
- **会话** 是随机 32 字节十六进制 Token，存储在 KV 中，2 小时后过期。  
- **暴力破解防护**：同一 IP 在 15 分钟内登录失败超过 10 次后，该时间窗口内将被阻止。  
- **SUB_TOKEN** 让你的订阅地址无法被猜测。不配置时 `/sub` 为公开访问。  
- **环境变量节点**（`VLESS_NODES`）不会被写入 KV — 仅在运行时环境中存在。  
- 会话存储在客户端的 `localStorage` 中，以 `Bearer` Token 方式发送 — 不使用 Cookie，避免 CSRF 攻击面。

---

## 支持的节点格式

```
vless://...
vmess://...
trojan://...
ss://...
ssr://...
hysteria2://...
hy2://...
tuic://...
```

批量导入同样支持 base64 编码的订阅内容（自动识别）。

---

## 开发命令（justfile）

```bash
just          # 列出所有可用命令
just format   # 使用 Biome 格式化代码
just check    # 格式化和 lint 检查（只读）
just fix      # 自动修复格式化和 lint 问题
just run      # 本地启动 Node.js 适配器
```

---

## 项目结构

```
vless-sub/
├── src/
│   └── core.js           # 平台无关业务逻辑 + Web UI HTML
├── adapters/
│   ├── cloudflare.js     # Cloudflare Workers 入口
│   ├── vercel.js         # Vercel Edge Runtime 入口
│   └── node.js           # Node.js HTTP 服务器
├── api/
│   └── index.js          # Vercel 函数入口（重新导出适配器）
├── wrangler.toml         # Cloudflare Workers 配置
├── vercel.json           # Vercel 路由配置
├── Dockerfile
├── justfile              # 开发命令
└── package.json
```

---

## 本地开发

```bash
# 直接运行 Node.js 适配器
ADMIN_PASSWORD=test SUB_TOKEN=test node adapters/node.js

# 或使用 just
just run

# Docker
docker build -t vless-sub .
docker run -e ADMIN_PASSWORD=test -p 3000:3000 vless-sub
```

---

## Cloudflare Workers 部署

```bash
wrangler kv namespace create VLESS_KV
# → 将 KV id 粘贴到 wrangler.toml
wrangler secret put ADMIN_PASSWORD
wrangler deploy adapters/cloudflare.js
```
