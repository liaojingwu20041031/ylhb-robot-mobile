# 测试计划

## 静态检查

```bash
npm run typecheck
rg "演示数据|演示模式" app src
rg "路线|巡检" app src
```

主代码不应再出现演示数据、路线或巡检入口。

## Jetson API curl 测试

```bash
curl http://<jetson_ip>:8000/api/status
curl http://<jetson_ip>:8000/api/debug/status
curl http://<jetson_ip>:8000/api/debug/system/status
curl http://<jetson_ip>:8000/api/debug/mapping/status
```

## APP 连接测试

- 首页或设置页填写 Jetson Base URL。
- 点击连接机器人。
- 状态来源只显示 `WebSocket`、`HTTP fallback` 或 `未知`。
- WebSocket 失败时 HTTP 刷新仍可用。

## /cmd_vel 测试

```bash
curl -X POST http://<jetson_ip>:8000/api/cmd_vel \
  -H "Content-Type: application/json" \
  -d '{"linear_x":0.03,"angular_z":0.0,"duration_ms":300}'
```

用 `ros2 topic echo /cmd_vel` 验证消息和自动停车。普通停止走 `/api/debug/chassis/stop`，急停走 `/api/stop`。

## 建图测试

- `POST /api/debug/system/start/bringup`
- `POST /api/debug/system/start/mapping`
- `GET /api/debug/mapping/map_snapshot?downsample=1`
- `POST /api/debug/mapping/save`
- `POST /api/debug/system/stop/mapping`

确认保存结果返回 `yaml_path` 和 `pgm_path`。`no_map` 时页面应显示等待 `/map` 数据。

## 常见问题排查

- API 不通：检查 URL、端口、bridge 状态。
- `/cmd_vel` 没反应：检查 bringup 和话题名。
- 建图不启动：检查 bridge 管理的 mapping 进程日志。
- `no_map`：建图刚启动或 `/map` 未发布，继续低速移动并等待地图快照。
