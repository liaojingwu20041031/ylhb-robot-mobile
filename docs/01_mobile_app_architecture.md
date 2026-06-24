# 手机端架构

## 技术栈

手机端使用 Expo React Native + TypeScript + expo-router。`app/` 目录负责页面路由，`src/` 目录负责业务代码和通用组件。

## 页面结构

- `app/index.tsx`：首页/连接页
- `app/dashboard.tsx`：状态面板
- `app/control.tsx`：手动控制
- `app/debug.tsx`：调试中心
- `app/logs.tsx`：日志页
- `app/settings.tsx`：设置页

`app/tasks.tsx`、`app/route.tsx` 及相关 route/patrol client 代码当前保留在仓库中，但不从首页和 Stack 暴露；本阶段以 `mobile_debug_api.md` 的底盘和建图调试接口为准。

## 目录职责

- `src/api`：网络请求、WebSocket、API 类型、mock client。
- `src/store`：全局状态，包括连接状态、配置、机器人状态和日志。
- `src/components`：通用 UI 组件。
- `src/components/debug`：调试页专用组件。

## Mock Client 与 Real Client 切换

设置页保存 `mock mode` 开关。业务页面只调用统一 store action；store 根据当前模式选择 `mockClient` 或真实 HTTP client。mock mode 下不访问网络。
