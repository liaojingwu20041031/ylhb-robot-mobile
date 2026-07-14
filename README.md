# 机器人控制中心

面向移动机器人现场操作的 Expo / React Native 应用，提供连接检查、底盘低速控制、实时建图、地图管理和运行日志。应用只通过 Jetson 上的 `ylhb_mobile_bridge` 使用 HTTP/WebSocket 与机器人通信，不直接连接 ROS2 DDS。

## 导航与页面

底部导航包含五个主要入口：

- 首页：机器人连接、安全操作、快捷入口和关键状态摘要。
- 控制：基础驱动管理、速度调节、按住点动、停止与紧急停止。
- 建图：实时地图、三步建图流程、地图保存和建图点动控制。
- 地图：预览、设为默认、重命名、删除与文件详情。
- 更多：设备状态、运行日志、连接设置和应用说明。

详情页面保留系统返回按钮：

- 设备状态：连接、基础设备、传感器、建图与导航状态。
- 运行日志：按警告、错误、用户操作、接口等类型筛选、复制和清空。
- 连接设置：多个机器人访问地址、自动/手动选择、刷新频率和连接测试。

旧 `/debug` 链接会重定向到“更多”。路由组不会改变 `/control`、`/mapping`、`/maps` 等公开 URL。

## 中文状态显示

界面不会修改 API 原始字段，只在展示层转换为中文。例如：

- `connected` → 已连接，`connecting` → 正在连接。
- `WebSocket` → 实时连接，`HTTP fallback` → 轮询连接。
- `running` → 运行中，`not_running` → 未运行。
- `/cmd_vel` → 运动指令通道，`/scan` → 激光雷达。
- `bringup` → 基础驱动，`slam_toolbox` → 建图引擎。

技术 Topic、Node 和进程名仍会作为小号辅助信息或复制报告内容保留，便于现场排查。

## 安全控制

- 点动按钮仅在机器人连接和运动通道可用时启用。
- 按住方向键会周期发送短时速度命令，松手立即调用急停接口。
- 离开控制页面时仍会发送急停。
- 建图点动还会检查里程计、激光雷达和坐标变换状态。
- 首次底盘测试请架空轮子；地面操作前确保机器人周围无人。
- 前端速度上限、API endpoint、HTTP 请求语义和 WebSocket fallback 均保持原实现。

## 多网络机器人连接

Mobile Bridge 可在 Wi-Fi 和 5G 有线网卡地址上同时提供同一套 HTTP/WebSocket 服务。
手机仍只能访问当前手机网络可达的地址，因此应用保存多个 endpoint，并仅通过
`GET /api/status` 顺序探测可达地址。旧版单一 `baseUrl` 会转换为手工地址且不会被清空；
`baseUrl` 始终指向当前活动 endpoint，现有 API 调用保持兼容。

机器人返回的 `appEndpoints` 先显示为“机器人发现的地址”，只有用户点击“导入地址”才
合并，不覆盖手工输入或首选地址。自动切换仅发生在首次连接、活动地址的状态探测网络
失败，或 WebSocket 断开且同地址状态探测也失败时。Status/Map WebSocket 各自使用
generation，旧连接的延迟回调不会污染新连接状态。

所有状态修改请求只使用当前活动地址，失败或超时后不会换地址透明重发，包括速度控制、
驱动启停、建图启停、地图保存/重命名/删除/设默认、初始位姿和导航操作。原因是客户端
无法确认第一次请求是否已在机器人执行。急停 `/api/stop` 是安全且幂等的例外，会通过
`Promise.allSettled` 向全部启用地址并行发送；任一地址成功即认为急停已送达。地址切换
期间方向控制禁用，急停按钮保持可用。

机器人云平台连接与 APP 多入口不同：Jetson 始终只有一个 Cloud Client，由 Linux 默认
路由 metric 选择 5G 主出口或 Wi-Fi 备用出口，避免重复 heartbeat、ACK、事件和命令。
网卡/默认路由消失可以触发后续请求改走备用网络；有线 link 仍 up 但 5G CPE 的 WAN
中断不在本轮自动切换范围。Wi-Fi 与有线使用同一子网时可能产生路由歧义，应先调整
网络网段，不能由移动端自动修复。

## 开发

```bash
npm ci
npm run typecheck
npx expo-doctor
npx expo start
```

优先使用 Expo Go 扫码调试。当前依赖不要求自定义原生模块；如后续加入 Expo Go 不支持的原生能力，再使用 development build。

仓库已提交原生 Android 工程，`app.json` 变更后需要同步检查原生配置；Expo Doctor 中对应的非 CNG 提示已按该工作流关闭。Android Manifest 继续保留局域网 HTTP 所需的 cleartext 配置。

## 构建验证

```bash
npx expo export --platform android
npx expo export --platform web
```

Jetson 只修改源码并执行已有依赖条件下的 TypeScript 静态检查，不执行 Expo export、
Gradle、EAS Build 或 APK 构建。移动端分支推送后，在 PC 上执行完整验证：

```bash
git fetch origin
git switch feat/dual-network-access
git pull --ff-only

npm ci
npm run typecheck
npx expo-doctor
npx expo export --platform android
npx expo export --platform web
```

设置页继续复用项目原有卡片、按钮、配色和圆角体系；PC 验证时还应在目标手机尺寸检查
地址列表换行、按钮触控区域和深浅色显示，避免多地址功能破坏原有视觉风格。

## Android APK

本地生成 Android APK 需要安装 JDK 和 Android SDK：

```bash
npx expo prebuild --platform android
cd android
gradlew.bat assembleRelease
```

APK 通常位于 `android/app/build/outputs/apk/release/`。也可以使用 EAS Build：

```bash
npx eas build --platform android --profile preview
```

不要把真实机器人 IP、Token、现场日志或其他敏感信息提交到仓库。
