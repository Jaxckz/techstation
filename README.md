<div align="center">

# 🛡️ TechStation — 技术部保障工作站

**一款面向广播电视技术团队的全功能运维日志与团队协作系统**

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-blue?logo=react)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-lightblue?logo=sqlite)](https://www.sqlite.org/)
[![Vite](https://img.shields.io/badge/Vite-v6-purple?logo=vite)](https://vite.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

![TechStation Screenshot](https://placehold.co/1200x600/0f172a/6366f1?text=TechStation+Dashboard)

</div>

---

## 📖 项目简介

**TechStation** 是一套专为广播电视技术保障团队设计的**内网私有化部署**运维管理系统。它解决了传统纸质或分散电子文档记录的痛点，将日志管理、设备台账、安防审计、事项跟踪、知识库等模块整合在同一平台，提升团队协作效率。

系统采用 **React + Vite 前端 + Node.js/Express 后端 + SQLite 数据库** 的全栈架构，支持私有化部署，所有数据存储在本地局域网服务器，安全可控。

---

## ✨ 核心功能

| 模块 | 功能描述 |
|------|----------|
| 📊 **工作概览** | 实时统计卡片、分类柱状图、最新日志动态、公告播报 |
| 📝 **保障日志** | 创建/查看/导出日志，支持附件上传，拖拽附图 |
| 📅 **日志追溯** | 时间线视图，支持按日期、分类、区域多维筛选 |
| ✅ **事项中心** | 团队待办管理，任务分配与进度追踪 |
| 🔒 **安防审计** | 门禁签到、安全事件记录与统计 |
| 🖥️ **设备台账** | 设备注册、状态管理、历史记录 |
| 📚 **技术手册** | 富文本知识库，支持 Markdown，按分类检索 |
| 📈 **效能统计** | 多维图表分析，个人/团队贡献度排行 |
| 🤖 **AI 智脑** | 接入 Gemini API，自动生成周报摘要、智能问答 |
| 🔍 **全局检索** | 快捷键 `Ctrl+K` 命令面板，跨模块全文检索 |
| 📢 **OA 运维** | 内部公告/事件管理 |
| 🔄 **数据共享** | 局域网内文件/内容分享 |
| ⚙️ **系统设置** | 用户管理、权限配置、AI 配置、**自定义标签**、审计日志 |

---

## 🗂️ 项目结构

```
techstatio/
├── server.js              # Express 后端服务器（API + 静态文件服务）
├── index.html             # SPA 入口
├── App.tsx                # Root 组件（含 AppConfigContext）
├── index.tsx              # React 渲染入口
├── types.ts               # 全局 TypeScript 类型定义
├── db.ts                  # 客户端 IndexedDB（离线缓存）
│
├── components/            # 功能组件
│   ├── Dashboard.tsx      # 工作概览
│   ├── LogForm.tsx        # 日志录入
│   ├── Timeline.tsx       # 日志追溯
│   ├── Stats.tsx          # 效能统计
│   ├── TodoCenter.tsx     # 事项中心
│   ├── SecurityCenter.tsx # 安防审计
│   ├── DeviceLedger.tsx   # 设备台账
│   ├── KnowledgeBase.tsx  # 技术手册
│   ├── Search.tsx         # 全局检索
│   ├── SettingsPage.tsx   # 系统设置
│   ├── AIHub.tsx          # AI 智脑
│   ├── Layout.tsx         # 布局框架（含 Toast、命令面板）
│   ├── LoginPage.tsx      # 登录页
│   └── ...
│
├── services/
│   ├── api.ts             # 前端 API 客户端
│   └── geminiService.ts   # Gemini AI 集成
│
├── data/                  # 运行时数据库目录（⚠️ 不进入 Git）
├── uploads/               # 用户上传文件（⚠️ 不进入 Git）
├── backups/               # 自动备份文件（⚠️ 不进入 Git）
├── .env.local             # 环境变量（⚠️ 不进入 Git）
└── vite.config.ts         # Vite 构建配置
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** v18 或以上
- **npm** v9 或以上
- 推荐在 **Windows Server / Ubuntu** 局域网服务器上部署

### 1. 克隆项目

```bash
git clone https://github.com/your-username/techstation.git
cd techstation
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制环境变量模板并填写：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# Google Gemini API Key（用于 AI 智脑功能，不需要 AI 功能可留空）
GEMINI_API_KEY=your_gemini_api_key_here
```

> 💡 Gemini API Key 申请地址：https://aistudio.google.com/app/apikey

### 4. 启动后端服务

```bash
node server.js
# 或
npm run server
```

后端默认运行于 **http://localhost:5634**

首次启动会自动：
- 创建 SQLite 数据库（`data/database.sqlite`）
- 初始化所有数据表
- 创建默认管理员账户：`admin` / `admin888`
- 写入默认系统配置

### 5. 启动前端开发服务器

```bash
npm run dev
```

前端默认运行于 **http://localhost:5633**

### 6. 访问系统

打开浏览器访问 `http://localhost:5633`，使用默认管理员登录：

| 字段 | 值 |
|------|----|
| 用户名 | `admin` |
| 密码 | `admin888` |

> ⚠️ **首次登录后请立即修改默认密码！** 在「系统设置 → 个人安全」中修改。

---

## 🏭 生产部署

### 构建前端

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

### 配置 server.js 服务静态文件

`server.js` 已配置好静态文件服务，构建后：

```bash
node server.js
```

系统将通过 `http://服务器IP:5634` 单端口提供完整服务（前端 + API）。

### 局域网访问

同局域网其他设备通过 `http://服务器内网IP:5634` 即可访问，无需额外配置。

---

## ⚙️ 自定义配置

系统所有可配置标签均通过管理后台操作，**无需改代码**：

以 **ADMIN** 账号登录 → **系统设置 → 自定义标签**

| 配置项 | 说明 |
|--------|------|
| 🏷️ 系统名称 | 修改显示在登录页、侧边栏、浏览器标签的系统名称 |
| 🏢 办公区域 | 添加/删除区域名称（如：高朋办公区、双林办公区）|
| 📋 日志类别 | 自定义日志下拉选项（如：直播保障、应急抢修）|
| 🖥️ 设备类型 | 自定义设备台账的设备类型选项 |

修改后点击「保存全部并生效」，所有页面**实时更新**，无需重启。

---

## 👥 权限系统

系统内置四种角色，权限由管理员在「权限矩阵」中灵活配置：

| 角色 | 说明 |
|------|------|
| `ADMIN` | 超级管理员，拥有所有功能访问权限 |
| `ENGINEER` | 技术工程师，日常运维记录权限 |
| `SECURITY` | 安防专员，主要访问安防审计模块 |
| `OA_SPECIALIST` | OA 专员，主要访问 OA 运维模块 |

---

## 🔐 安全说明

- 所有数据存储在**本地 SQLite 数据库**，不会上传至任何外部服务器
- 用户密码使用哈希存储（SHA-256）
- 所有操作写入**审计日志**，可追溯
- Gemini AI 仅在配置了 API Key 后才会与外部服务通信
- **建议仅在内网环境部署**，不要将本系统暴露在公网

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 前端构建 | Vite 6 |
| UI 组件 | Tailwind CSS v4 + Lucide Icons |
| 图表 | Recharts |
| 后端框架 | Node.js + Express |
| 数据库 | SQLite（via `sqlite3` + `sqlite`）|
| 文件上传 | Multer |
| AI 集成 | Google Gemini API (`@google/genai`) |
| 客户端缓存 | Dexie.js (IndexedDB) |
| 打包导出 | JSZip |

---

## 📦 .env 模板

项目根目录提供 `.env.example` 作为配置模板：

```env
# ============================
# TechStation 环境变量配置
# ============================

# Google Gemini API Key（可选，留空则 AI 功能不可用）
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 📄 开源协议

本项目基于 [MIT License](./LICENSE) 开源，您可以自由使用、修改和分发。

---

## 🙌 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/your-feature`)
3. 提交更改 (`git commit -m 'feat: add your feature'`)
4. 推送到分支 (`git push origin feature/your-feature`)
5. 创建 Pull Request

---

<div align="center">

Made with ❤️ for broadcast engineering teams

</div>
