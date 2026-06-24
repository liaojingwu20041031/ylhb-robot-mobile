# 智能机器人调试

手机端机器人调试 APP。APP 不直连 ROS2 DDS，只通过 Jetson 上的 `ylhb_mobile_bridge` 使用 HTTP/WebSocket 查看状态、控制底盘、辅助建图和保存地图。

## 功能

- 连接 Jetson bridge，检查 HTTP 与 WebSocket 状态。
- 查看 `/cmd_vel`、`/odom`、`/scan`、`/imu/data`、`/map`、TF、ZLAC、Nav2 状态。
- 启动/关闭底层进程（bringup）和建图进程（mapping）。
- 底盘点动控制，支持滑条调节线速度和角速度。
- 建图页实时预览地图，并提供底部固定点动控制。
- 保存地图并查看现场 API/错误日志。

## 技术栈

- Expo React Native
- TypeScript
- expo-router
- Jetson `ylhb_mobile_bridge`（HTTP/WebSocket -> ROS2）

## 运行

```bash
npm install
npx expo start
```

手机安装 Expo Go 后扫描二维码预览。

## 调试流程

1. 在 Jetson 启动 `ylhb_mobile_bridge`。
2. 确认手机和 Jetson 在同一局域网或同一热点网段。
3. 在首页或设置页填写 `Jetson Base URL`，例如 `http://192.168.137.100:8000`。
4. 点击“连接机器人”，确认状态接口可用。
5. 在状态页检查底盘、传感器、TF、进程和建图状态。
6. 在底盘页低速点动；在建图页启动建图、观察地图、移动机器人并保存地图。

## 关键接口

- 急停：`POST /api/stop`
- 零速度停止：`POST /api/debug/chassis/stop`
- 启动底层：`POST /api/debug/system/start/bringup`
- 关闭底层：`POST /api/debug/system/stop/bringup`
- 启动建图：`POST /api/debug/system/start/mapping`
- 停止建图：`POST /api/debug/system/stop/mapping`

## 安全

- 第一次底盘测试请架空轮子。
- 地面低速移动前确认 `/odom` 新鲜。
- 建图辅助移动前确认 `/odom`、`/scan`、TF 新鲜。
- `/imu/data` 缺失只提示风险，不会硬锁点动。

## 常见问题

- 手机连不上 Jetson：确认网络互通，Jetson 防火墙允许 8000 端口。
- `/api/status` 不通：确认 bridge 已启动，Base URL 没写错。
- `/cmd_vel` 不存在：确认 ROS2 bringup 已启动。
- 地图预览等待：启动 mapping 后继续低速移动，等待 `/map` 发布。
- WebSocket 断开：APP 会降级为 HTTP fallback。
