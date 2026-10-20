# DeFi 交易平台 (Solana)

> 基于 Next.js 14 + React + TypeScript + Solana 的去中心化交易平台前端

## 📋 项目概览

这是一个从零构建的生产级 DeFi 交易平台前端项目，旨在掌握：

- **DeFi 核心概念**：DEX、AMM、永续合约、流动性池
- **Solana 生态**：钱包集成、交易签名、链上数据读取
- **实时数据处理**：WebSocket 高频数据流、订单簿渲染优化
- **交易 UI 架构**：K线图、深度图、持仓管理等复杂组件
- **性能优化**：Core Web Vitals（LCP < 2.5s, INP < 200ms, CLS < 0.1）

## 🛠️ 技术栈

| 类别 | 技术选型 | 用途 |
|------|---------|------|
| **框架** | Next.js 14 (App Router) | SSR/SSG、路由管理 |
| **语言** | TypeScript | 类型安全、代码提示 |
| **状态管理** | Zustand | 轻量级、简单 |
| **样式** | Tailwind CSS | 快速响应式开发 |
| **K线图** | TradingView Lightweight Charts | 专业金融图表 |
| **实时数据** | 原生 WebSocket API | 灵活控制 |
| **钱包集成** | @solana/wallet-adapter | 多钱包支持 |
| **Swap 路由** | Jupiter API | Solana 最大聚合器 |
| **部署** | Vercel | 全球 CDN |

## 🎯 核心功能

- ✅ **钱包管理**：Phantom、Solflare 连接
- ✅ **现货交易（Swap）**：Jupiter 聚合器集成
- ✅ **实时行情**：K线图、订单簿深度图、Ticker 价格面板
- ✅ **资产管理**：账户余额、持仓列表、浮动盈亏计算

## 📁 项目结构

```
defi-platform/
├── app/                    # Next.js 14 App Router
├── components/             # UI 组件
│   ├── Chart/             # K线图模块
│   ├── OrderBook/         # 订单簿模块
│   ├── Ticker/            # 行情模块
│   ├── AssetPanel/        # 资产模块
│   ├── Swap/              # Swap 模块
│   ├── Wallet/            # 钱包模块
│   └── common/            # 通用组件
├── services/              # 服务层
│   ├── websocket/         # WebSocket 订阅中心
│   ├── http/              # HTTP API
│   ├── solana/            # Solana 服务
│   ├── jupiter/           # Jupiter 服务
│   ├── pyth/              # Pyth 服务
│   └── mock/              # Mock 数据
├── stores/                # Zustand 状态管理
│   ├── kline/             # K线状态
│   ├── depth/             # 订单簿状态
│   ├── ticker/            # Ticker 状态
│   ├── asset/             # 资产状态
│   └── wallet/            # 钱包状态
├── hooks/                 # 全局 Hooks
├── workers/               # Web Workers
├── utils/                 # 工具函数
├── types/                 # TypeScript 类型
├── constants/             # 常量配置
└── config/                # 全局配置
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 环境变量配置

复制 `.env.example` 到 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# Solana RPC URL
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# WebSocket 地址（开发阶段用 Mock 服务）
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# 网络环境（mainnet-beta | devnet）
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
```

### 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🏗️ 架构设计

### WebSocket 订阅中心

核心特性：
- ✅ 单连接管理（全局共用一个 WebSocket）
- ✅ 消息分发（根据 type 分发到不同 Handler）
- ✅ 订阅管理（组件 mount/unmount 时订阅/取消）
- ✅ 断线重连（指数退避：1s, 2s, 4s, 8s）
- ✅ 消息队列 & 背压处理

### Mock 数据服务

开发阶段使用 Mock 数据：
- ✅ **K线数据生成器**（v2.0 会话隔离架构）
  - 每个 symbol+interval 独立状态管理
  - 动态更新频率（1m/5m: 1秒, 1h: 2秒, 4h+: 5秒）
  - 统一时间对齐，确保数据连续性
  - [查看详细重构方案](./docs/kline-mock-system-redesign.md)
- ✅ 订单簿数据生成器（买卖盘各 20 档）
- ✅ Ticker 数据生成器（价格、涨跌幅、24h 统计）

### 数据流设计

```
UI Components
     ↓
State Management (Zustand)
     ↓
Services Layer
     ↓
External Services (WebSocket / HTTP / Solana RPC)
```

## 📊 性能目标

| 指标 | 目标 | 说明 |
|------|------|------|
| **LCP** | < 2.5s | 首屏内容加载时间 |
| **INP** | < 200ms | 交互响应时间 |
| **CLS** | < 0.1 | 布局稳定性 |

### 性能优化策略

1. **代码分割**：动态导入非首屏组件
2. **渲染节流**：requestAnimationFrame 节流订单簿渲染
3. **Web Worker**：卸载主线程（指标计算、盈亏计算）
4. **缓存策略**：K线数据 5 分钟缓存

## 🔧 开发规范

### 文件大小控制

| 类型 | 行数上限 |
|------|---------|
| 组件文件 | 300 行 |
| Hook 文件 | 150 行 |
| Store 文件 | 200 行 |
| Service 文件 | 250 行 |

### 代码审查清单

- [ ] 单个文件不超过 300 行
- [ ] 单个组件不超过 200 行
- [ ] 单个函数不超过 50 行
- [ ] 所有类型明确定义
- [ ] 魔法数字提取为常量

## 📝 开发计划

### Phase 1: 项目基础架构 ✅ (Week 1-2)
- ✅ Next.js 14 项目搭建
- ✅ TypeScript 类型定义
- ✅ Mock 数据服务
- ✅ WebSocket 订阅中心
- 🔄 钱包集成

### Phase 2: 核心交易功能 (Week 3-5)
- [ ] K线图组件
- [ ] 实时价格 Ticker
- [ ] Jupiter Swap 集成
- [ ] 交易历史

### Phase 3: 订单簿与资产管理 (Week 6-9)
- [ ] 订单簿深度图
- [ ] 高频渲染优化
- [ ] 资产管理面板
- [ ] 盈亏计算

### Phase 4: 性能优化与完善 (Week 10-12)
- [ ] CWV 优化
- [ ] 真实数据集成
- [ ] 移动端适配
- [ ] 部署到 Vercel

## 📚 技术文档

- [技术方案文档](../docs/技术方案文档_DeFi交易平台_v1.0.md)
- [代码组织规范](../docs/代码组织与模块拆分规范.md)
- [实现计划](.claude/plans/defi-platform-implementation.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT License

## 👨‍💻 作者

Your Name

---

**注意**：本项目为学习和面试准备项目，不建议用于生产环境的真实交易。
