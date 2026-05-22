# Jetson Bridge API 设计

## 概述

Jetson bridge 使用 FastAPI + rclpy，运行在 Jetson 局域网地址上，默认端口 `8000`。手机端通过 HTTP 调用命令接口，通过 WebSocket 接收状态推送。

## HTTP 接口

- `GET /api/status`
- `POST /api/cmd_vel`
- `POST /api/text_command`
- `POST /api/task`
- `POST /api/stop`
- `GET /api/debug/status`
- `POST /api/debug/chassis/test`
- `POST /api/debug/chassis/stop`
- `GET /api/debug/mapping/status`
- `POST /api/debug/mapping/start`
- `POST /api/debug/mapping/save`
- `POST /api/debug/mapping/stop`
- `GET /api/debug/navigation/status`
- `POST /api/debug/navigation/start`
- `POST /api/debug/navigation/set_initial_pose`
- `POST /api/debug/navigation/goal`
- `POST /api/debug/navigation/cancel`

## WebSocket

- `GET /ws/status`
- 每 500ms 推送一次状态 JSON。

## JSON 示例

`POST /api/cmd_vel`

```json
{
  "linear_x": 0.03,
  "angular_z": 0,
  "duration_ms": 300
}
```

通用响应：

```json
{
  "ok": true,
  "message": "command accepted",
  "data": {}
}
```

错误响应：

```json
{
  "ok": false,
  "error": "invalid_request",
  "message": "linear speed exceeds limit"
}
```

## 错误码约定

- `invalid_request`：请求字段不合法。
- `ros_unavailable`：ROS2 节点或 action 不可用。
- `process_error`：受控进程启动或停止失败。
- `not_allowed`：命令不在白名单内。
- `internal_error`：服务内部错误。

## 安全限制

- `/cmd_vel` 限制最大线速度和角速度。
- 所有速度命令必须包含 duration，超时自动发布 0 速度。
- `/api/stop` 立即停车并发布停止任务文本。
- 进程管理只允许白名单命令。
- 服务仅用于局域网，不暴露公网。
