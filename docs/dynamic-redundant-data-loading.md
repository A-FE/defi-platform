# 动态冗余数据加载方案

## 📋 问题背景

### 原问题
在时间轴上，K 线、MACD、KDJ、移动平均线看起来数据条数不一样，视觉不对齐。

### 根本原因
不同指标需要不同的历史数据量才能开始计算：
- **K 线**: 第 1 根就有数据
- **MA5**: 需要 5 根历史数据，从第 5 根开始
- **MA30**: 需要 30 根历史数据，从第 30 根开始
- **MACD(12,26,9)**: 需要 35 根历史数据（slow 26 + signal 9），从第 35 根开始
- **KDJ(9,3,3)**: 需要 9 根历史数据，从第 9 根开始

当只加载 100 根数据并显示最新 50 根时：
```
数据区间: [1 - 100]
可视区间: [51 - 100]

MA30 在可视区内: 第 51 根需要 [22-51] 的数据 ✅ 有数据
MACD 在可视区内: 第 51 根需要 [17-51] 的数据 ✅ 有数据

但如果加载的数据刚好是 50 根：
数据区间: [1 - 50]
可视区间: [1 - 50]

MA30: 前 29 根无数据 ❌
MACD: 前 34 根无数据 ❌
```

## 🎯 解决方案

### 核心思路
**不回填 NaN，而是根据启用的指标动态计算冗余数据量，确保可视区内所有指标都有完整数据。**

### 计算公式
```typescript
总加载量 = 显示数据量 + (指标最大需求 * 冗余倍数)

// 示例：显示 50 根，启用了 MACD(需要 35 根)
总加载量 = 50 + (35 * 2) = 120 根
```

### 冗余倍数
采用 **2 倍冗余**，保证安全：
- MA30 需要 30 根 → 冗余 60 根
- MACD 需要 35 根 → 冗余 70 根

## 🔧 实现细节

### 1. 新增工具函数 `utils/indicatorDataRequirements.ts`

```typescript
/**
 * 获取指标的最小数据需求
 */
export function getIndicatorMinDataSize(config: IndicatorConfig): number {
  switch (config.type) {
    case 'MA':
      return Math.max(...Object.values(config.params)); // MA30 → 30
    case 'MACD':
      return config.params.slow + config.params.signal; // MACD(12,26,9) → 35
    case 'BOLL':
      return config.params.period; // BOLL(20,2) → 20
    case 'KDJ':
      return config.params.k; // KDJ(9,3,3) → 9
    // ...
  }
}

/**
 * 计算启用指标所需的最大冗余数据量（2 倍）
 */
export function calculateMaxRedundantDataSize(enabledIndicators: IndicatorConfig[]): number {
  if (enabledIndicators.length === 0) return 0;
  
  const maxMinSize = Math.max(
    ...enabledIndicators.map(config => getIndicatorMinDataSize(config))
  );
  
  return maxMinSize * 2; // 2 倍冗余
}

/**
 * 计算实际需要加载的总数据量
 */
export function calculateTotalDataSize(
  displaySize: number,
  enabledIndicators: IndicatorConfig[]
): number {
  return displaySize + calculateMaxRedundantDataSize(enabledIndicators);
}
```

### 2. 修改 `constants/chart.ts`

```typescript
export const CHART_DATA_CONFIG = {
  DISPLAY_DATA_SIZE: 50,        // 可视区数据量
  HISTORY_LOAD_SIZE: 50,        // 历史加载量
  MAX_DATA_SIZE: 300,           // 最大缓存（防止内存溢出）
  BASE_DATA_SIZE: 100,          // 基础数据量（未启用指标时）
} as const;
```

### 3. 修改 `useKlineDataLoader.ts`

```typescript
export function useKlineDataLoader({
  // ...
  enabledIndicators, // ✅ 新增参数
}: UseKlineDataLoaderProps) {
  const totalDataSizeRef = useRef<number>(CHART_DATA_CONFIG.BASE_DATA_SIZE);

  const loadKlineData = useCallback(async (interval: KlineInterval) => {
    // ✅ 动态计算需要加载的数据量
    const totalDataSize = Math.max(
      CHART_DATA_CONFIG.BASE_DATA_SIZE,
      calculateTotalDataSize(CHART_DATA_CONFIG.DISPLAY_DATA_SIZE, enabledIndicators)
    );
    
    totalDataSizeRef.current = totalDataSize;
    
    console.log('[loadKlineData] 📊 数据量计算:', {
      显示数据量: CHART_DATA_CONFIG.DISPLAY_DATA_SIZE,
      启用指标数: enabledIndicators.length,
      总加载量: totalDataSize,
    });

    const from = now - (totalDataSize * getIntervalSeconds(interval));
    const allBars = await fetchKlines(symbol, interval, from, now);
    
    // ... 加载数据
  }, [enabledIndicators, ...]);
}
```

### 4. 修改 `useKlineChart.ts`

```typescript
export function useKlineChart({ symbol, initialInterval = '1h' }: UseKlineChartProps) {
  const enabledIndicators = useEnabledIndicators();

  const { loadKlineData, unsubscribe } = useKlineDataLoader({
    symbol,
    chartRef,
    seriesRef,
    fetchKlines,
    subscribeBars,
    onDataLoaded: setFullKlineData,
    onDisplayDataLoaded: setDisplayKlineData,
    onOldestTimeUpdate: (time) => { oldestTimeRef.current = time; },
    enabledIndicators, // ✅ 传入启用的指标列表
  });
}
```

## 📊 效果验证

### 测试用例

| 场景 | 显示数据量 | 启用指标 | 总加载量 | 验证 |
|------|-----------|---------|---------|------|
| 未启用指标 | 50 | 无 | 100 (基础量) | ✅ |
| 启用 MA30 | 50 | MA(5,10,20,30) | 110 (50 + 60) | ✅ |
| 启用 MACD | 50 | MACD(12,26,9) | 120 (50 + 70) | ✅ |
| 启用所有指标 | 50 | MA, MACD, BOLL, KDJ | 120 (50 + 70) | ✅ |

### 可视区验证

**场景**: 加载 120 根数据，显示最新 50 根

```
数据区间: [1 - 120]
可视区间: [71 - 120]

MA30 在可视区内:
  - 第 71 根需要历史数据: [42 - 71] (30 根)
  - 实际可用数据: [1 - 120]
  - 结论: ✅ 数据充足，可视区内所有点都能计算

MACD 在可视区内:
  - 第 71 根需要历史数据: [37 - 71] (35 根)
  - 实际可用数据: [1 - 120]
  - 结论: ✅ 数据充足，可视区内所有点都能计算
```

## ✅ 优势

1. **视觉对齐**: 可视区内所有指标都有完整数据，视觉上完全对齐
2. **动态调整**: 根据启用的指标自动调整加载量，不浪费资源
3. **安全冗余**: 2 倍冗余确保即使指标参数调整也有足够数据
4. **性能优化**: 未启用指标时只加载基础数据量（100 根）

## 🔄 动态行为

| 操作 | 行为 |
|------|------|
| 启用新指标 | 下次加载时自动增加数据量 |
| 禁用指标 | 下次加载时自动减少数据量 |
| 调整指标参数 | 下次加载时自动调整数据量 |
| 切换周期 | 重新计算并加载新数据 |

## 📝 注意事项

1. **不回填 NaN**: 通过加载更多历史数据解决问题，不修改指标计算逻辑
2. **可视范围控制**: 虽然加载了更多数据，但图表初始可视范围仍为 50 根
3. **内存管理**: 设置 `MAX_DATA_SIZE: 300` 防止内存溢出
4. **兼容性**: 与现有的历史加载、WebSocket 更新逻辑完全兼容

## 🧪 测试

运行测试：
```bash
npx tsx tests/indicatorDataRequirements.test.ts
```

预期输出：
- ✅ MA30 最小需求: 30 根
- ✅ MACD 最小需求: 35 根
- ✅ 冗余计算: 30 * 2 = 60, 35 * 2 = 70
- ✅ 总加载量: 50 + 70 = 120 根
- ✅ 可视区内所有指标都有完整数据
