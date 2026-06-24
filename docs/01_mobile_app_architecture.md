# 手机端架构

## 链路

手机 APP -> HTTP/WebSocket -> Jetson `ylhb_mobile_bridge` -> ROS2。

APP 只面向真实 bridge，不包含演示数据分支。WebSocket `/ws/status` 只作为状态增强；失败时降级为 HTTP fallback。

## 页面结构

- `app/index.tsx`：连接首页，配置 Jetson Base URL 并连接机器人。
- `app/status.tsx`：状态检查页，轮询真实状态接口。
- `app/control.tsx`：底盘低速控制页。
- `app/mapping.tsx`：建图调试页，内嵌保守底盘控制。
- `app/debug.tsx`：简单调试导航页。
- `app/logs.tsx`：日志页。
- `app/settings.tsx`：连接设置页。

## 目录职责

- `src/api/robotApi.ts`：唯一真实 API facade，包含 HTTP 和 `/ws/status`。
- `src/api/http.ts`：通用请求封装，同时检查 HTTP 状态和业务信封 `ok`。
- `src/store/robotStore.ts`：轻量 `useSyncExternalStore` 全局状态。
- `src/components/ControlPad.tsx`：可复用底盘控制，支持 `standalone` 和 `mapping` 模式。
- `src/components`：通用 UI 组件。

## 刷新策略

- 首页只在用户点击连接或刷新时请求状态。
- 状态页进入后按 `refreshIntervalMs` 轮询状态 bundle。
- 建图页进入后每 1 秒刷新 mapping status 和 map snapshot。
- 页面卸载时清理定时器，避免重复刷日志。

## 状态来源

- `WebSocket`：`/ws/status` 成功推送状态。
- `HTTP fallback`：HTTP 轮询提供状态，或 WebSocket 失败后的降级状态。
- `未知`：尚未成功连接。
