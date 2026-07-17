# Jetson Bridge API

## 概述

Jetson `ylhb_mobile_bridge` 使用 HTTP/WebSocket 暴露真实机器人调试接口。APP 不调用文本任务、路线、巡检或 Nav goal 接口。

## HTTP 接口

- `GET /api/status`
- `GET /api/debug/status`
- `GET /api/debug/system/status`
- `POST /api/debug/system/start/bringup`
- `POST /api/debug/system/stop/bringup`
- `POST /api/debug/system/start/mapping`
- `POST /api/debug/system/stop/mapping`
- `POST /api/cmd_vel`
- `POST /api/debug/chassis/stop`
- `POST /api/stop`
- `GET /api/debug/mapping/status`
- `GET /api/debug/mapping/map_snapshot?downsample=1`
- `POST /api/debug/mapping/save`
- `POST /api/debug/maps/{map_name}/confirm_default`

## WebSocket

- `GET /ws/status`

WebSocket 失败只影响状态来源显示，APP 会继续通过 HTTP fallback 工作。

## JSON 示例

`POST /api/cmd_vel`

```json
{
  "linear_x": 0.03,
  "angular_z": 0,
  "duration_ms": 300
}
```

`POST /api/debug/mapping/save`

```json
{
  "map_name": "site_map"
}
```

通用响应：

```json
{
  "ok": true,
  "message": "ok",
  "data": {}
}
```

`confirm_default` 同时完成本地默认地图切换和平台上传任务创建；本地切换成功后，上传失败不会回滚。当前默认地图再次调用时不会重复归档，只会复用或恢复同一内容的上传任务。返回的 `data.upload` 仅包含上传状态、`map_asset_id` 和简短错误，APP 不读取或上传地图文件，也不保存设备 Token。

错误响应：

```json
{
  "ok": false,
  "error": "no_map",
  "message": "waiting for /map"
}
```

## 安全限制

- `/api/cmd_vel` 必须包含 `duration_ms`，后端超时自动停车。
- 普通停止走 `/api/debug/chassis/stop`。
- 急停走 `/api/stop`。
- 进程管理只允许 bridge 白名单命令。
- 服务仅用于局域网调试，不应暴露公网。
