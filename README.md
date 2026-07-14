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
- 连接设置：机器人服务地址、刷新频率和连接测试。

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
