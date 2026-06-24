# 开发指南

## 安装 Node.js

安装 Node.js LTS 版本，建议使用官方安装包或 nvm。安装完成后确认：

```bash
node -v
npm -v
```

## 创建和运行 Expo 项目

本仓库已经按 Expo Router 项目结构创建。首次运行：

```bash
npm install
npx expo start
```

## Expo Go 扫码查看

手机安装 Expo Go，确保手机与开发电脑在同一局域网，扫描终端二维码打开 APP。

## 配置真实 Jetson Bridge

打开首页或设置页，填写真实 Jetson Base URL 后点击连接。APP 会直接请求真实 bridge。

## 配置 Jetson IP

在设置页填写：

```text
http://192.168.137.100:8000
```

替换为 Jetson 实际局域网 IP。

## 调试网络连接

先在电脑或手机浏览器访问：

```text
http://<jetson_ip>:8000/api/status
```

如果无法访问，检查 Jetson bridge 是否启动、防火墙是否开放端口、手机和 Jetson 是否在同一局域网。
