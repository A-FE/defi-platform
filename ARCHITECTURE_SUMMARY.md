# DeFi 交易平台 - 架构与文件组织说明

> **更新时间**: 2026-10-22  
> **项目状态**: 开发中  
> **架构版本**: V2 (后端驱动指标)

---

## 📋 目录

1. [文档结构](#文档结构)
2. [项目架构概览](#项目架构概览)
3. [核心模块说明](#核心模块说明)
4. [数据流设计](#数据流设计)
5. [技术亮点](#技术亮点)

---

## 📁 文档结构

```
项目根目录/
│
├── README.md                          # 项目简介和快速开始
├── PROJECT_STRUCTURE.md               # 详细架构说明（本文档）
├── ARCHITECTURE_SUMMARY.md            # 架构总结（简明版）
│
├── docs/                              # 技术文档目录
│   ├── 技术方案文档_DeFi交易平台_v1.0.md
│   ├── 代码组织与模块拆分规范.md
│   ├── 数据更新最佳实践.md
│   ├── TESTING_GUIDE.md
│   └── archive/                       # 归档目录（开发过程文档）
│       ├── README.md
│       ├── INDICATOR_*.md             # 指标开发过程文档 (9个)
│       ├── REFACTORING_REPORT*.md     # 重构报告
│       ├── CHANGES_SUMMARY.md         # 变更摘要
│       └── PROGRESS.md                # 开发进度
│
└── defi-platform/                     # 主应用目录
    ├── README.md                      # 应用说明
    ├── CLAUDE.md                      # AI 助手配置
    ├── AGENTS.md                      # Next.js 代理配置
    └── (源代码...)
```

### 文档分类说明

| 文档类型 | 位置 | 用途 |
|---------|------|------|
| **项目概览** | 根目录 README.md | 快速了解项目 |
| **架构设计** | PROJECT_STRUCTURE.md | 完整架构说明 |
| **技术方案** | docs/ | 详细技术设计 |
| **开发规范** | docs/ | 代码组织、数据流规范 |
| **测试指南** | docs/TESTING_GUIDE.md | 测试验证流程 |
| **归档文档** | docs/archive/ | 历史过程记录 |
| **应用文档** | defi-platform/ | 应用配置和说明 |

---

## 🏗️ 项目架构概览

### 整体分层架构

```
┌─────────────────────────────────────────────────┐
│              UI Layer (React 组件)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ K线图    │ │ 订单簿   │ │ 资产面板 │         │
│  └──────────┘ └──────────┘ └──────────┘         │
└───────────────────┬─────────────────────────────┘
                    │ Hooks 连接
┌───────────────────▼─────────────────────────────┐
│         State Management (Zustand)              │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐          │
│  │ Kline   │ │ Depth   │ │ Indicator│          │
│  │ Store   │ │ Store   │ │ Store    │          │
│  └─────────┘ └─────────┘ └──────────┘          │
└───────────────────┬─────────────────────────────┘
                    │ Service 调用
┌───────────────────▼─────────────────────────────┐
│              Services Layer                     │
│  ┌──────────────┐ ┌──────────────┐             │
│  │ WebSocket    │ │ Indicators   │             │
│  │ 订阅中心      │ │ Manager V2   │             │
│  └──────────────┘ └──────────────┘             │
│  ┌──────────────┐ ┌──────────────┐             │
│  │ Mock         │ │ HTTP API     │             │
│  │ Services     │ │ Services     │             │
│  └──────────────┘ └──────────────┘             │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│           External Services                     │
│  • WebSocket Server                             │
│  • Backend API                                  │
│  • Solana RPC                                   │
└─────────────────────────────────────────────────┘
```

---

## 📂 核心模块说明

### 1. **app/** - Next.js 页面路由

```
app/
├── layout.tsx              # 全局布局
├── page.tsx                # 首页
└── market/                 # 交易市场
    ├── page.tsx            # 市场主页（K线+订单簿+Ticker）
    ├── swap/               # Swap 兑换
    ├── portfolio/          # 持仓管理
    └── history/            # 交易历史
```

**职责**：
- 页面路由配置
- 页面级组件组合
- SEO 元数据

---

### 2. **components/** - UI 组件（按业务域划分）

```
components/
├── Chart/                  # 📈 K线图模块
│   ├── KlineChart.tsx          # 主图表组件
│   ├── ChartControls.tsx       # 控制栏（周期/指标）
│   ├── IndicatorConfigModal.tsx # 指标配置弹窗
│   ├── hooks/
│   │   ├── useChartInit.ts     # 图表初始化
│   │   ├── useKlineData.ts     # K线数据管理
│   │   ├── useIndicators.ts    # 指标管理
│   │   └── useSubChart.ts      # 副图管理
│   └── config/
│       └── chartOptions.ts     # 图表配置
│
├── OrderBook/              # 📊 订单簿
├── Ticker/                 # 💹 价格面板
├── Swap/                   # 🔄 Swap 兑换
├── Asset/                  # 💰 资产管理
├── Transaction/            # 📜 交易历史
├── Wallet/                 # 👛 钱包连接
├── Notification/           # 🔔 通知系统
└── Layout/                 # 📐 布局组件
```

**设计原则**：
- **业务域隔离**：每个模块独立，互不依赖
- **内聚性**：相关的 hooks、config 放在模块内
- **可复用性**：通用组件放在 `common/`

---

### 3. **services/** - 业务逻辑层（核心架构）

```
services/
├── websocket/              # 🔌 WebSocket 订阅中心
│   ├── WSSubscribeCenter.ts    # 核心：订阅管理
│   ├── WSReconnector.ts        # 断线重连（指数退避）
│   └── WSMessageQueue.ts       # 消息队列（背压处理）
│
├── indicators/             # 📊 技术指标服务
│   ├── IndicatorManager.ts     # V2 架构：后端驱动
│   └── calculators/            # 前端 Mock 计算器
│       ├── MA.ts               # 移动平均线
│       ├── EMA.ts              # 指数移动平均线
│       ├── BOLL.ts             # 布林带
│       ├── RSI.ts              # 相对强弱指标
│       ├── MACD.ts             # MACD
│       ├── KDJ.ts              # 随机指标
│       └── VOL.ts              # 成交量
│
├── mock/                   # 🎭 Mock 数据服务（开发环境）
│   ├── kline/              # K线 Mock（会话隔离架构）
│   │   ├── KlineSessionManager.ts  # 会话管理器
│   │   ├── KlineSession.ts         # 独立会话
│   │   ├── PriceGenerator.ts       # 价格生成器
│   │   └── TimeAlignmentUtil.ts    # 时间对齐
│   ├── depthMock.ts        # 订单簿 Mock
│   ├── tickerMock.ts       # Ticker Mock
│   └── indicatorMock.ts    # 指标 Mock
│
└── api/                    # 🌐 HTTP API
    └── indicatorApi.ts     # 指标 API（等待后端）
```

#### 3.1 WebSocket 订阅中心架构

**核心特性**：
- ✅ **单连接全局共享**：所有组件共用一个 WebSocket 连接
- ✅ **消息分发机制**：根据 `type` 字段路由到不同 Handler
- ✅ **断线重连**：指数退避（1s → 2s → 4s → 8s）
- ✅ **消息队列**：高频数据流背压处理
- ✅ **订阅管理**：组件 mount/unmount 自动订阅/取消

**数据流**：
```
WebSocket Server
    ↓ (单连接)
WSSubscribeCenter
    ↓ (消息分发)
├─→ KlineHandler    → KlineStore    → 图表更新
├─→ DepthHandler    → DepthStore    → 订单簿更新
└─→ TickerHandler   → TickerStore   → Ticker 更新
```

#### 3.2 指标管理器 V2 架构（后端驱动）

**设计理念**：
- **前端不计算指标**，只负责渲染
- **盘中不刷新指标**，避免频繁重绘
- **收盘事件触发**更新，保证数据一致性

**对比**：

| 维度 | V1 前端计算 | V2 后端驱动 |
|------|------------|------------|
| 计算位置 | 前端 JS | 后端服务器 |
| 盘中行为 | 每次 K线更新都重算 | 不刷新 |
| 性能 | INP > 100ms | INP < 50ms |
| 口径 | 与后端可能不一致 | 与后端一致 |

**API 契约**：
```typescript
// 请求
GET /api/v1/klines/indicator
{
  symbol: 'BTCUSDT',
  interval: '1h',
  limit: 100,
  indicators: ['MA', 'MACD']
}

// 响应
{
  data: [
    {
      time: 1698000000,
      open: 50000,
      high: 51000,
      low: 49500,
      close: 50500,
      volume: 1000,
      indicators: {
        MA: { ma5: 50200, ma10: 50100 },
        MACD: { dif: 100, dea: 80, macd: 40 }
      }
    }
  ]
}
```

#### 3.3 K线 Mock 会话隔离架构

**问题背景**：
- 旧版单例设计导致状态污染
- 切换周期时出现 `currentBarTime < lastBarTime` 错误

**解决方案**：
- 每个 `symbol+interval` 独立 `KlineSession`
- 统一 `TimeAlignmentUtil` 管理时间对齐
- 切换周期时销毁旧会话，创建新会话

**架构图**：
```
KlineSessionManager (单例)
    │
    ├── Session: BTCUSDT_1h
    │   └── state: { lastBar, trend, basePrice }
    │
    ├── Session: BTCUSDT_5m
    │   └── state: { lastBar, trend, basePrice }
    │
    └── Session: ETHUSDT_1h
        └── state: { lastBar, trend, basePrice }
```

---

### 4. **stores/** - 状态管理（Zustand）

```
stores/
├── kline/useKlineStore.ts          # K线状态
├── depth/useDepthStore.ts          # 订单簿状态
├── ticker/useTickerStore.ts        # Ticker 状态
├── indicators/useIndicatorStore.ts # 指标配置（持久化）
├── wallet/useWalletStore.ts        # 钱包状态
├── asset/useAssetStore.ts          # 资产状态
├── transaction/useTransactionStore.ts # 交易历史
└── notification/useNotificationStore.ts # 通知
```

**设计原则**：
- **单一职责**：每个 Store 只管理一个业务域
- **状态最小化**：只存必要数据，派生状态用 selector
- **持久化**：配置类状态使用 `localStorage`

**示例**：
```typescript
// useIndicatorStore.ts
interface IndicatorState {
  configs: Record<IndicatorType, IndicatorConfig>;
  toggleIndicator: (type: IndicatorType) => void;
  updateParams: (type: IndicatorType, params: any) => void;
}

// 持久化到 localStorage
persist(store, { name: 'indicator-settings' })
```

---

### 5. **types/** - TypeScript 类型系统

```
types/
├── market.ts       # 市场数据类型（KlineBar, DepthLevel, ...）
├── indicator.ts    # 指标类型（IndicatorConfig, IndicatorKlineItem, ...）
├── solana.ts       # Solana 相关类型
├── api.ts          # API 响应类型
├── store.ts        # Store 状态类型
└── index.ts        # 统一导出
```

**关键类型**：
```typescript
// K线数据（基础）
interface KlineBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 带指标的K线（V2架构）
interface IndicatorKlineItem extends KlineBar {
  indicators?: {
    [key: string]: Record<string, number>;
  };
}
```

---

## 🔄 数据流设计

### 完整数据流（K线图示例）

```
1. 用户打开 /market 页面
   ↓
2. KlineChart 组件 mount
   ↓
3. useKlineData Hook 初始化
   ↓
4. 调用 useKlineStore.fetchHistory()
   ↓
5. Store 判断环境：
   ├─ 开发模式 → KlineSessionManager.generateHistory()
   └─ 生产模式 → indicatorApi.fetchKlineWithIndicators()
   ↓
6. 数据返回，更新 Store 状态
   ↓
7. useKlineData 订阅实时更新
   ↓
8. WebSocket 推送新 K线数据
   ↓
9. WSSubscribeCenter 分发到 KlineHandler
   ↓
10. KlineHandler 调用 Store.updateBar()
    ↓
11. Store 状态变化，触发组件重渲染
    ↓
12. 检测到收盘事件（isClosed=true）
    ↓
13. 触发 onBarClosed 回调
    ↓
14. useIndicators 重新加载指标
    ↓
15. IndicatorManager 渲染新指标到图表
```

### 关键节点说明

#### 收盘事件触发机制
```typescript
// useKlineData.ts
const handleUpdate = (bar: KlineBar) => {
  seriesRef.current?.update(bar);
  
  // 检测收盘
  if (bar.isClosed && onBarClosed) {
    console.log('[useKlineData] Bar closed, triggering callback');
    onBarClosed();
  }
};

// useIndicators.ts
const onBarClosed = () => {
  console.log('[useIndicators] Bar closed, refreshing indicators');
  loadAndRenderIndicators(); // 重新加载指标
};
```

---

## 🎯 技术亮点

### 1. 后端驱动指标架构（V2）

**核心优势**：
- ✅ **性能提升**：主线程减负，INP < 50ms
- ✅ **口径统一**：前后端指标计算一致
- ✅ **用户体验**：盘中不闪烁，收盘平滑更新

**实现细节**：
```typescript
// 开发模式：使用 Mock 计算
if (process.env.NODE_ENV === 'development') {
  const barsWithIndicators = mockCalculateIndicators(bars, params);
  return barsWithIndicators;
}

// 生产模式：调用后端 API
const response = await fetch('/api/v1/klines/indicator', {
  method: 'POST',
  body: JSON.stringify({ symbol, interval, indicators })
});
```

### 2. K线 Mock 会话隔离

**解决的问题**：
- ❌ 旧版：`1h → 5m → 1h`，第二次 1h 使用了 5m 的状态
- ✅ 新版：每个周期独立状态，切换时完全重置

**关键代码**：
```typescript
class KlineSessionManager {
  private sessions = new Map<string, KlineSession>();
  
  getOrCreateSession(symbol: string, interval: string) {
    const key = `${symbol}_${interval}`;
    if (!this.sessions.has(key)) {
      this.sessions.set(key, new KlineSession(symbol, interval));
    }
    return this.sessions.get(key)!;
  }
  
  destroySession(symbol: string, interval: string) {
    const key = `${symbol}_${interval}`;
    this.sessions.delete(key);
  }
}
```

### 3. WebSocket 订阅中心

**优势**：
- ✅ 资源节约：只建立一个连接
- ✅ 消息分发：自动路由到对应 Store
- ✅ 断线重连：指数退避，最多重试 5 次
- ✅ 背压处理：消息队列缓冲高频数据

**架构**：
```typescript
class WSSubscribeCenter {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, MessageHandler>();
  private reconnector = new WSReconnector();
  private messageQueue = new WSMessageQueue();
  
  subscribe(type: string, handler: MessageHandler) {
    this.handlers.set(type, handler);
  }
  
  onMessage(event: MessageEvent) {
    const msg = JSON.parse(event.data);
    const handler = this.handlers.get(msg.type);
    handler?.(msg.data);
  }
}
```

---

## 📊 性能优化策略

| 指标 | 目标 | 实现方式 |
|------|------|---------|
| **LCP** | < 2.5s | SSR、代码分割、图片优化 |
| **INP** | < 200ms | 后端驱动指标、节流渲染、Web Worker |
| **CLS** | < 0.1 | 骨架屏、固定尺寸容器 |
| **FPS** | > 30 | RAF 节流、Canvas 离屏渲染 |

---

## 🚀 部署架构

```
Vercel (Global CDN)
    ↓
Next.js 14 App (SSR/SSG)
    ↓
├─→ Backend API (待开发)
│   └── /api/v1/klines/indicator
│
├─→ WebSocket 服务 (待部署)
│   └── wss://ws.example.com
│
└─→ Solana RPC
    └── https://api.mainnet-beta.solana.com
```

---

## 📝 开发规范

### 文件大小控制
- 组件文件：≤ 300 行
- Hook 文件：≤ 150 行
- Store 文件：≤ 200 行
- Service 文件：≤ 250 行

### 命名规范
- 组件：`PascalCase.tsx`
- Hook：`useCamelCase.ts`
- Service：`camelCase.ts`
- Store：`useCamelCaseStore.ts`

### 代码审查清单
- [ ] TypeScript 类型完整
- [ ] 无 ESLint 错误
- [ ] 单文件不超过行数限制
- [ ] 魔法数字提取为常量
- [ ] 注释清晰（关键逻辑）

---

## 📚 相关文档

- **[项目 README](./README.md)** - 项目简介和快速开始
- **[详细架构](./PROJECT_STRUCTURE.md)** - 完整文件结构说明
- **[技术方案](./docs/技术方案文档_DeFi交易平台_v1.0.md)** - 详细技术设计
- **[代码规范](./docs/代码组织与模块拆分规范.md)** - 代码组织规范
- **[测试指南](./docs/TESTING_GUIDE.md)** - 测试验证流程
- **[归档文档](./docs/archive/)** - 开发过程记录

---

**最后更新**: 2026-10-22  
**架构版本**: V2 (后端驱动指标)  
**维护者**: Claude Code

