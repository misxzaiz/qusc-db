# QuSC-DB - 轻量级AI SQL客户端

QuSC-DB 是一个基于 Tauri + Web 技术栈的轻量级 AI 辅助 SQL 客户端，支持 MySQL 和 Redis 数据库，集成 DeepSeek AI 模型辅助 SQL 操作。

## ✨ 特性

- 🚀 **轻量级**: 基于 Tauri，包体积小，启动速度快
- 🗄️ **多数据库支持**: 支持 MySQL 和 Redis，预留扩展其他数据库的能力
-   **AI 助手**: 集成 DeepSeek AI，提供 SQL 生成、优化和错误解释
- 🎨 **现代化界面**: 简洁直观的用户界面
- 🔒 **安全可靠**: 本地存储，数据安全有保障

## 🛠️ 技术栈

- **前端**: HTML5 + CSS3 + 原生 JavaScript (ES2021+)
- **后端**: Rust 1.89.0 + Tauri 2.7.1
- **数据库**: MySQL (mysql_async) + Redis (redis crate)
- **AI 服务**: DeepSeek API
- **构建工具**: Vite

## 📦 安装要求

- Rust 1.89.0+
- Node.js 18+
- npm 或 yarn

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone git@github.com:misxzaiz/qusc-db.git
cd qusc-db
```

### 2. 安装依赖

```bash
# 安装前端依赖
npm install
```

### 3. 开发模式运行

**方式一：分别启动前后端**
```bash
# 启动前端开发服务器
npm run dev

# 在新终端中启动后端 Tauri 应用
cargo tauri dev
```

**方式二：从后端目录启动（推荐）**
```bash
cargo tauri dev
```

### 4. 构建生产版本

```bash
cargo tauri build
```
