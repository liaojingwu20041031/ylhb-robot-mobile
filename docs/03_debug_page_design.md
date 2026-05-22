# 调试页设计

## 用途

调试页用于现场工程测试，覆盖系统检查、底盘测试、建图测试、导航测试和调试日志。

## 系统检查模块

显示 `/cmd_vel`、`/odom`、`/scan`、`/map` 是否可用，显示 `zlac8015d_canopen_controller`、`slam_toolbox`、Nav2 相关节点是否存在，并显示 `/odom` 与 `/scan` 更新时间。

对应 API：`GET /api/debug/status`

## 底盘测试模块

按钮：

- 低速前进
- 低速后退
- 左转
- 右转
- 停止
- 急停

对应 API：

- `POST /api/debug/chassis/test`
- `POST /api/debug/chassis/stop`
- `POST /api/stop`

安全边界：第一次测试请架空轮子；速度受后端限制；动作持续时间短，超时自动停车。

## 建图测试模块

按钮：

- 检查建图依赖
- 启动建图
- 保存地图
- 停止建图

对应 API：

- `GET /api/debug/mapping/status`
- `POST /api/debug/mapping/start`
- `POST /api/debug/mapping/save`
- `POST /api/debug/mapping/stop`

安全边界：只允许启动 `./scripts/run_on_jetson.sh mapping`；只停止 bridge 自己启动的 mapping 进程。

## 导航测试模块

按钮和输入：

- 检查导航依赖
- 启动导航
- 设置初始位姿
- 输入 x/y/yaw
- 发送目标点
- 起点区、货架区、结算区预设目标
- 取消导航

对应 API：

- `GET /api/debug/navigation/status`
- `POST /api/debug/navigation/start`
- `POST /api/debug/navigation/set_initial_pose`
- `POST /api/debug/navigation/goal`
- `POST /api/debug/navigation/cancel`

安全边界：导航前确保地图与定位可用，机器人周围无人和障碍风险可控。

## 调试日志模块

显示每次请求、返回结果和错误信息，支持清空日志。
