<p align="right">
  <a href="README.md">English</a> |
  <a href="README_zh-CN.md">简体中文</a>
</p>


# Subhatch

轻量级、自托管的代理节点订阅管理器。

支持 **VLESS · VMess · Trojan · Shadowsocks · Hysteria2 · TUIC**。

---

## 特性

- **多平台** — Cloudflare Workers、Node.js / Docker
- **Web 管理界面** — 可视化添加、删除、批量导入节点
- **安全管理** — 会话 Token、暴力破解限流（15 分钟内最多 10 次）
- **Token 鉴权订阅** — 订阅地址可设置密钥访问
- **环境变量注入节点** — 无需通过 UI 即可添加固定节点
- **批量导入** — 支持粘贴原始 URI 或 base64 编码的订阅内容
- **二维码** — 在 UI 中直接扫码获取订阅地址
- **零依赖** — 纯 ES Modules，无需 npm install
- **ADMIN_PASSWORD** 支持预计算 SHA-256 哈希（64 位十六进制）来避免明文存储 — 也可以直接设置原始密码。
- **会话** 是随机 32 字节十六进制 Token，存储在 KV 中，2 小时后过期。
- **暴力破解防护**：同一 IP 在 15 分钟内登录失败超过 10 次后，该时间窗口内将被阻止。
- **SUB_TOKEN** 让你的订阅地址无法被猜测。不配置时 `/sub` 为公开访问。
- **环境变量节点**（`VLESS_NODES`）不会被写入 KV — 仅在运行时环境中存在。
- 会话存储在客户端的 `localStorage` 中，以 `Bearer` Token 方式发送 — 不使用 Cookie，避免 CSRF 攻击面。

---

## 快速开始

### 方案 A — Cloudflare Workers（推荐，免费）

```bash
# 1. 克隆项目
git clone https://github.com/Dichgrem/subhatch.git
cd subhatch

# 2. 安装 wrangler
npm install -g wrangler
wrangler login

# 3. 创建 KV 命名空间
wrangler kv namespace create VLESS_KV
# → 将 wrangler.toml.example 复制为 wrangler.toml 并填入 id

# 4. 部署（创建 Worker；设置 secret 前会返回 500）
wrangler deploy api/cloudflare.js

# 5. 设置密钥
wrangler secret put ADMIN_PASSWORD
wrangler secret put SUB_TOKEN        # 可选，但强烈建议

# 6. （可选）通过环境变量添加固定节点
# 在 wrangler.toml 的 [vars] 中：
# VLESS_NODES = "vless://...#MyNode1|vmess://...#MyNode2"

# 7. 重新部署使密钥生效
wrangler deploy api/cloudflare.js
```

访问 `https://your-worker.workers.dev` → 登录 → 管理节点。

---

### 方案 B — Node.js / Docker（自建 VPS）

**直接运行 Node.js：**
```bash
ADMIN_PASSWORD=changeme SUB_TOKEN=mytoken node api/node.js
# 监听 :3000 端口
```

**Docker：**
```bash
docker build -t subhatch .

docker run -d \
  -p 3000:3000 \
  -v subhatch-data:/data \
  -e ADMIN_PASSWORD=your_strong_password \
  -e SUB_TOKEN=your_random_token \
  --name subhatch \
  subhatch
```

**Docker Compose：**
```yaml
services:
  subhatch:
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

## 项目结构

```
subhatch/
├── src/
│   ├── core.js           # 平台无关业务逻辑
│   └── ui.html.js        # Web UI HTML 模板
├── api/
│   ├── cloudflare.js     # Cloudflare Workers 入口
│   └── node.js           # Node.js HTTP 服务器
├── wrangler.toml.example # Cloudflare Workers 配置模板
├── Dockerfile
├── docker-compose.yml
├── justfile              # 开发命令
└── package.json
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
