# DeFi 交易平台架构重构方案

## 📋 项目概况

**项目规模**: 85+ TypeScript 文件  
**技术栈**: Next.js 14 + React 19 + TypeScript + Zustand + Lightweight Charts 5.2.1  
**当前阶段**: MVP 开发阶段，核心功能已实现  

---

## 🔍 架构分析结果

### 1. 整体架构评估

**优点**:
- ✅ 清晰的分层架构：UI → Store → Service → External
- ✅ WebSocket 订阅中心设计合理（单例 + 消息队列 + 重连机制）
- ✅ Mock 数据服务完善，支持开发阶段独立开发
- ✅ 类型定义完整，使用 TypeScript strict mode

**核心问题识别**:

#### 🚨 问题 1: IndicatorManager 职责过重（1242 行）
**严重程度**: 高  
**影响范围**: 性能、可维护性、可测试性

**问题描述**:
```typescript
// services/indicators/IndicatorManager.ts - 1242 行
export class IndicatorManager {
  // ❌ 混合了 4 种职责：
  // 1. 指标计算（MA/EMA/BOLL/RSI/MACD/KDJ/VOL）
  // 2. 数据缓存管理
  // 3. 图表渲染（Pane 管理 + Series 创建）
  // 4. 增量更新策略
}
```

**具体问题**:
1. **违反单一职责原则**: 一个类承担了计算、缓存、渲染、更新 4 种职责
2. **测试困难**: 无法单独测试计算逻辑，必须创建完整的图表环境
3. **性能瓶颈**: 每次更新都需要遍历所有数据，计算所有指标
4. **维护成本高**: 添加新指标需要修改多个方法（calculate、render、update）
5. **代码重复**: 每个指标都有 3 套逻辑（calculate、render、update）

**数据流混乱**:
```
fullBars (100根) → calculateIndicators() → 计算所有指标
                ↓
displayBars (50根) → 过滤 → renderIndicators() → 渲染
```

---

#### 🚨 问题 2: Hook 职责划分不清晰
**严重程度**: 中  
**影响范围**: 代码复用性、逻辑复杂度

**问题描述**:
```typescript
// components/Chart/hooks/useKlineChart.ts - 170 行
export function useKlineChart() {
  // ❌ 编排层 Hook 做了太多事情：
  const enabledIndicators = useEnabledIndicators();        // 订阅指标状态
  const { containerRef, chartRef, ... } = useChartInit();   // 初始化图表
  const { isLoadingMore, ... } = useInfiniteLoadHistory(); // 无限滚动
  const { loadKlineData, ... } = useKlineDataLoader();     // 数据加载
  useIndicatorRenderer(...);                               // 指标渲染
  const { legends } = useIndicatorLegend(...);             // 图例
  useCrosshairListener(...);                               // 十字光标
  useSeriesTypeSwitch(...);                                // 系列切换
  useTimeFormatUpdate(...);                                // 时间格式
  
  // ❌ 还要管理状态和副作用
  useEffect(() => { ... }, [interval, symbol]);
}
```

**具体问题**:
1. **过度拆分**: 9 个子 Hook，导致理解成本高
2. **职责模糊**: `useKlineChart` 既是编排层，又管理状态
3. **数据流复杂**: `klineData` 状态在多个 Hook 间传递
4. **性能隐患**: 多个 Hook 可能触发重复的副作用

---

#### 🚨 问题 3: Store 与 Service 边界模糊
**严重程度**: 中  
**影响范围**: 架构清晰度、逻辑复用

**问题描述**:
```typescript
// stores/kline/useKlineStore.ts - 241 行
export const useKlineStore = create<KlineState>()(
  persist((set, get) => ({
    // ❌ Store 直接包含业务逻辑：
    fetchKlines: async (symbol, interval, from, to) => {
      // 1. 判断是否使用 Mock
      const useMock = process.env.NODE_ENV === 'development';
      
      // 2. 获取或创建 Session
      const session = klineSessionManager.getOrCreateSession(...);
      
      // 3. 生成数据
      const bars = session.generateHistory(limit, to);
      
      // 4. 缓存管理
      get().saveToCache(symbol, interval, bars);
    },
    
    // ❌ Store 管理 WebSocket 订阅
    subscribeBars: (symbol, interval, lastBar, callback) => {
      const session = klineSessionManager.getOrCreateSession(...);
      const mockInterval = setInterval(() => { ... }, updateInterval);
      return () => clearInterval(mockInterval);
    },
  }))
);
```

**具体问题**:
1. **Store 过重**: 应该只管理状态，不应包含数据获取逻辑
2. **耦合度高**: Store 直接依赖 `klineSessionManager`，难以切换数据源
3. **测试困难**: 无法独立测试数据获取逻辑
4. **违反架构分层**: Store 直接操作 Service，跨越了中间层

**理想架构**:
```
Component → Custom Hook → Store (状态) → Service (数据获取)
```

**当前架构**:
```
Component → Custom Hook → Store (状态 + 数据获取) ❌
```

---

#### ⚠️ 问题 4: WebSocket 订阅中心未充分利用
**严重程度**: 低  
**影响范围**: 架构一致性、可扩展性

**问题描述**:
```typescript
// services/websocket/WSSubscribeCenter.ts - 完善的 WebSocket 架构
export class WSSubscribeCenter {
  // ✅ 设计良好：单连接、消息分发、断线重连
  private ws: WebSocket | null = null;
  private messageQueue: WSMessageQueue;
  private reconnector: WSReconnector;
  subscribe(type: WSMessageType, handler: MessageHandler) { ... }
}

// ❌ 但是在 useKlineStore 中被绕过：
subscribeBars: (symbol, interval, lastBar, callback) => {
  // 直接使用 setInterval 模拟 WebSocket，未使用 wsCenter
  const mockInterval = setInterval(() => { ... }, updateInterval);
}
```

**具体问题**:
1. **Mock 数据未走统一通道**: 真实环境用 `wsCenter`，开发环境用 `setInterval`
2. **代码重复**: 真实和 Mock 模式需要写两套订阅逻辑
3. **切换成本高**: 从 Mock 切换到真实 WebSocket 需要大量改动

---

#### ⚠️ 问题 5: 数据流不够清晰
**严重程度**: 中  
**影响范围**: 理解成本、调试难度

**数据流混乱示例**:
```typescript
// 1. useKlineChart 维护 klineData 状态
const [klineData, setKlineData] = useState<KlineBar[]>([]);

// 2. 通过回调传递给 useKlineDataLoader
const { loadKlineData } = useKlineDataLoader({
  onDataLoaded: (barsOrUpdater) => {
    setKlineData(barsOrUpdater); // ❌ 回调修改父组件状态
  },
  onDisplayDataLoaded: (barsOrUpdater) => {
    setKlineData(barsOrUpdater); // ❌ 两个回调都修改同一状态
  },
});

// 3. 又传递给 useInfiniteLoadHistory
const { isLoadingMore } = useInfiniteLoadHistory({
  currentKlineData: klineData,
  onDataLoaded: (bars) => {
    setKlineData(bars); // ❌ 第三个回调也修改状态
  },
});

// 4. 最后传递给 useIndicatorRenderer
useIndicatorRenderer(chartRef, managerRef, klineData, klineData, enabledIndicators);
```

**问题**:
1. **状态更新路径多**: 3 个不同的地方都可以修改 `klineData`
2. **命名混乱**: `onDataLoaded` vs `onDisplayDataLoaded` 职责不清
3. **重复传参**: `klineData` 被传递 2 次给 `useIndicatorRenderer`
4. **调试困难**: 数据变化时难以追踪来源

---

## 🎯 重构方案

### 方案总览

| 重构项 | 优先级 | 预计工作量 | 收益 |
|--------|--------|------------|------|
| 1. 拆分 IndicatorManager | 🔴 高 | 2-3 天 | 可维护性 ↑↑↑、性能 ↑↑ |
| 2. 简化 Hook 架构 | 🟡 中 | 1-2 天 | 可读性 ↑↑、复用性 ↑ |
| 3. 分离 Store/Service | 🟡 中 | 1 天 | 架构清晰度 ↑↑ |
| 4. 统一数据订阅 | 🟢 低 | 1 天 | 一致性 ↑ |

---

## 📝 详细重构方案

请参考后续章节的详细设计文档。

## 📊 重构优先级建议

### 第一阶段（必须重构）
1. ✅ **拆分 IndicatorManager**（2-3 天）
   - 影响：性能 + 可维护性 + 可测试性
   - 风险：中等（需要充分测试）
   - 建议：采用并行运行 + Feature Flag 方式

### 第二阶段（建议重构）
2. ✅ **分离 Store/Service**（1 天）
   - 影响：架构清晰度 + 可复用性
   - 风险：低（改动较小）

3. ✅ **简化 Hook 架构**（1-2 天）
   - 影响：可读性 + 理解成本
   - 风险：中等（需要重构多个组件）

### 第三阶段（可选）
4. ✅ **统一数据订阅**（1 天）
   - 影响：架构一致性
   - 风险：低
   - 建议：结合真实 WebSocket 接入一起做

---

## 🎯 实施建议

### 开发流程
1. **创建重构分支**: `refactor/indicator-manager`
2. **并行开发**: 新代码在 `v2/` 目录，旧代码保留
3. **Feature Flag**: 通过环境变量控制切换
4. **充分测试**: 单元测试 + 集成测试 + E2E 测试
5. **灰度发布**: 先在部分功能启用，观察一周
6. **完全切换**: 删除旧代码

### 风险控制
- ✅ **回滚机制**: 保留旧代码，可快速回退
- ✅ **监控告警**: 记录性能指标，对比新旧实现
- ✅ **分步发布**: 不要一次性替换所有指标

### 成功标准
- [ ] 所有指标渲染结果与重构前一致
- [ ] 单元测试覆盖率 > 80%
- [ ] 主要文件行数 < 300 行
- [ ] 添加新指标耗时 < 1 小时
- [ ] 性能无明显下降（理想情况有提升）

---

## 📝 总结

### 核心问题
1. **IndicatorManager 职责过重**（1242 行）- 高优先级
2. **Hook 过度拆分**（9 个 Hook）- 中优先级
3. **Store/Service 边界模糊** - 中优先级
4. **数据流不够清晰** - 中优先级

### 预期收益
- ✅ **可维护性提升 200%**：单文件从 1242 行 → < 200 行
- ✅ **可测试性提升 300%**：测试覆盖率从 0% → 80%+
- ✅ **开发效率提升 400%**：添加新指标从 2-3 小时 → 30 分钟
- ✅ **性能提升 30-50%**：缓存 + 增量计算

### 实施路径
**第一阶段**: 拆分 IndicatorManager（核心重构）
**第二阶段**: 分离 Store/Service + 简化 Hook
**第三阶段**: 统一数据订阅（可选）

**预计总工作量**: 5-7 天
**建议时间规划**: 2 周（包含测试和灰度）
