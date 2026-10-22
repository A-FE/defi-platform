# 多周期 RSI 指标实现计划

## 目标
实现多周期 RSI 指标（RSI 6、RSI 12、RSI 24），在同一个副图面板中显示 3 条不同颜色的 RSI 线，用于多时间框架分析。

## 当前状态分析

### 现有实现
1. **RSI 计算器** (`services/indicators/calculators/RSI.ts`)
   - ✅ 已实现单周期 RSI 计算
   - ✅ 使用标准 RSI 算法（平滑方法）
   - ✅ 返回 `SingleIndicatorValue[]` 格式

2. **IndicatorManager** (`services/indicators/IndicatorManager.ts`)
   - ✅ 已支持单周期 RSI 渲染（第 812-858 行）
   - ✅ 已添加超买/超卖参考线（70/30）
   - ✅ 使用 `LineSeries` 渲染

3. **配置定义** (`constants/indicators.ts`)
   - ❌ 当前 RSI 只有 `period: 14` 单个参数
   - ❌ 只有一个颜色配置

4. **数据结构** (`services/indicators/IndicatorManager.ts` 第 15 行)
   ```typescript
   rsi?: { rsi: number };  // 当前只支持单个值
   ```

### 参考实现模式
项目已有 **MA/EMA 多周期实现**，可以作为参考：
- MA: 支持 4 个周期 (5/10/20/30)
- 配置: `params: { period1: 5, period2: 10, period3: 20, period4: 30 }`
- 计算: `calculateMultiMA()` 返回 `Record<string, SingleIndicatorValue[]>`
- 存储: `ma?: Record<string, number>` (如 `{ ma5: xxx, ma10: xxx }`)
- 渲染: 循环创建多个 `LineSeries`

## 实现方案

### 方案选择：完全对齐 MA/EMA 模式
采用与 MA/EMA 相同的架构，确保一致性和可维护性。

### 涉及文件及修改点

#### 1. 类型定义 (`services/indicators/IndicatorManager.ts`)
**修改位置**: 第 15 行

```typescript
// 修改前
rsi?: { rsi: number };

// 修改后
rsi?: Record<string, number>;  // { rsi6: xxx, rsi12: xxx, rsi24: xxx }
```

#### 2. RSI 计算器 (`services/indicators/calculators/RSI.ts`)
**新增函数**: 参考 `MA.ts` 的 `calculateMultiMA`

```typescript
/**
 * 计算多周期 RSI
 * @param bars K线数据
 * @param periods 周期数组，如 [6, 12, 24]
 * @returns 多条 RSI 数据
 */
export function calculateMultiRSI(
  bars: KlineBar[],
  periods: number[],
): Record<string, SingleIndicatorValue[]> {
  const result: Record<string, SingleIndicatorValue[]> = {};
  
  periods.forEach((period) => {
    result[`RSI${period}`] = calculateRSI(bars, period);
  });
  
  return result;
}
```

#### 3. 指标元信息 (`constants/indicators.ts`)
**修改位置**: 第 61-73 行

```typescript
// 修改前
RSI: {
  type: 'RSI',
  name: 'RSI',
  description: '衡量价格变动速度和幅度，识别超买超卖',
  position: 'sub',
  defaultParams: {
    period: 14,
  },
  defaultColors: ['#2196f3'],
  paramLabels: {
    period: '周期',
  },
},

// 修改后
RSI: {
  type: 'RSI',
  name: 'RSI',
  description: '衡量价格变动速度和幅度，识别超买超卖',
  position: 'sub',
  defaultParams: {
    period1: 6,   // 短期
    period2: 12,  // 中期
    period3: 24,  // 长期
  },
  defaultColors: ['#2962FF', '#F23645', '#089981'],  // 蓝色、红色、绿色
  paramLabels: {
    period1: '短期',
    period2: '中期',
    period3: '长期',
  },
},
```

**同时修改**: 第 152-160 行的 `DEFAULT_INDICATOR_CONFIGS`

#### 4. IndicatorManager 计算逻辑
**修改位置**: `calculateSingleIndicator` 方法（第 339-349 行）

```typescript
// 修改前
case 'RSI': {
  const { period = 14 } = config.params;
  const rsiData = calculators.calculateRSI(bars, period);
  
  rsiData.forEach(({ time, value }) => {
    const index = result.findIndex(b => b.time === time);
    if (index >= 0) {
      result[index].indicators.rsi = { rsi: value };
    }
  });
  break;
}

// 修改后
case 'RSI': {
  const periods = Object.values(config.params);
  const rsiResult = calculators.calculateMultiRSI(bars, periods);
  
  // 合并到 result: result[i].indicators.rsi = { rsi6: xxx, rsi12: xxx, ... }
  Object.entries(rsiResult).forEach(([key, values]) => {
    values.forEach(({ time, value }) => {
      const index = result.findIndex(b => b.time === time);
      if (index >= 0) {
        if (!result[index].indicators.rsi) {
          result[index].indicators.rsi = {};
        }
        const rsiKey = key.toLowerCase(); // "RSI6" -> "rsi6"
        result[index].indicators.rsi[rsiKey] = value;
      }
    });
  });
  break;
}
```

#### 5. IndicatorManager 渲染逻辑
**修改位置**: `renderRSI` 方法（第 812-858 行）

完全重写，参考 `renderMA` 的实现（第 971-1010 行）：

```typescript
private renderRSI(bars: IndicatorKlineItem[], config: IndicatorConfig): void {
  const paneIndex = this.getOrCreatePane(config);
  
  if (!bars.some(bar => bar.indicators.rsi)) {
    console.warn('[IndicatorManager] No RSI data to render');
    return;
  }
  
  const series: ISeriesApi<'Line'>[] = [];
  const periods = Object.keys(config.params);
  
  periods.forEach((period, index) => {
    const rsiKey = `rsi${config.params[period]}`;
    const rsiData: LineData[] = [];
    
    bars.forEach((bar) => {
      if (bar.indicators.rsi && bar.indicators.rsi[rsiKey] !== undefined) {
        rsiData.push({
          time: bar.time as any,
          value: bar.indicators.rsi[rsiKey],
        });
      }
    });
    
    if (rsiData.length > 0) {
      const rsiSeries = this.chart.addSeries(LineSeries, {
        color: config.colors[index] || '#2962FF',
        lineWidth: 2,
        title: `RSI(${config.params[period]})`,
        priceLineVisible: false,
        lastValueVisible: false,
      }, paneIndex);
      rsiSeries.setData(rsiData);
      series.push(rsiSeries);
    }
  });
  
  // 只在第一条线上添加超买超卖参考线（避免重复）
  if (series.length > 0) {
    series[0].createPriceLine({
      price: 70,
      color: '#787B86',
      lineStyle: 2,
      lineWidth: 1,
      axisLabelVisible: true,
      title: '超买',
    });
    
    series[0].createPriceLine({
      price: 30,
      color: '#787B86',
      lineStyle: 2,
      lineWidth: 1,
      axisLabelVisible: true,
      title: '超卖',
    });
  }
  
  this.indicatorSeries.set('RSI', series);
  
  console.info(`[IndicatorManager] RSI rendered: ${series.length} lines on pane ${paneIndex}`);
}
```

#### 6. IndicatorManager 更新逻辑
**修改位置**: `updateRSIData` 方法（第 535-548 行）

完全重写，参考 `updateMAData` 的实现（第 605-628 行）：

```typescript
private updateRSIData(bars: IndicatorKlineItem[], series: ISeriesApi<any>[], config: IndicatorConfig): void {
  const periods = Object.keys(config.params);
  
  periods.forEach((period, index) => {
    const rsiSeries = series[index];
    if (!rsiSeries) return;
    
    const rsiKey = `rsi${config.params[period]}`;
    const rsiData: LineData[] = [];
    
    bars.forEach((bar) => {
      if (bar.indicators.rsi && bar.indicators.rsi[rsiKey] !== undefined) {
        rsiData.push({
          time: bar.time as any,
          value: bar.indicators.rsi[rsiKey],
        });
      }
    });
    
    if (rsiData.length > 0) {
      rsiSeries.setData(rsiData);
    }
  });
}
```

**注意**: 需要修改 `updateSeriesData` 方法（第 474 行）调用 `updateRSIData` 时传入 `config` 参数：

```typescript
case 'RSI':
  this.updateRSIData(bars, series, config);  // 添加 config 参数
  break;
```

#### 7. 导出新函数 (`services/indicators/calculators/index.ts`)

```typescript
export { calculateRSI, calculateMultiRSI } from './RSI';
```

## 实施步骤

1. **修改类型定义** - 更新 `IndicatorKlineItem` 接口
2. **新增计算函数** - 实现 `calculateMultiRSI`
3. **更新配置文件** - 修改 `INDICATOR_META` 和 `DEFAULT_INDICATOR_CONFIGS`
4. **修改计算逻辑** - 更新 `calculateSingleIndicator` 的 RSI case
5. **重写渲染逻辑** - 完全重写 `renderRSI` 方法
6. **修改更新逻辑** - 重写 `updateRSIData` 并修改调用签名
7. **导出新函数** - 更新 `calculators/index.ts`

## 验证计划

1. **功能验证**
   - 启用 RSI 指标，检查是否显示 3 条线
   - 验证颜色：RSI(6) 蓝色、RSI(12) 红色、RSI(24) 绿色
   - 检查超买/超卖参考线（70/30）是否正常显示

2. **性能验证**
   - 切换周期（1m/5m/15m），观察响应速度
   - 开关 RSI 指标，检查是否有延迟或闪烁

3. **数值验证**
   - 与 TradingView 对比 RSI(6)、RSI(12)、RSI(24) 的数值
   - 检查不同周期数据是否正确计算

4. **边界测试**
   - K 线数据不足时（< 24 根）的表现
   - 多次快速开关指标的稳定性

## 潜在风险

1. **向后兼容性**: 类型定义变更可能影响其他代码
   - **缓解措施**: RSI 是独立副图指标，影响范围小

2. **参考线重复**: 如果逻辑错误，可能创建 3 组参考线
   - **缓解措施**: 只在第一条线上创建参考线

3. **性能影响**: 计算量增加到 3 倍
   - **缓解措施**: 项目已有缓存和增量更新机制

## 预期结果

- 3 条不同颜色的 RSI 线同时显示在副图面板
- 保持超买/超卖参考线（70/30）
- 图例显示 RSI(6)、RSI(12)、RSI(24)
- 性能无明显下降
- 与 MA/EMA 多周期实现保持一致的代码风格
