# YLHB Robot Mobile

YLHB Robot Mobile 是智慧零售移动机器人的手机端监控、控制和调试 APP。手机端不直接连接 ROS2 DDS，而是通过 Jetson 上的 HTTP/WebSocket bridge 与 ROS2 通信。

## 技术栈

- Expo React Native
- TypeScript
- expo-router
- FastAPI + rclpy Jetson bridge

## 安装与启动

```bash
npm install
npx expo start
```

手机安装 Expo Go 后，扫描终端二维码查看。

## Mock Mode

默认开启 mock mode。此模式不访问 Jetson 网络，可以直接查看 UI、点击按钮、验证日志和调试流程。

## Real Robot Mode

1. Jetson 启动 `ylhb_mobile_bridge`。
2. 手机和 Jetson 在同一局域网。
3. 打开设置页，填写 `Jetson Base URL`，例如 `http://192.168.1.100:8000`。
4. 关闭 mock mode，按需开启 WebSocket。
5. 点击测试连接。

## 页面说明

- 首页/连接页：显示项目名、连接状态、当前模式和入口按钮。
- 状态面板：显示 bridge、CAN/ZLAC、/odom、/scan、任务、建图、导航状态。
- 手动控制：短时低速控制、停止和急停。
- 零售任务：发送起点、货架、结算、拿商品等任务。
- 调试中心：系统检查、底盘、建图、导航和调试日志。
- 日志页：统一查看 info/warn/error/api/debug 日志。
- 设置页：配置 Jetson URL、mock mode、WebSocket。

## 调试页安全提示

- 第一次底盘测试请架空轮子。
- 建图/导航测试必须确保机器人周围安全。
- 所有速度命令都是短时命令，后端会自动停车。
- 急停按钮会调用 `/api/stop`。

## 常见错误

- 手机连不上 Jetson：确认二者在同一局域网，Jetson 防火墙允许 8000 端口。
- `/api/status` 不通：确认 bridge 已启动，URL 没有写错。
- `/cmd_vel` 没反应：确认 ROS2 bringup 已启动，话题名为 `/cmd_vel`。
- WebSocket 断开：关闭再打开设置页 WebSocket 开关，或先用 HTTP 手动刷新。
- CORS 问题：bridge 已默认允许局域网调试跨域，若仍失败请检查代理或浏览器环境。
- Jetson 和手机不在同一局域网：切换到同一 Wi-Fi 或使用可达的局域网 IP。
