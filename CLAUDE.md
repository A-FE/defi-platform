# DeFi 交易平台开发指南

本文档为 Claude Code 提供项目特定的开发指导和最佳实践。

## 项目概述

基于 Next.js 14 + TypeScript 的 DeFi 交易平台，使用 TradingView Lightweight Charts 实现 K-line 图表，Zustand 管理状态，WebSocket 实现实时数据推送。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript (strict mode)
- **图表库**: lightweight-charts 5.2.1
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **开发模式**: Mock-driven development

## 开发规范

### 1. Lightweight Charts API 查询

当需要使用 `lightweight-charts` 的 API 时，**必须先调用 skills 获取正确用法**，而不是猜测 API：

```bash
# 使用 Skill 工具查询 API
Skill: lightweight-charts
Args: "how to create a candlestick chart in version 5.x"
```

**重要**: lightweight-charts 从 v4 升级到 v5 后，API 发生了重大变更：

- ❌ 错误: `chart.addCandlestickSeries(options)`
- ❌ 错误: `chart.addSeries('Candlestick', options)`
- ✅ 正确: `chart.addSeries(CandlestickSeries, options)`

v5 版本关键变化：
- 必须显式导入系列类型: `import { CandlestickSeries } from 'lightweight-charts'`
- 使用类型而不是字符串创建系列
- 标记 API 改为 `createSeriesMarkers(series, markers)`
- 水印 API 改为 `createTextWatermark(pane, options)`

### 2. 架构模式

#### WebSocket 连接管理
- 单例模式管理 WebSocket 连接
- 消息队列 + 订阅中心分发消息
- 指数退避重连策略 (1s, 2s, 4s, 8s)

#### 状态管理
- Zustand stores 负责数据缓存和业务逻辑
- Session storage 持久化关键数据
- 5 分钟缓存过期策略

#### 性能优化
- `React.memo` 避免不必要的重渲染
- `requestAnimationFrame` 限制渲染频率到 60 FPS
- Dynamic imports 实现代码分割

### 3. 组件职责划分

- **Hooks**: 负责单一职责 (初始化、数据订阅、事件处理)
- **Components**: 只负责 UI 渲染和用户交互
- **Stores**: 管理状态和业务逻辑
- **Services**: WebSocket 连接和 Mock 数据生成

### 4. 代码风格

- 使用 TypeScript 严格模式
- 组件使用 named export
- 优先使用函数式组件和 Hooks
- 添加清晰的中文注释说明职责

## 常见问题

### 图表库 API 错误
**症状**: `chart.addCandlestickSeries is not a function`

**原因**: 使用了 v4 的 API，但项目使用的是 v5

**解决**: 调用 `lightweight-charts` skill 获取正确的 v5 API 用法

### WebSocket 重连
项目已实现自动重连机制，无需手动处理。重连策略在 `services/websocket/WSReconnector.ts` 中。

## 参考资料

- [技术方案文档](./技术方案文档_DeFi交易平台_v1.0.md)
- [Lightweight Charts v5 Migration](https://tradingview.github.io/lightweight-charts/docs/migrations/from-v4-to-v5)
