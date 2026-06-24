# YLHB Robot Mobile 项目概览

## 项目名称

YLHB Robot Mobile

## 项目目标

用于手机端监控、控制和调试电力巡检机器人。当前阶段收敛为 `mobile_bridge` 调试端，让工程人员可以在安卓手机上查看机器人状态、启动/停止底盘与建图进程、发送低速点动命令、查看地图快照并保存地图。

## 系统架构

```text
手机 APP -> HTTP/WebSocket -> Jetson mobile_bridge -> ROS2 -> 机器人
```

Jetson bridge 运行 FastAPI 与 rclpy，负责把手机端请求转换为 ROS2 topic、action 或受控进程操作。

## 为什么手机端不直接连接 ROS2 DDS

ROS2 DDS 更适合机器人内部局域进程通信，手机端直接接入会带来网络发现、QoS、安全边界和移动端依赖复杂度问题。通过 HTTP/WebSocket bridge 可以把移动端协议固定为通用 Web 协议，并把危险动作、限速、急停和白名单命令集中放在 Jetson 端控制。

## Mock Mode 与 Real Robot Mode

- Mock Mode：默认开启，不访问机器人网络，所有 API 返回模拟数据，用于 UI 预览、按钮测试和日志验证。
- Real Robot Mode：连接 Jetson bridge，通过 HTTP/WebSocket 获取状态并发送控制命令。

## 第一版功能范围

- 首页/连接页
- 状态面板
- 底盘低速手动控制
- 调试中心
- 日志页
- 设置页
- Jetson HTTP/WebSocket bridge
- 底盘、建图、系统进程、地图快照调试 API

## 后续可扩展方向

- 地图显示
- 摄像头画面
- 语音控制
- 导航与任务编排
- 多机器人管理
