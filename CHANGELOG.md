# Changelog

所有重要的更改都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 计划中
- 交易历史记录功能
- 价格预警通知
- 多语言支持（英文、日文）
- 移动端原生 App

## [0.2.0] - 2024-10-30

### 新增
- ✨ 代币兑换功能（Swap）
- ✨ 钱包集成（MetaMask、WalletConnect）
- ✨ 实时 PriceTicker 更新
- ✨ 十字光标跟随功能
- ✨ 技术指标系统（MA、EMA、BOLL、RSI、MACD、KDJ）

### 改进
- 🎨 优化 UI 设计，添加流畅动画效果
- ⚡ 性能优化：K 线图渲染性能提升 40%
- 📱 改进移动端适配
- 🔧 优化 WebSocket 重连策略

### 修复
- 🐛 修复 K 线图实时更新时 PriceTicker 不更新的问题
- 🐛 修复鼠标 Hover 图表时数据不响应的问题
- 🐛 修复订单簿深度图渲染卡顿问题
- 🐛 修复多标签页切换时 WebSocket 连接异常

## [0.1.0] - 2024-10-20

### 新增
- 🎉 项目初始化
- ✨ K 线图表基础功能
- ✨ 实时行情数据推送（WebSocket）
- ✨ 订单簿深度展示
- ✨ 多品种切换（BTC、ETH、WETH、USDT、USDC）
- ✨ 响应式布局

### 技术架构
- Next.js 14 App Router
- TypeScript 严格模式
- Zustand 状态管理
- TradingView Lightweight Charts 5.x
- Tailwind CSS 4.x

---

## 版本说明

- **[Unreleased]** - 未发布的更改
- **[主版本号]** - 不兼容的 API 修改
- **[次版本号]** - 向下兼容的功能性新增
- **[修订号]** - 向下兼容的问题修正

## 更改类型

- `新增` - 新功能
- `改进` - 对现有功能的改进
- `修复` - Bug 修复
- `废弃` - 即将移除的功能
- `移除` - 已移除的功能
- `安全` - 安全相关的修复
