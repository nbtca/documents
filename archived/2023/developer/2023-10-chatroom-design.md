---
summary: 内网聊天系统的设计方案：后端 Go + SQLite（一个聊天室一个 .db），前端分命令行（Rust）、网页（Vue3）与桌面三条路线。
archive:
  date: "2023-10"
  source: "协会自有记录，随本仓库保存"
  transcriber: "m1ngsama"
  transcribed: "2023.10"
---

# 聊天系统设计方案

〔原件首行为“设计方案”，其下并列“Pit”等小节。此处以“聊天系统设计方案”为总标题，各节标题的文字照原件，层级下调一级。〕

## Pit

### （内网）聊天系统

### 后端（服务端）

- 语言: Go

#### 数据库设计

- 使用SQLite存储

##### 存储逻辑

- 一个聊天室一个.db

### 前端（客户端）

#### 命令行CLI版本

- 语言：Rust

#### Web网页版本

- 技术栈：Vue3

#### 桌面版本

##### 方案一

- Electron框架套网页版

##### 方案二

- C# + WinUI3 轻量桌面版？

### 功能规划

1. 实现基本聊天室
   - 输入username直接进入

2. 实现历史记录保存
3. 实现多channel

### 列表

- pit-core
  - 后端(语言：Go)
  - <https://github.com/nbtca/pit-core>
- pit-orbit
  - vue3 网页客户端
  - (涉及HTML、css、js)
- pit-tunnel
  - 控制台客户端
  - (语言：Rust)
- pit-
  - Elecron 跨平台客户端
- pit-lolipop
  - 安卓客户端
  - 待定
- pit-macrohard
  - Windows客户端
  - 待定
- pit-road
  - 文档专用仓库
  - vite-press
- pit-map
  - 设计稿专用仓库
