# 三个问题的完整修复方案

## 问题分析

### 问题 1：MACD 指标仍然不连续

**根本原因分析**：

经过代码审查，我发现了真正的问题：

1. **渲染时机问题**：
   ```typescript
   // useKlineChart.ts L428-437
   useEffect(() => {
     // 每次 klineData 或 getEnabledIndicators 变化时，重新渲染指标
     managerRef.current.renderIndicators(klineData, enabledConfigs);
   }, [klineData, getEnabledIndicators]);
   ```

2. **IndicatorManager 的问题**：
   ```typescript
   // IndicatorManager.ts L37-46
   renderIndicators(bars: IndicatorKlineItem[], configs: IndicatorConfig[]): void {
     // 清空旧指标
     this.clear();  // ❌ 这里会删除所有系列
     
     // 渲染每个指标
     enabledConfigs.forEach((config) => { ... });
   }
   ```

3. **clear() 方法的破坏性**：
   ```typescript
   // IndicatorManager.ts L502-520
   clear(): void {
     this.indicatorSeries.forEach((series, type) => {
       series.forEach((s) => {
         this.chart.removeSeries(s);  // ❌ 删除所有系列
       });
     });
     
     // 移除副图 panes
     this.removePaneIfEmpty(type);  // ❌ 删除 panes
   }
   ```

**问题链**：
1. `loadMoreHistory` 更新 `klineData` → 触发渲染 useEffect
2. `renderIndicators` 先调用 `clear()` → **删除所有指标系列和 panes**
3. 然后重新创建系列 → **但数据可能不完整**
4. 结果：出现闪烁和断层

**真正的解决方案**：

不应该每次都 `clear()` 然后重建，而应该：
- **增量更新**：只更新现有系列的数据
- **智能重建**：只有在指标配置变化时才重建

---

### 问题 2：WebSocket 推送的价格变化幅度太大

**当前问题**：

```typescript
// PriceGenerator.ts L14-29
static generate(prevClose: number, trend: number, trendStrength: number) {
  const trendMove = trend * trendStrength * 0.01;  // ±0.3% - ±0.7%
  const randomMove = (Math.random() - 0.5) * 0.02; // ±1%
  const totalMove = trendMove + randomMove;  // ❌ 总共可能 ±1.7%
  
  const close = open * (1 + totalMove);
}
```

**问题**：
- 每次更新的变化可能达到 ±1.7%
- 不符合 -3% ~ +3% 的要求
- 实时 WebSocket 推送时，价格跳跃太明显

**解决方案**：
1. **限制单次变化幅度**：每次更新限制在 ±0.5%
2. **累积变化限制**：相对于 open 的总变化限制在 ±3%
3. **平滑过渡**：使用更小的随机步长

---

### 问题 3：时间坐标轴展示格式不匹配周期

**当前问题**：

```typescript
// chartOptions.ts L16-20
timeScale: {
  timeVisible: true,
  secondsVisible: false,  // ❌ 硬编码，不根据周期调整
}
```

**期望行为**：

| 周期 | 时间格式 | 示例 |
|------|---------|------|
| 1m | mm:ss | 15:30 |
| 5m | HH:mm | 15:30 |
| 15m | HH:mm | 15:30 |
| 1h | MM-DD HH:mm | 10-21 15:00 |
| 4h | MM-DD HH:mm | 10-21 12:00 |
| 1d | YYYY-MM-DD | 2026-10-21 |
| 1w | YYYY-MM-DD | 2026-10-21 |

**lightweight-charts 5.x 的时间格式配置**：

```typescript
// 新版 API
chart.applyOptions({
  localization: {
    timeFormatter: (businessDayOrTimestamp: any) => {
      // 自定义格式化函数
    }
  }
});
```

---

## 修复方案

### 方案 1：修复 MACD 不连续（高优先级）

#### 方法 A：增量更新（推荐）

**核心思路**：
- 不要每次都 `clear()` 再重建
- 只更新现有系列的数据
- 只有在指标配置变化时才重建

**实现**：

1. **在 IndicatorManager 中添加 `updateIndicators` 方法**：

```typescript
// IndicatorManager.ts
updateIndicators(bars: IndicatorKlineItem[], configs: IndicatorConfig[]): void {
  const enabledConfigs = configs.filter(c => c.enabled);
  
  // 检查指标配置是否变化
  const configChanged = this.hasConfigChanged(enabledConfigs);
  
  if (configChanged) {
    // 配置变化：完全重建
    this.renderIndicators(bars, configs);
  } else {
    // 配置未变：只更新数据
    this.updateSeriesData(bars, enabledConfigs);
  }
}

private updateSeriesData(bars: IndicatorKlineItem[], configs: IndicatorConfig[]): void {
  configs.forEach((config) => {
    const series = this.indicatorSeries.get(config.type);
    if (!series) return;
    
    switch (config.type) {
      case 'MACD':
        this.updateMACDData(bars, series);
        break;
      case 'RSI':
        this.updateRSIData(bars, series);
        break;
      // ... 其他指标
    }
  });
}

private updateMACDData(bars: IndicatorKlineItem[], series: ISeriesApi<any>[]): void {
  const [difSeries, deaSeries, histSeries] = series;
  
  const difData = bars.filter(b => b.indicators.macd).map(b => ({
    time: b.time,
    value: b.indicators.macd!.dif,
  }));
  
  // 使用 setData 而不是逐个 update
  difSeries.setData(difData);
  // ... deaSeries, histSeries
}
```

2. **在 useKlineChart 中调用 updateIndicators**：

```typescript
// useKlineChart.ts
useEffect(() => {
  if (!managerRef.current || klineData.length === 0) return;
  
  const enabledConfigs = getEnabledIndicators();
  if (enabledConfigs.length === 0) {
    managerRef.current.clear();
    return;
  }
  
  // ✅ 使用增量更新
  managerRef.current.updateIndicators(klineData, enabledConfigs);
}, [klineData, getEnabledIndicators]);
```

#### 方法 B：确保数据完整性（备选）

如果方法 A 仍有问题，可能是数据本身不完整。

**检查点**：
1. `loadMoreHistory` 后的 `allBarsWithIndicators` 是否包含所有指标
2. `setKlineData` 是否正确保存了所有数据
3. 渲染时传入的 `klineData` 是否完整

**调试日志**：

```typescript
// loadMoreHistory 中添加详细日志
console.log('[loadMoreHistory] 指标数据检查:', {
  新历史数据MACD: finalAdjustedBars.filter(b => b.indicators.macd).length,
  更新后当前数据MACD: updatedCurrentData.filter(b => b.indicators.macd).length,
  合并后MACD: allBarsWithIndicators.filter(b => b.indicators.macd).length,
});

// 渲染前添加检查
console.log('[渲染前检查]:', {
  总K线: klineData.length,
  有MACD的K线: klineData.filter(b => b.indicators.macd).length,
  MACD覆盖率: (klineData.filter(b => b.indicators.macd).length / klineData.length * 100).toFixed(2) + '%',
});
```

---

### 方案 2：限制 WebSocket 价格变化幅度

#### 修改 PriceGenerator

```typescript
// PriceGenerator.ts

/**
 * 生成K线更新数据（限制变化幅度）
 */
static generateUpdate(
  currentOpen: number,
  currentHigh: number,
  currentLow: number,
  currentVolume: number,
  trend: number,
  trendStrength: number
): Omit<KlineBar, 'time'> {
  const open = currentOpen;
  
  // ✅ 限制单次变化幅度：±0.5%
  const maxSingleMove = 0.005;  // 0.5%
  const trendMove = trend * trendStrength * 0.003;  // ±0.09% - ±0.21%
  const randomMove = (Math.random() - 0.5) * 0.006; // ±0.3%
  const rawTotalMove = trendMove + randomMove;
  
  // ✅ 限制在 ±0.5%
  const totalMove = Math.max(-maxSingleMove, Math.min(maxSingleMove, rawTotalMove));
  
  // ✅ 计算新的 close
  let close = open * (1 + totalMove);
  
  // ✅ 限制相对于 open 的总变化在 ±3%
  const maxTotalChange = 0.03;  // 3%
  const minClose = open * (1 - maxTotalChange);
  const maxClose = open * (1 + maxTotalChange);
  close = Math.max(minClose, Math.min(maxClose, close));
  
  // 更新 High 和 Low
  const volatility = 0.002 + Math.random() * 0.008;  // 减小波动
  const maxPrice = Math.max(open, close);
  const minPrice = Math.min(open, close);
  
  const newHigh = maxPrice * (1 + volatility * 0.5);
  const newLow = minPrice * (1 - volatility * 0.5);
  
  const high = Math.max(currentHigh, newHigh);
  const low = Math.min(currentLow, newLow);
  
  // 成交量
  const additionalVolume = (50 + Math.random() * 150) * (1 + Math.abs(totalMove) * 10);
  const volume = currentVolume + additionalVolume;
  
  return {
    open: Number(open.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    close: Number(close.toFixed(2)),
    volume: Number(volume.toFixed(2)),
  };
}

/**
 * 生成新的 K线（初始 bar）
 * ✅ 同样限制变化幅度
 */
static generate(
  prevClose: number,
  trend: number,
  trendStrength: number
): Omit<KlineBar, 'time'> {
  const open = prevClose;
  
  // ✅ 限制新 bar 的变化幅度：±1%
  const maxMove = 0.01;  // 1%
  const trendMove = trend * trendStrength * 0.005;
  const randomMove = (Math.random() - 0.5) * 0.01;
  const rawTotalMove = trendMove + randomMove;
  const totalMove = Math.max(-maxMove, Math.min(maxMove, rawTotalMove));
  
  const close = open * (1 + totalMove);
  
  // 其余逻辑不变...
  const volatility = 0.005 + Math.random() * 0.01;
  const maxPrice = Math.max(open, close);
  const minPrice = Math.min(open, close);
  
  const high = maxPrice * (1 + volatility);
  const low = minPrice * (1 - volatility);
  
  const baseVolume = 500 + Math.random() * 1500;
  const volume = baseVolume * (1 + Math.abs(totalMove) * 50);
  
  return {
    open: Number(open.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    close: Number(close.toFixed(2)),
    volume: Number(volume.toFixed(2)),
  };
}
```

**效果**：
- 单次更新变化：±0.5%
- 新 bar 变化：±1%
- 累积变化限制：±3%（相对于 open）

---

### 方案 3：时间坐标轴格式根据周期调整

#### 修改 useKlineChart

```typescript
// useKlineChart.ts

/**
 * 根据周期获取时间格式配置
 */
function getTimeFormatOptions(interval: KlineInterval) {
  switch (interval) {
    case '1m':
      return {
        timeVisible: true,
        secondsVisible: true,  // 显示秒数
        localization: {
          timeFormatter: (timestamp: number) => {
            const date = new Date(timestamp * 1000);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
          }
        }
      };
    
    case '5m':
    case '15m':
      return {
        timeVisible: true,
        secondsVisible: false,
        localization: {
          timeFormatter: (timestamp: number) => {
            const date = new Date(timestamp * 1000);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
          }
        }
      };
    
    case '1h':
    case '4h':
      return {
        timeVisible: true,
        secondsVisible: false,
        localization: {
          timeFormatter: (timestamp: number) => {
            const date = new Date(timestamp * 1000);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${month}-${day} ${hours}:${minutes}`;
          }
        }
      };
    
    case '1d':
    case '1w':
      return {
        timeVisible: true,
        secondsVisible: false,
        localization: {
          timeFormatter: (timestamp: number) => {
            const date = new Date(timestamp * 1000);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        }
      };
    
    default:
      return {
        timeVisible: true,
        secondsVisible: false,
      };
  }
}

// 在图表初始化时应用
useEffect(() => {
  if (!containerRef.current) return;
  
  const chart = createChart(containerRef.current, {
    width: containerRef.current.clientWidth,
    height: containerRef.current.clientHeight,
    layout: {
      background: { color: '#111827' },
      textColor: '#d1d5db',
    },
    grid: {
      vertLines: { color: '#1f2937' },
      horzLines: { color: '#1f2937' },
    },
    timeScale: {
      borderColor: '#1f2937',
      ...getTimeFormatOptions(interval),  // ✅ 动态时间格式
    },
  });
  
  // ...
}, []);

// 周期变化时更新时间格式
useEffect(() => {
  if (!chartRef.current) return;
  
  const timeFormatOptions = getTimeFormatOptions(interval);
  chartRef.current.applyOptions({
    timeScale: timeFormatOptions,
  });
  
  console.log('[useKlineChart] Time format updated for interval:', interval);
}, [interval]);
```

---

## 实施优先级

### 第 1 优先级：修复 MACD 不连续
- **方法**：先实施方法 A（增量更新）
- **如果失败**：添加详细日志，排查数据完整性
- **预期时间**：1-2 小时

### 第 2 优先级：限制价格变化幅度
- **方法**：修改 PriceGenerator
- **测试**：观察实时 K 线变化是否平滑
- **预期时间**：30 分钟

### 第 3 优先级：时间格式
- **方法**：添加动态时间格式配置
- **测试**：切换不同周期，观察时间轴
- **预期时间**：1 小时

---

## 测试验证

### 测试 1：MACD 连续性
1. 启用 MACD
2. 左滑 5 次加载历史数据
3. **检查**：MACD 线条是否连续，无断层
4. **日志**：查看"指标数据检查"和"渲染前检查"日志

### 测试 2：价格变化幅度
1. 启用实时 K 线
2. 观察 2-3 分钟
3. **检查**：价格变化是否在 ±3% 内
4. **计算**：记录 open 和最大/最小 close 的差值

### 测试 3：时间格式
1. 切换到 1m 周期 → 应显示 HH:mm:ss
2. 切换到 1h 周期 → 应显示 MM-DD HH:mm
3. 切换到 1d 周期 → 应显示 YYYY-MM-DD

---

## 潜在风险

### 风险 1：IndicatorManager 改动较大
- **影响**：可能引入新的 bug
- **缓解**：保留原 `renderIndicators` 方法，新增 `updateIndicators`

### 风险 2：时间格式兼容性
- **影响**：lightweight-charts 版本差异
- **缓解**：查阅官方文档，确认 API

### 风险 3：性能问题
- **影响**：增量更新可能不如完全重建高效
- **缓解**：添加性能监控，对比两种方法

---

## 回滚方案

如果修复出现问题：

1. **MACD 问题**：回退到只使用 `renderIndicators`
2. **价格问题**：恢复原 PriceGenerator 参数
3. **时间格式**：移除 `localization` 配置

每个修改都应该可以独立回滚。
