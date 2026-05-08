# 测试

暂无自动化测试套件。以下是手动测试计划。

## 测试计划

### 认证

- [ ] 正确密码登录 → 返回会话 Token
- [ ] 错误密码登录 → 返回 401
- [ ] 缺少密码登录 → 返回 400
- [ ] 暴破：同 IP 10 次错误 → 429 封禁 15 分钟
- [ ] 封禁窗口过后成功登录 → 恢复正常
- [ ] 预哈希 `ADMIN_PASSWORD`（64 位 hex）→ 原始密码登录成功

### 会话

- [ ] 认证请求带 `Authorization: Bearer <token>` → 通过
- [ ] 无 Token → 受保护端点返回 401
- [ ] 过期 Token（2 小时后）→ 401
- [ ] 登出 → Token 失效，后续请求返回 401

### 节点

- [ ] GET `/api/nodes` → 返回环境变量节点 + 存储节点
- [ ] PUT `/api/nodes` → 保存有效节点，跳过无效
- [ ] 空节点数组 → 返回 `saved: 0`
- [ ] 无效节点 URI → 被过滤
- [ ] 环境变量节点（`VLESS_NODES`）→ 响应中标记为只读

### 订阅

- [ ] GET `/sub` 不带 `SUB_TOKEN` → 返回 base64 节点
- [ ] GET `/sub?token=xxx` 正确 token → 返回 base64 节点
- [ ] GET `/sub?token=xxx` 错误 token → 401
- [ ] PUT `/api/sub-token` → 生成新 token，旧 token 失效
- [ ] 无节点 → 空响应，带 `Profile-Update-Interval: 24`

### 界面

- [ ] GET `/` → 返回 HTML 页面
- [ ] 登录流程 → 跳转到主面板
- [ ] 输入框添加节点 → 出现在列表中
- [ ] 删除存储节点 → 从列表移除
- [ ] 批量导入 → 节点添加，重复跳过
- [ ] 复制订阅地址 → 复制到剪贴板
- [ ] 二维码 → 正确渲染
- [ ] 登出 → 返回登录页

### 平台适配器

- [ ] Cloudflare Workers：部署并验证所有端点
- [ ] Node.js：`just run` 本地测试所有端点
- [ ] Docker：`docker compose up` 测试所有端点
