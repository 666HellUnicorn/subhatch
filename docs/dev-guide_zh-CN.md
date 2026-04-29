# 开发指南

## 环境要求

- Node.js >= 18
- [just](https://github.com/casey/just) — 任务运行器
- [Biome](https://biomejs.dev/) — 格式化 + 代码检查

## 快速启动

```bash
# 本地运行（Node.js 适配器）
ADMIN_PASSWORD=test SUB_TOKEN=test node api/node.js
# 或通过 just：
just run
```

## 开发命令

| 命令 | 说明 |
|---|---|
| `just format` | 用 Biome 格式化 JS |
| `just check` | 格式化 + 代码检查（不写入） |
| `just fix` | 自动修复格式和 lint |
| `just run` | 本地启动 Node.js 适配器（:3000） |
| `just docker-build` | 构建 Docker 镜像 |
| `just clean` | 删除 `data.json` |

## 代码概述

所有业务逻辑位于 `src/core.js`：
- **常量** — 会话 TTL、暴破限制、KV 键前缀
- **工具函数** — JSON/文本响应构建、SHA-256 哈希、随机 Token、Base64 编码、IP 检测
- **会话管理** — 创建、验证、销毁会话（2 小时 TTL）
- **暴力破解防护** — 每 IP 每 15 分钟最多 10 次失败
- **节点存储** — 从 KV 获取/保存节点列表
- **路由处理** — 登录、登出、节点增删改、订阅生成
- **路由器** — 路径/方法分发 + CORS 预检

平台适配器位于 `api/`：
- `api/cloudflare.js` — Cloudflare Workers（KV 绑定）
- `api/node.js` — Node.js HTTP 服务器（文件存储）

每个适配器规范化平台环境，将 `{ ADMIN_PASSWORD, SUB_TOKEN, VLESS_NODES, store }` 传递给 `handleRequest()`。

## 添加新平台

1. 创建 `api/<platform>.js`
2. 实现 `store` 适配器：`get(key)`、`set(key, value, ttlSeconds?)`、`del(key)`
3. 从平台原生 API 规范化环境变量
4. 调用 `src/core.js` 的 `handleRequest(request, env)`
5. 如需添加平台配置文件（如 `fly.toml`）
