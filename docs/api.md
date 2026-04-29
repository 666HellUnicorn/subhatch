# API Reference

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
