# SubNews

SubNews 是一个基于 AI 的新闻聚合与推送 Agent。它允许用户订阅网页内容，利用 LLM (Gemini) 进行智能提取和总结，并通过 Webhook 定时推送到常用的即时通讯工具（钉钉、企业微信、飞书、Telegram）。

🌐 **在线体验**: [https://subnews.21588.org/](https://subnews.21588.org/)

<div align="center">
  <img src="https://img.justnow.uk/2026/01/1257bef2d7f6860421207cd93acb60d2.png" width="45%" alt="Login Screen" />
  <img src="https://img.justnow.uk/2026/01/18e3714e43788bf7d3ec032f90205744.png" width="45%" alt="Dashboard" />
  <br/>
  <img src="https://img.justnow.uk/2026/01/45d5c0b425c59243bb152cd89514d047.png" width="45%" alt="Task Editing" />
  <img src="https://img.justnow.uk/2026/01/45cce08b1a4559d8cdac1b70f8ce84ba.png" width="45%" alt="Push Notification" />
</div>

## ✨主要特性

*   **智能订阅**：支持任意 URL 内容抓取（整合 Jina Reader API）。
*   **AI 总结**：集成 Google Gemini API，自定义 Prompt 模板提取关键信息。
*   **多平台支持**：内置钉钉、企业微信、飞书、Telegram 的 Webhook 推送适配。
*   **灵活调度**：
    *   支持“每天”定时推送（如果错过会补推）。
    *   支持“单次”预约推送。
    *   基于 Cloudflare Workers Cron 实现分钟级检查。
*   **可视化管理**：
    *   现代化的仪表盘界面（Glassmorphism 风格）。
    *   实时预览 & 调试功能，所见即所得。
    *   推送日志记录与查看。
*   **Serverless 架构**：完全运行在 Cloudflare Workers 和 KV 上，低成本、高并发。

## 🛠 技术栈

*   **Frontend**: Vite, TypeScript, Vanilla JS/CSS (无重型框架)
*   **Backend**: Cloudflare Workers, Hono, Cron Parser
*   **Database**: Cloudflare Workers KV
*   **AI Service**: Google Gemini Pro
*   **Content Parsing**: Jina Reader API

## 🚀 快速开始

### 1. 前置准备

确保你已经安装了 [Node.js](https://nodejs.org/) (v18+) 和 [Make](https://www.gnu.org/software/make/) (可选)，并拥有以下账号/API Key：

*   **Cloudflare Account** (用于部署 Workers 和 KV)
*   **Google Gemini API Key** (用于 AI 总结)
*   **Jina Reader API Key** (用于网页抓取)

### 2. 安装依赖

在项目根目录下运行：

```bash
# 一键安装前后端所有依赖
npm install 
npm run install-all
```

### 3. 本地开发配置

#### 3.1配置后端环境变量

在 `server/` 目录下创建 `.dev.vars` 文件：

```bash
# server/.dev.vars
GEMINI_API_KEY="your_gemini_key_here"
JINA_API_KEY="your_jina_key_here"
```

#### 3.2 配置 Wrangler

项目使用 Cloudflare KV 存储数据。
在本地开发时，Wrangler 会自动创建本地 KV 存储。

确保 `server/wrangler.jsonc` 配置文件正确。
*注意：在本地调试时，KV 的 `id` 建议对应本地生成的文件夹 ID 或使用 `SUBNEWS_KV_ID` (如果本地已生成对应状态文件夹)。发布上线时需改为真实的 Cloudflare KV ID。*

### 4. 启动本地开发

```bash
# 在项目根目录运行
npm run dev
```

该命令会同时启动：
*   后端 Worker (http://localhost:8787)
*   前端 Vite Server (http://localhost:5173)

### 5. 部署上线

1.  **登录 Cloudflare**
    ```bash
    npx wrangler login
    ```

2.  **创建 KV Namespace** (如果尚未创建)
    ```bash
    cd server
    npx wrangler kv:namespace create SUBNEWS_KV
    # 记录下控制台输出的 id，填入 server/wrangler.jsonc 的 kv_namespaces 配置中
    ```

3.  **上传 Secrets** (API Keys)
    ```bash
    cd server
    npx wrangler secret put GEMINI_API_KEY
    npx wrangler secret put JINA_API_KEY
    ```

4.  **一键部署**
    ```bash
    # 在项目根目录运行
    npm run deploy
    ```
    此命令会自动构建前端静态资源，并将其发布到 Cloudflare Workers Assets。

## 📖 使用指南

### 创建订阅任务

1.  登录 Dashboard。
2.  点击 **"+ 新建任务"**。
3.  填写任务信息：
    *   **目标 URL**：支持 `{{year}}`, `{{month}}`, `{{day}}` 等日期变量动态生成 URL。
    *   **调度类型**：选择“每天”或“单次”。
    *   **推送平台**：选择对应的 IM 平台。
    *   **Webhook URL**：对应平台的机器人 Webhook 地址。
    *   **提示词模板**：告诉 AI 你希望如何总结这篇新闻（例如：“总结前5条科技新闻，输出 Markdown”）。
4.  点击 **"运行调试"** 查看 AI 输出效果。
5.  点击 **"保存任务"**。

### 获取 Webhook 地址

*   **钉钉**：群设置 -> 智能群助手 -> 添加机器人 -> 自定义 (安全设置选关键词或加签)。
*   **企业微信**：群设置 -> 添加群机器人 -> 复制 Webhook 地址。
*   **飞书**：群设置 -> 群机器人 -> 添加机器人 -> 自定义机器人。
*   **Telegram**：联系 @BotFather 创建 Bot 获取 Token，Webhook 需自行拼接或使用特定的转发服务 (本项目主要适配前三者及标准 Webhook)。

## 📁 目录结构

```
subnews/
├── client/                 # 前端项目 (Vite)
│   ├── src/
│   │   ├── main.ts         #主要逻辑
│   │   ├── style.css       # 样式
│   │   └── services/       # API 封装
│   └── index.html
├── server/                 # 后端项目 (Cloudflare Workers)
│   ├── src/
│   │   ├── index.ts        # Worker 入口与 API 路由
│   │   └── types.ts        # 类型定义
│   └── wrangler.jsonc      # Worker 配置文件
└── package.json            # 根目录脚本管理
```

## ⚠️ 注意事项

*   **时区问题**：定时任务默认使用 **Asia/Shanghai (UTC+8)** 时区。
*   **Worker 限制**：Cloudflare Workers 免费版有 CPU 时间和请求数限制，Gemini 请求较慢时建议使用 `ctx.waitUntil` 异步处理（已内置）。

## License

ISC
