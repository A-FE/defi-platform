# 统一 K 线和指标接口重构方案

## 📋 问题分析

### 当前架构的核心问题

```typescript
// ❌ 问题 1: 两个独立的数据获取方法
fetchHistory(symbol, interval, limit)        // 返回 KlineBar[] - 只有 OHLCV
fetchHistoryWithIndicators(symbol, interval, from, to, indicators) // 返回 IndicatorKlineItem[] - OHLCV + 指标

// ❌ 问题 2: 数据重复获取
// 初始化时：
const bars = await fetchHistory(symbol, interval, 100);  // 第一次获取 K 线
seriesRef.current.setData(bars);

// 渲染指标时：
const barsWithIndicators = await fetchHistoryWithIndicators(...); // 第二次获取 K 线（还带指标）
renderIndicators(barsWithIndicators);

// ❌ 问题 3: 职责不清晰
useKlineData  → 负责纯 K 线（调用 fetchHistory）
useIndicators → 负责指标（调用 fetchHistoryWithIndicators）
// 两个 Hook 都在操作同一批 K 线数据，但数据来源不同

// ❌ 问题 4: 不符合后端 API 设计
// 后端接口 /api/v1/klines/indicator 本身就返回 K 线 + 指标
// fetchHistory 完全是多余的中间层
```

### 用户的观点正确性

✅ **K 线和指标应该通过一个接口返回**
- 后端 API 设计就是 `/api/v1/klines/indicator` 返回 K 线 + 指标
- 前端不应该拆分成两次请求
- `fetchHistory` 没有存在的必要

✅ **当前设计导致的问题**
1. 数据重复获取（浪费带宽和计算）
2. 两个数据源可能不一致（缓存、时间差）
3. 代码逻辑复杂（两个 Hook 交织）
4. 维护成本高

---

## 🎯 重构目标

### 核心原则
1. **统一数据源** - 所有 K 线数据都带指标信息（indicators 字段可以为空）
2. **简化接口** - 只保留一个数据获取方法
3. **兼容 WebSocket** - 实时推送仍然只推 K 线（isClosed 触发指标刷新）
4. **职责清晰** - useKlineData 管理完整数据流，包括 K 线和指标

### 目标架构

```typescript
// ✅ 统一的数据获取方法
fetchKlines(symbol, interval, from, to, indicators?) 
// 返回 IndicatorKlineItem[]
// - indicators 为空：只返回 K 线数据（indicators 字段为 {}）
// - indicators 有值：返回 K 线 + 指标数据

// ✅ 清晰的职责划分
useKlineData
  - 管理完整数据流（K 线 + 指标）
  - 处理初始加载、WebSocket、无限滚动
  - 处理 K 线收盘后的指标刷新
  
useIndicators（简化版）
  - 只负责指标渲染（从 useKlineData 获取数据）
  - 监听指标配置变化
  - 不再负责数据获取
```

---

## 📐 详细设计

### 1. 类型定义调整

#### 1.1 统一 K 线类型

```typescript
// types/market.ts
// ❌ 删除 KlineBar 类型（已过时）
export interface KlineBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed?: boolean; // ❌ 这个类型将被废弃
}

// ✅ 使用统一的 IndicatorKlineItem（已在 types/api.ts）
// 所有 K 线数据都使用这个类型
export type KlineItem = IndicatorKlineItem;
```

#### 1.2 更新 Store 类型

```typescript
// types/store.ts
export interface KlineState {
  bars: IndicatorKlineItem[];  // ✅ 改为统一类型
  interval: KlineInterval;
  cache: Record<string, KlineCacheItem>;
  isLoading: boolean;

  // ✅ 统一的数据获取方法
  fetchKlines: (
    symbol: string,
    interval: KlineInterval,
    from: number,
    to: number,
    indicators?: Array<{ name: string; params: number[] }>
  ) => Promise<IndicatorKlineItem[]>;

  // ❌ 删除这两个方法
  // fetchHistory: (...) => ...
  // fetchHistoryWithIndicators: (...) => ...

  // ✅ 保留其他方法
  subscribeBars: (...) => ...;
  unsubscribeBars: (...) => ...;
  updateBar: (symbol: string, bar: IndicatorKlineItem) => void;
  getFromCache: (...) => IndicatorKlineItem[] | null;
  saveToCache: (...) => void;
}
```

### 2. Store 重构

#### 2.1 实现统一的 fetchKlines 方法

```typescript
// stores/kline/useKlineStore.ts

fetchKlines: async (symbol, interval, from, to, indicators = []) => {
  set({ isLoading: true });

  try {
    // 开发模式：使用 Mock
    const useMock = process.env.NODE_ENV === 'development' ||
                    !process.env.NEXT_PUBLIC_INDICATOR_API_ENABLED;

    if (useMock) {
      // 1. 生成基础 K 线数据（使用现有的 Mock 服务）
      const session = klineSessionManager.getOrCreateSession(symbol, interval);
      const limit = Math.ceil((to - from) / getIntervalSeconds(interval));
      const bars = session.generateHistory(limit);

      // 2. 如果有指标配置，计算指标
      if (indicators.length > 0) {
        const { mockCalculateIndicators } = await import('@/services/mock/indicatorMock');
        const barsWithIndicators = mockCalculateIndicators(bars, {
          symbol,
          resolution: interval,
          from,
          to,
          indicators,
        });
        
        get().saveToCache(symbol, interval, barsWithIndicators);
        set({ bars: barsWithIndicators, interval, isLoading: false });
        return barsWithIndicators;
      }

      // 3. 没有指标配置，返回纯 K 线（indicators 字段为空对象）
      const klineItems: IndicatorKlineItem[] = bars.map(bar => ({
        ...bar,
        indicators: {}
      }));
      
      get().saveToCache(symbol, interval, klineItems);
      set({ bars: klineItems, interval, isLoading: false });
      return klineItems;
    }

    // 生产模式：调用后端接口
    const response = await fetchKlineWithIndicators({
      symbol,
      resolution: interval,
      from,
      to,
      indicators,
    });

    get().saveToCache(symbol, interval, response.bars);
    set({ bars: response.bars, interval, isLoading: false });
    return response.bars;

  } catch (error) {
    console.error('[fetchKlines] 获取数据失败:', error);
    set({ isLoading: false });
    return [];
  }
},
```

#### 2.2 更新 subscribeBars（保持不变）

```typescript
// WebSocket 仍然只推送 K 线数据（不带指标）
subscribeBars: (symbol, interval, lastBar, callback) => {
  const session = klineSessionManager.getOrCreateSession(symbol, interval);
  
  const mockInterval = setInterval(() => {
    const currentBarTime = TimeAlignmentUtil.getCurrentAlignedTime(interval);
    const bar = session.generateRealtimeUpdate(currentBarTime);
    
    // ✅ 转换为 IndicatorKlineItem 格式（indicators 为空）
    const klineItem: IndicatorKlineItem = {
      ...bar,
      indicators: {}  // WebSocket 推送不带指标
    };
    
    callback(klineItem);
    get().updateBar(symbol, klineItem);
  }, updateInterval);

  return () => clearInterval(mockInterval);
},
```

#### 2.3 更新 updateBar

```typescript
updateBar: (symbol, bar: IndicatorKlineItem) => {
  set((state) => {
    const bars = [...state.bars];
    const lastBar = bars[bars.length - 1];

    if (lastBar && lastBar.time === bar.time) {
      // 更新当前 K 线（保留已有的指标数据）
      bars[bars.length - 1] = {
        ...bar,
        indicators: lastBar.indicators || {}  // 保留原有指标
      };
    } else {
      // 新 K 线
      bars.push(bar);
    }

    return { bars };
  });
},
```

### 3. useKlineData 重构

#### 3.1 核心改变

```typescript
// components/Chart/hooks/useKlineData.ts

export function useKlineData(
  symbol: string,
  defaultInterval: KlineInterval,
  chartRef: React.RefObject<IChartApi | null>,
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>,
  enabledIndicators: Array<{ name: string; params: number[] }> = []  // ✅ 新增参数
) {
  const { fetchKlines, subscribeBars, getFromCache } = useKlineStore();
  
  // ✅ 返回完整数据（包括指标），供外部使用
  const [klineData, setKlineData] = useState<IndicatorKlineItem[]>([]);

  // 加载 K 线数据
  const loadKlineData = useCallback(async (newInterval: KlineInterval) => {
    if (!seriesRef.current) return;

    setIsLoading(true);

    try {
      // ✅ 统一使用 fetchKlines
      const now = Math.floor(Date.now() / 1000);
      const from = now - (100 * getIntervalSeconds(newInterval));
      
      const bars = await fetchKlines(
        symbol, 
        newInterval, 
        from, 
        now,
        enabledIndicators  // ✅ 传入指标配置
      );

      setKlineData(bars);  // ✅ 保存完整数据

      // 渲染 K 线到图表
      const data = bars.map(bar => ({
        time: bar.time as any,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }));

      seriesRef.current.setData(data);

      // 订阅 WebSocket
      const lastBar = bars[bars.length - 1];
      const unsubscribe = subscribeBars(symbol, newInterval, lastBar, (bar) => {
        if (!seriesRef.current) return;

        // 更新 K 线
        seriesRef.current.update({
          time: bar.time as any,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        });

        // K 线收盘：触发指标刷新
        if (bar.isClosed) {
          console.log('[useKlineData] Bar closed, reloading with indicators');
          reloadWithIndicators();
        }
      });

      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error('Load K-line data error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, fetchKlines, enabledIndicators]);

  // ✅ K 线收盘后重新加载（带指标）
  const reloadWithIndicators = useCallback(async () => {
    if (enabledIndicators.length === 0) return;

    const now = Math.floor(Date.now() / 1000);
    const from = now - (100 * getIntervalSeconds(interval));

    const bars = await fetchKlines(symbol, interval, from, now, enabledIndicators);
    setKlineData(bars);  // 更新完整数据
    
    // 不需要更新 K 线图表（已经通过 WebSocket 更新了）
    // 只需要触发指标重新渲染（外部监听 klineData 变化）
  }, [symbol, interval, enabledIndicators, fetchKlines]);

  // ✅ 当指标配置变化时，重新加载数据
  useEffect(() => {
    if (interval) {
      loadKlineData(interval);
    }
  }, [interval, enabledIndicators]);  // ✅ 依赖指标配置

  return {
    interval,
    setInterval: loadKlineData,
    isLoading,
    isLoadingMore,
    klineData,  // ✅ 返回完整数据（包括指标）
    reloadWithIndicators,  // ✅ 暴露刷新方法
  };
}
```

### 4. useIndicators 重构（简化版）

#### 4.1 只负责渲染

```typescript
// components/Chart/hooks/useIndicators.ts

export function useIndicators(
  chartRef: React.RefObject<IChartApi | null>,
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>,
  klineData: IndicatorKlineItem[]  // ✅ 从外部接收数据
) {
  const managerRef = useRef<IndicatorManagerV2 | null>(null);
  const { getEnabledIndicators } = useIndicatorStore();

  // 初始化 Manager
  useEffect(() => {
    if (chartRef.current && seriesRef.current && !managerRef.current) {
      managerRef.current = new IndicatorManagerV2(
        chartRef.current,
        seriesRef.current
      );
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.clear();
        managerRef.current = null;
      }
    };
  }, [chartRef, seriesRef]);

  // ✅ 监听数据变化，自动渲染指标
  useEffect(() => {
    if (!managerRef.current || klineData.length === 0) return;

    const enabledConfigs = getEnabledIndicators();

    if (enabledConfigs.length === 0) {
      managerRef.current.clear();
      return;
    }

    console.log('[useIndicators] Rendering indicators:', {
      barsCount: klineData.length,
      indicators: enabledConfigs.map(c => c.type),
    });

    managerRef.current.renderIndicators(klineData, enabledConfigs);
  }, [klineData, getEnabledIndicators]);

  return {
    // ✅ 简化：不再返回加载方法（数据由 useKlineData 管理）
  };
}
```

### 5. KlineChart.tsx 重构

#### 5.1 简化组件逻辑

```typescript
// components/Chart/KlineChart.tsx

export function KlineChart({ symbol, defaultInterval = '1h' }: KlineChartProps) {
  const { containerRef, chartRef, seriesRef } = useChartInit();
  const [interval, setInterval] = useState<KlineInterval>(defaultInterval);

  // ✅ 获取当前启用的指标配置
  const { getEnabledIndicators } = useIndicatorStore();
  const enabledIndicators = useMemo(() => {
    const configs = getEnabledIndicators();
    return convertIndicatorConfigsToParams(configs.map(c => ({
      type: c.type,
      params: c.params,
    })));
  }, [getEnabledIndicators]);

  // ✅ K 线数据管理（包括指标）
  const { 
    interval: _interval, 
    setInterval: setKlineInterval, 
    isLoading, 
    isLoadingMore,
    klineData  // ✅ 获取完整数据
  } = useKlineData(
    symbol,
    interval,
    chartRef,
    seriesRef,
    enabledIndicators  // ✅ 传入指标配置
  );

  // ✅ 指标渲染（只负责渲染）
  useIndicators(chartRef, seriesRef, klineData);

  // 周期切换
  const handleIntervalChange = (newInterval: KlineInterval) => {
    setInterval(newInterval);
    setKlineInterval(newInterval);
  };

  return (
    // ... JSX 保持不变
  );
}
```

---

## 🔄 数据流对比

### 旧架构（当前）

```
初始化:
  useKlineData.loadKlineData()
    → fetchHistory(symbol, interval, 100)
    → 返回 KlineBar[]
    → seriesRef.setData(bars)
  
  useIndicators.loadAndRenderIndicators()
    → fetchHistoryWithIndicators(symbol, interval, from, to, indicators)
    → 返回 IndicatorKlineItem[]  // ❌ K 线数据重复获取
    → renderIndicators(barsWithIndicators)

WebSocket 更新:
  subscribeBars()
    → 推送 KlineBar
    → seriesRef.update(bar)
    → bar.isClosed → handleBarClosed()
      → fetchHistoryWithIndicators()  // ❌ 又要获取一次 K 线
      → renderIndicators()
```

### 新架构（重构后）

```
初始化:
  useKlineData.loadKlineData()
    → fetchKlines(symbol, interval, from, to, enabledIndicators)
    → 返回 IndicatorKlineItem[]  // ✅ 一次获取 K 线 + 指标
    → seriesRef.setData(bars.map(toOHLC))
    → setKlineData(bars)  // 保存完整数据
  
  useIndicators
    → 监听 klineData 变化
    → renderIndicators(klineData)  // ✅ 直接使用数据

WebSocket 更新:
  subscribeBars()
    → 推送 IndicatorKlineItem（indicators 为空）
    → seriesRef.update(bar)
    → bar.isClosed → reloadWithIndicators()
      → fetchKlines(symbol, interval, from, to, enabledIndicators)  // ✅ 统一接口
      → setKlineData(bars)
      → useIndicators 自动监听到变化 → renderIndicators()
```

---

## 📦 重构清单

### 阶段 1: 类型定义统一

- [ ] `types/market.ts` - 废弃 `KlineBar`，使用 `IndicatorKlineItem`
- [ ] `types/store.ts` - 更新 `KlineState` 接口
  - 移除 `fetchHistory`、`fetchHistoryWithIndicators`
  - 添加 `fetchKlines`
  - 更新 `bars` 类型为 `IndicatorKlineItem[]`

### 阶段 2: Store 重构

- [ ] `stores/kline/useKlineStore.ts`
  - 实现 `fetchKlines` 方法
  - 删除 `fetchHistory` 方法
  - 删除 `fetchHistoryWithIndicators` 方法
  - 更新 `subscribeBars` 返回类型
  - 更新 `updateBar` 参数类型
  - 更新缓存相关方法

### 阶段 3: Mock 服务更新

- [ ] `services/mock/indicatorMock.ts`
  - 更新参数类型为 `IndicatorKlineItem[]`
  - 确保返回值符合统一接口

### 阶段 4: Hooks 重构

- [ ] `components/Chart/hooks/useKlineData.ts`
  - 接收 `enabledIndicators` 参数
  - 使用 `fetchKlines` 替代 `fetchHistory`
  - 添加 `klineData` state
  - 添加 `reloadWithIndicators` 方法
  - 更新 WebSocket 回调逻辑
  - 更新无限滚动逻辑

- [ ] `components/Chart/hooks/useIndicators.ts`
  - 接收 `klineData` 参数（不再自己获取数据）
  - 删除 `loadAndRenderIndicators` 方法
  - 删除 `handleBarClosed` 方法
  - 简化为纯渲染逻辑
  - 监听 `klineData` 变化自动渲染

### 阶段 5: 组件更新

- [ ] `components/Chart/KlineChart.tsx`
  - 获取当前指标配置
  - 传递 `enabledIndicators` 给 `useKlineData`
  - 传递 `klineData` 给 `useIndicators`
  - 简化状态管理

### 阶段 6: 清理和测试

- [ ] 删除所有对 `fetchHistory` 的引用
- [ ] 删除所有对 `fetchHistoryWithIndicators` 的引用
- [ ] 更新所有 `KlineBar` 类型引用为 `IndicatorKlineItem`
- [ ] 运行构建验证
- [ ] 功能测试（初始加载、指标切换、参数修改、WebSocket 更新）

---

## ⚠️ 风险评估

### 低风险
- ✅ 类型定义变更（纯重命名）
- ✅ Store 方法合并（逻辑清晰）
- ✅ Mock 服务更新（已有基础）

### 中风险
- ⚠️ useKlineData 重构（逻辑较复杂）
  - 缓解：逐步迁移，保留调试日志
- ⚠️ WebSocket 回调变更
  - 缓解：确保 `isClosed` 逻辑正确

### 高风险
- 🔴 无限滚动逻辑
  - 当前使用 `fetchHistory`，需要改为 `fetchKlines`
  - 缓解：先实现基础功能，后处理边缘情况

---

## 🎯 预期效果

### 代码简化
- **删除代码**: ~150 行（重复的数据获取逻辑）
- **简化 Hook**: useIndicators 从 ~180 行 → ~80 行
- **统一接口**: 2 个方法 → 1 个方法

### 性能提升
- **减少请求**: 初始加载从 2 次请求 → 1 次请求
- **减少数据传输**: 避免 K 线数据重复获取

### 可维护性
- **职责清晰**: useKlineData 管理数据，useIndicators 管理渲染
- **易于扩展**: 新增指标只需修改参数，不需要改数据流
- **易于测试**: 单一数据源，测试用例更简单

---

## 📝 后续优化（可选）

1. **缓存优化**: 
   - 缓存 key 包含指标签名
   - 避免相同参数重复计算

2. **增量更新**:
   - K 线收盘后只更新最后一根的指标
   - 不需要重新获取全部数据

3. **错误处理**:
   - 统一的错误提示
   - 失败重试机制

4. **类型安全**:
   - 移除所有 `any` 类型
   - 完善泛型定义
