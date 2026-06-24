# 真实调试 APP 重构记录

## 删除内容

- 删除演示数据分支和相关设置。
- 删除路线与巡检页面、客户端、组件和投影工具。
- 删除文本任务、巡检任务、Nav goal 等非本阶段入口。

## 页面结构

- 首页：连接真实 Jetson bridge。
- 状态页：检查 Bridge、`/cmd_vel`、`/odom`、`/scan`、`/imu/data`、TF、ZLAC、bringup、mapping、slam_toolbox、`/map`、Nav2。
- 控制页：独立底盘低速控制。
- 建图页：bringup、mapping、地图预览、内嵌低速控制、保存地图。
- 设置页：Jetson URL、连接测试、刷新间隔。

## 状态刷新

- 连接时依次检查四个真实状态接口。
- WebSocket 成功时来源显示 `WebSocket`。
- WebSocket 失败时记录 warning，来源降级为 `HTTP fallback`。
- 地图预览只使用 HTTP 轮询。

## 建图联动

建图页内嵌 `ControlPad mode="mapping"`，默认更低速度，让现场人员可以一边低速移动机器人，一边观察地图快照增长。`/imu/data` 缺失只警告，不硬锁点动。
