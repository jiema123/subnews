# SubNews - 智能新闻订阅平台

SubNews 是一个现代化的、基于 AI 驱动的新鲜事订阅推送平台。它能够自动抓取网页内容，通过 Gemini AI 进行解读与总结，并按照您定义的频率推送到钉钉、企业微信等机器人平台。

## ✨ 核心特性

- **现代感设计**：采用 Glassmorphism 玻璃拟态设计，极致的视觉体验。
- **AI 智能解读**：集成 Gemini 3 Flash 模型，自动提炼新闻要点。
- **动态 URL 支持**：支持 `{{date}}` 占位符，自动匹配每日更新的新闻地址。
- **自定义模版**：完全控制推送内容的格式与摘要深度。
- **多平台推送**：首发支持钉钉，兼容企业微信、飞书、TG 等（扩展中）。
- **全栈 Serverless**：基于 Cloudflare Pages + Workers + KV，高可用且低成本。

## 🛠️ 技术架构

- **前端**：TypeScript + Vite + Vanilla CSS
- **后端**：Node.js (Hono Framework) + Cloudflare Workers
- **存储**：Cloudflare KV (用户数据、订阅任务、推送日志)
- **AI 解析**：Gemini API (via r.jina.ai Markdown logic)

## 🚀 快速开始

### 1. 环境准备

确保您已安装 Node.js 和 npm。

### 2. 本地部署与测试

1.  **后端配置**：
    进入 `server` 目录，创建 `.dev.vars` 文件：
    ```bash
    GEMINI_API_KEY=你的API密钥
    ```
2.  **启动后端**：
    ```bash
    cd server
    npm install
    npx wrangler dev
    ```
3.  **启动前端**：
    ```bash
    cd client
    npm install
    npm run dev
    ```

### 3. 正式部署 (Cloudflare)

1.  **创建 KV 命名空间**：
    在 Cloudflare Dashboard 创建一个名为 `SUBNEWS_KV` 的命名空间，并将其 ID 填入 `server/wrangler.jsonc`。
2.  **部署后端**：
    ```bash
    cd server
    npx wrangler deploy
    ```
3.  **部署前端**：
    将 `client` 文件夹连接到 Cloudflare Pages 进行自动化构建部署。

## 📝 内部逻辑说明

- **URL 转换**：使用 `https://r.jina.ai/` 将目标网页转换为 Markdown。
- **AI 总结**：将 Markdown 内容发送至 Gemini API，结合用户定义的 `Content Template` 生成推送文本。
- **定时任务**：利用 Workers Cron Triggers 每 30 分钟检查一次符合频率的订阅任务（注：目前演示版为定时全量检查，生产环境可结合 `lastRun` 时间戳进行精确校验）。

## 🛡️ 安全性

所有敏感 Token (KV ID, Gemini Key) 均通过 Cloudflare Environment Variables 管理，前端不暴露任何后端逻辑与密钥。

---
Created with ❤️ by Antigravity AI
