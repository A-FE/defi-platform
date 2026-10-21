# 统一 K 线和指标数据架构 - 重构方案

## 问题诊断

### 1. MACD 数据在无限左滑时缺失的根本原因

**问题表现**：左滑到中间阶段时，MACD 等指标突然没有数据。

**根本原因分析**：

#### 问题 1：指标计算需要预热周期（Warm-up Period）

MACD 的计算逻辑（`services/indicators/calculators/MACD.ts`）：

```typescript
// MACD 需要：
// - 慢线 EMA(26) 需要至少 26 根 K 线
// - DIF = EMA(12) - EMA(26)
// - DEA = EMA(DIF, 9) 需要至少 9 根 DIF 值
// 总计：前 26 + 9 = 35 根 K 线无法计算完整 MACD

if (bars.length < slowPeriod) {  // slowPeriod = 26
  return result;  // 返回空数组
}

if (dif.length < signalPeriod) {  // signalPeriod = 9
  return result;  // 返回空数组
}
```

**无限左滑场景**：
1. 初始加载 100 根 K 线（时间 T100 → T1），MACD 从第 35 根开始有数据 ✅
2. 左滑加载更早的 50 根（时间 T50 → T1），这 50 根数据：
   - 前 35 根：没有足够的历史数据计算 MACD ❌
   - 后 15 根：可能有部分数据，但不完整 ⚠️
3. 再次左滑加载 50 根，同样的问题重复 ❌

#### 问题 2：价格调整后指标计算是独立的

当前 `loadMoreHistory` 逻辑：

```typescript
// 步骤 1：获取历史数据（50 根）
const olderBars = await fetchKlines(symbol, currentInterval, from, to, enabledIndicators);

// 步骤 2：价格调整
const adjustedOlderBars = olderBars.map(bar => ({
  ...bar,
  open: bar.open * priceAdjustment,
  // ...
}));

// 步骤 3：❌ 问题：只用这 50 根数据重新计算指标
finalAdjustedBars = mockCalculateIndicators(adjustedOlderBars, {
  // 输入：50 根 K 线
  // 输出：前 35 根 MACD 为空！
});
```

**为什么有问题**：
- MACD 计算器看到的只有 50 根 K 线
- 它不知道"右侧"还有更新的 100 根数据
- 所以前 35 根无法计算 MACD，出现数据断层

#### 问题 3：数据合并时指标丢失

```typescript
// ❌ 问题代码
setKlineData(prev => {
  const currentCompleteData = prev.filter(bar =>
    bar.time >= (oldestCurrentBar.time as number)
  );
  return [...finalAdjustedBars, ...currentCompleteData];
  // finalAdjustedBars 的前 35 根没有 MACD
  // 造成中间断层
});
```

### 2. 当前架构的分散问题

当前有 **3 个独立的 hooks**：

1. **`useChartInit`**：初始化图表（主 pane + K 线系列）
2. **`useKlineData`**：管理 K 线数据 + 实时订阅 + 无限左滑
3. **`useIndicators`**：渲染指标（监听数据变化）

**存在的问题**：

- **数据流分散**：K 线数据在 `useKlineData`，指标渲染在 `useIndicators`
- **重复监听**：两个 hooks 都监听 `enabledIndicators` 变化
- **状态不同步**：`useKlineData` 的 `klineData` 和 `useIndicators` 的渲染可能不一致
- **调试困难**：数据流经过多个 hooks，问题难以定位

---

## 解决方案

### 方案 A：修复 MACD 断层 + 保持当前架构（渐进式）

**优点**：
- 改动最小
- 风险低
- 快速修复当前问题

**缺点**：
- 治标不治本
- 架构问题依然存在
- 未来维护成本高

### 方案 B：统一数据接口 + 合并 hooks（推荐）

**优点**：
- 彻底解决数据流混乱问题
- 简化架构，易于维护
- 为未来扩展打好基础

**缺点**：
- 改动较大
- 需要仔细测试

---

## 推荐实现：方案 B（统一架构）

### 核心思路

1. **统一数据接口**：K 线 + 指标 = `IndicatorKlineItem[]`（已经是这样，强化它）
2. **合并 hooks**：`useChartInit` + `useKlineData` + `useIndicators` → **`useKlineChart`**
3. **修复 MACD 断层**：左滑加载时，用"完整数据集"重新计算指标

### 架构设计

```
┌─────────────────────────────────────────────────────────┐
│ KlineChart 组件                                          │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ useKlineChart (统一 Hook)                      │    │
│  │                                                 │    │
│  │  管理职责：                                     │    │
│  │  1. 图表初始化 (chart + series)                │    │
│  │  2. K 线数据管理 (初始加载 + 实时订阅)        │    │
│  │  3. 无限左滑加载历史                           │    │
│  │  4. 指标数据计算 + 渲染                        │    │
│  │  5. 周期切换                                   │    │
│  │                                                 │    │
│  │  数据流：                                       │    │
│  │  fetchKlines() → IndicatorKlineItem[]          │    │
│  │  ↓                                              │    │
│  │  setKlineData(state)                           │    │
│  │  ↓                                              │    │
│  │  IndicatorManager.renderIndicators()           │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  返回值：                                                │
│  - containerRef                                          │
│  - isLoading, isLoadingMore                             │
│  - interval, setInterval                                │
└─────────────────────────────────────────────────────────┘

数据存储层（不变）：
- useKlineStore：缓存、fetchKlines、subscribeBars
- useIndicatorStore：指标配置

渲染层（不变）：
- IndicatorManager：负责将数据渲染到图表
```

### 关键改进

#### 1. 修复 MACD 断层：滑动窗口计算

**问题**：左滑加载 50 根历史数据时，只用这 50 根计算指标，前 35 根无数据。

**解决方案**：用"历史 50 根 + 当前全部数据"一起计算指标，然后只取前 50 根。

```typescript
// ✅ 正确的做法
const loadMoreHistory = async () => {
  // 1. 获取历史 50 根 K 线（不带指标或指标不准确）
  const olderBars = await fetchKlines(symbol, interval, from, to, []);  // 空数组 = 只要 K 线

  // 2. 价格调整
  const adjustedOlderBars = olderBars.map(bar => ({ ... }));

  // 3. ✅ 关键：合并历史 + 当前数据，用完整数据集计算指标
  const currentData = klineData;  // 当前已有的数据（100 根）
  const allBarsForCalculation = [...adjustedOlderBars, ...currentData];  // 150 根

  // 4. 用完整数据集计算指标
  let allBarsWithIndicators = allBarsForCalculation;
  if (enabledIndicators.length > 0) {
    allBarsWithIndicators = mockCalculateIndicators(allBarsForCalculation, {
      indicators: enabledIndicators,
    });
  }

  // 5. ✅ 只取前 50 根作为"新加载的历史数据"
  const newHistoryBars = allBarsWithIndicators.slice(0, adjustedOlderBars.length);

  // 6. 更新状态：新历史 + 旧数据
  setKlineData([...newHistoryBars, ...currentData]);
};
```

**为什么这样能解决问题**：
- MACD 计算器看到的是 150 根完整数据
- 前 50 根也能计算出准确的 MACD（因为有后面 100 根提供上下文）
- 没有数据断层

#### 2. 统一 Hook：`useKlineChart`

**设计目标**：
- 单一职责：管理整个图表的生命周期
- 内聚数据流：K 线 + 指标在同一个 hook 内管理
- 简化调用：外部组件只需调用一个 hook

**API 设计**：

```typescript
interface UseKlineChartReturn {
  // 图表容器
  containerRef: React.RefObject<HTMLDivElement>;
  
  // 加载状态
  isLoading: boolean;
  isLoadingMore: boolean;
  
  // 周期管理
  interval: KlineInterval;
  setInterval: (interval: KlineInterval) => void;
  
  // 数据（可选，用于调试或外部访问）
  klineData?: IndicatorKlineItem[];
}

function useKlineChart(
  symbol: string,
  defaultInterval: KlineInterval
): UseKlineChartReturn;
```

**使用示例**：

```typescript
// ✅ 简化后的组件
export function KlineChart({ symbol, defaultInterval = '1h' }) {
  const {
    containerRef,
    isLoading,
    isLoadingMore,
    interval,
    setInterval,
  } = useKlineChart(symbol, defaultInterval);

  return (
    <div className="chart-container">
      <ChartControls interval={interval} onIntervalChange={setInterval} />
      <div ref={containerRef} />
      {isLoading && <LoadingSpinner />}
      {isLoadingMore && <LoadingMoreIndicator />}
    </div>
  );
}
```

#### 3. 数据一致性保证

**当前问题**：
- `useKlineData` 管理 `klineData` 状态
- `useIndicators` 监听 `klineData` 变化并渲染
- 可能出现渲染延迟或不同步

**解决方案**：
- 在同一个 hook 内管理数据和渲染
- 数据更新后立即触发渲染
- 避免跨 hook 的状态传递

```typescript
// ✅ 在同一个 useEffect 内完成
useEffect(() => {
  if (!managerRef.current || klineData.length === 0) return;

  // 1. 更新图表 K 线
  seriesRef.current.setData(klineData.map(bar => ({ ... })));

  // 2. 立即渲染指标
  const enabledConfigs = getEnabledIndicators();
  if (enabledConfigs.length > 0) {
    managerRef.current.renderIndicators(klineData, enabledConfigs);
  }
}, [klineData, enabledIndicators]);
```

---

## 实施计划

### 第 1 步：修复 MACD 断层（高优先级）

**文件**：`components/Chart/hooks/useKlineData.ts`

**修改点**：`loadMoreHistory` 函数

**改动**：
1. 获取历史 K 线时不带指标（避免不准确的指标）
2. 合并历史 + 当前数据为完整数据集
3. 用完整数据集重新计算指标
4. 只取前 N 根作为新历史数据
5. 更新图表和状态

**预期结果**：
- 左滑加载历史数据时，MACD 等指标连续无断层
- 控制台日志显示"重新计算了完整数据集的指标"

### 第 2 步：创建统一 Hook `useKlineChart`（中优先级）

**新文件**：`components/Chart/hooks/useKlineChart.ts`

**内容**：
- 合并 `useChartInit`、`useKlineData`、`useIndicators` 的逻辑
- 简化内部状态管理
- 提供清晰的外部 API

**修改文件**：`components/Chart/KlineChart.tsx`

**改动**：
- 替换 3 个 hooks 为 1 个 `useKlineChart`
- 简化组件逻辑

### 第 3 步：优化指标计算性能（低优先级）

**可选优化**：
- 增量计算：只计算新增的 K 线的指标
- 缓存计算结果：相同参数不重复计算
- Web Worker：将指标计算移到后台线程

---

## 测试验证

### 测试场景 1：MACD 断层修复

1. 启用 MACD 指标
2. 初始加载图表（100 根 K 线）
3. 左滑加载历史数据 3 次（每次 50 根）
4. **验证**：MACD 线连续，无断层

### 测试场景 2：多指标同时加载

1. 启用 MACD + RSI + MA(5,10,20)
2. 左滑加载历史数据
3. **验证**：所有指标都正确显示，无缺失

### 测试场景 3：实时更新

1. 启用指标后，观察实时 K 线更新
2. **验证**：指标随 K 线实时更新

### 测试场景 4：周期切换

1. 切换 K 线周期（1h → 4h → 1d）
2. **验证**：指标正确加载，无错误

---

## 风险评估

### 第 1 步（修复 MACD 断层）

- **风险**：中等
- **影响范围**：`loadMoreHistory` 函数
- **回滚难度**：容易（只改一个函数）

### 第 2 步（统一 Hook）

- **风险**：较高
- **影响范围**：整个图表组件
- **回滚难度**：中等（需要保留旧的 hooks）

### 建议

1. **先执行第 1 步**，验证 MACD 断层修复
2. 如果第 1 步成功，再考虑第 2 步
3. 第 2 步可以分阶段执行：
   - 先创建新 hook，与旧 hooks 并存
   - 在新分支测试
   - 确认无问题后替换

---

## 总结

### 核心问题

1. **MACD 断层**：左滑加载时，指标计算缺少历史上下文
2. **架构分散**：3 个 hooks 管理不同职责，数据流混乱

### 解决方案

1. **滑动窗口计算**：用完整数据集计算指标，避免断层
2. **统一 Hook**：合并为 `useKlineChart`，简化架构

### 优先级

1. **立即执行**：修复 MACD 断层（第 1 步）
2. **计划执行**：统一 Hook 架构（第 2 步）
3. **未来优化**：性能优化（第 3 步）

### 预期收益

- ✅ MACD 等指标数据完整，无断层
- ✅ 代码更简洁，易于维护
- ✅ 数据流清晰，便于调试
- ✅ 为未来功能扩展打好基础
