# YLHB Robot Mobile

智能机器人调试 APP。手机端不直连 ROS2 DDS，只通过 Jetson 上的 `ylhb_mobile_bridge` 使用 HTTP/WebSocket 调试底盘、状态和建图。

## 技术栈

- Expo React Native
- TypeScript
- expo-router
- Jetson `ylhb_mobile_bridge`（HTTP/WebSocket -> ROS2）

## 启动

```bash
npm install
npx expo start
```

手机安装 Expo Go 后扫描二维码查看。

## 智能机器人调试流程

1. Jetson 启动 `ylhb_mobile_bridge`。
2. 手机和 Jetson 在同一局域网或同一热点网段。
3. 首页或设置页填写 `Jetson Base URL`，默认示例为 `http://192.168.137.100:8000`。
4. 点击“连接机器人”，APP 会检查 `/api/status`、`/api/debug/status`、`/api/debug/system/status`、`/api/debug/mapping/status`。
5. 进入状态页确认 `/cmd_vel`、`/odom`、`/scan`、TF、ZLAC、bringup、mapping、slam_toolbox、`/map` 和 Nav2 状态。
6. 底盘页用于低速点动；建图页用于启动底层、启动建图、观察地图增长、低速移动和保存地图。

## 页面说明

- 首页：Jetson Base URL、连接状态、连接按钮和主流程入口。
- 状态检查：真实 Bridge、ROS2 话题、TF、系统进程、建图和 Nav2 状态。
- 底盘低速控制：短时 `/cmd_vel`、零速度停止 `/api/debug/chassis/stop`、急停 `/api/stop`。
- 建图调试：bringup、mapping、地图快照、内嵌低速控制、保存地图。
- 日志：查看 API、错误和现场操作日志。
- 设置：保存 Jetson URL、测试连接、恢复默认、调整刷新间隔。

## 安全提示

- 第一次底盘测试请架空轮子。
- `/imu/data` 缺失只提示风险，不会硬锁点动。
- 地面低速移动前至少确认 `/odom` 新鲜。
- 建图辅助移动前确认 `/odom`、`/scan`、TF 新鲜。
- 急停按钮调用 `/api/stop`。

## 常见错误

- 手机连不上 Jetson：确认二者网络互通，Jetson 防火墙允许 8000 端口。
- `/api/status` 不通：确认 bridge 已启动，URL 没有写错。
- `/cmd_vel` 不存在：确认 ROS2 bringup 已启动。
- 地图预览显示等待：mapping 启动后继续低速移动，等待 `/map` 发布。
- WebSocket 断开：APP 会降级为 HTTP fallback，可继续使用状态刷新。
