# 测试计划

## Mock Mode 测试

- 启动 APP。
- 确认首页显示 Mock。
- 打开所有页面。
- 点击手动控制、任务、调试页按钮，确认日志有反馈。

## Jetson API curl 测试

```bash
curl http://<jetson_ip>:8000/api/status
curl http://<jetson_ip>:8000/api/debug/status
```

## APP 连接测试

- 设置页填写 Jetson Base URL。
- 关闭 mock mode。
- 点击测试连接。
- 状态面板手动刷新。

## /cmd_vel 测试

```bash
curl -X POST http://<jetson_ip>:8000/api/cmd_vel \
  -H "Content-Type: application/json" \
  -d '{"linear_x":0.03,"angular_z":0.0,"duration_ms":300}'
```

用 `ros2 topic echo /cmd_vel` 验证消息和自动停车。

## 建图测试

- `GET /api/debug/mapping/status`
- `POST /api/debug/mapping/start`
- `POST /api/debug/mapping/save`
- `POST /api/debug/mapping/stop`

确认 `~/ros2_ws/src/my_map.yaml` 和 `my_map.pgm` 存在。

## 导航测试

- `GET /api/debug/navigation/status`
- `POST /api/debug/navigation/start`
- `POST /api/debug/navigation/set_initial_pose`
- `POST /api/debug/navigation/goal`
- `POST /api/debug/navigation/cancel`

## 急停测试

点击手机端急停，或执行：

```bash
curl -X POST http://<jetson_ip>:8000/api/stop
```

确认 `/cmd_vel` 立即变为 0。

## 常见问题排查

- API 不通：检查 URL、端口、bridge 状态。
- `/cmd_vel` 没反应：检查 bringup 和话题名。
- 建图不启动：检查 `scripts/run_on_jetson.sh mapping` 是否可执行。
- 导航目标无反馈：检查 Nav2 action server 和地图。
