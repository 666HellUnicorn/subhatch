# API 参考

| 方法   | 路径           | 认证          | 说明                     |
|--------|----------------|---------------|--------------------------|
| GET    | `/`            | —             | Web 管理界面              |
| GET    | `/sub`         | token（可选） | Base64 订阅内容           |
| POST   | `/api/login`   | password      | 返回会话 Token            |
| POST   | `/api/logout`  | session       | 使会话失效                |
| GET    | `/api/nodes`   | session       | 列出环境变量和存储的节点    |
| PUT    | `/api/nodes`   | session       | 保存节点（全量替换）       |
| GET    | `/api/sub-url` | session       | 返回完整订阅地址           |
| PUT    | `/api/sub-token`| session       | 更新订阅 Token             |
| GET    | `/api/ping`    | —             | 健康检查                  |
