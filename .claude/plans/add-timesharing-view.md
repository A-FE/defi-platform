# 分时图实现方案

## 需求分析

"分时"作为一种特殊的周期类型，与 1m、5m、15m 等并列：
- 点击"分时"后，显示分时图（折线图，渲染收盘价）
- 保持主图、副图配置可见且可用
- 所有指标继续正常工作（基于分时数据计算）

## 架构设计

### 1. 周期类型扩展

将"分时"作为 `KlineInterval` 的一个特殊值：

```typescript
// types/market.ts
export type KlineInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | 'timesharing';
```

### 2. 状态管理

**无需新增状态**，复用现有的 `interval` 状态：
- 当 `interval === 'timesharing'` 时，使用 LineSeries
- 其他周期使用 CandlestickSeries

### 3. 系列切换逻辑

在 `useChartInit.ts` 或新的 hook 中监听 `interval` 变化，动态切换系列类型：

**判断逻辑**：
```typescript
const isTimesharing = interval === 'timesharing';
```

**系列切换**：
- 移除当前系列
- 根据 `isTimesharing` 创建对应类型的系列
- 重新设置数据

**seriesRef 类型**：
```typescript
seriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>
```

### 4. UI 层修改

#### ChartControls.tsx

**现有结构**：
```
[1m][5m][15m][1h][4h][1d][1w] | [主图指标] | [副图指标]
```

**修改后**：
```
[分时][1m][5m][15m][1h][4h][1d][1w] | [主图指标] | [副图指标]
  ↑ 作为第一个周期选项
```

**实现细节**：
- 在周期列表最前面添加"分时"选项
- 使用相同的按钮样式和选中逻辑
- 当 `interval === 'timesharing'` 时，"分时"按钮高亮

#### KlineChart.tsx

**无需修改**，复用现有的 interval 逻辑

### 5. 数据处理

**分时模式的数据加载**：
- `fetchKlines` 和 `subscribeBars` 仍然获取完整的 K线数据
- 在渲染时根据 `interval === 'timesharing'` 判断使用哪种系列
- **LineSeries 使用与 K线相同的数据格式**

**数据转换（保持格式一致）**：
```typescript
// LineSeries 也接受 OHLC 格式，将所有价格统一为收盘价
const timeShareData = klineData.map(bar => ({
  time: bar.time,
  open: bar.close,    // 使用收盘价
  high: bar.close,    // 使用收盘价
  low: bar.close,     // 使用收盘价
  close: bar.close,   // 收盘价
}));

// 或者更简单：直接使用原始数据，LineSeries 会自动使用 close 值渲染
```

**优势**：
- ✅ **无需数据格式转换**：LineSeries 和 CandlestickSeries 使用相同的数据结构
- ✅ **简化代码**：可以直接复用 `seriesRef.current.setData(klineData)`
- ✅ **指标计算**：完全不受影响，继续使用原始 K线数据

### 6. 图表样式配置

**LineSeries 配置**：
```typescript
{
  color: '#2962FF',
  lineWidth: 2,
  priceLineVisible: true,
  lastValueVisible: true,
}
```

### 7. 常量配置更新

#### constants/api.ts
```typescript
export const KLINE_INTERVALS: KlineInterval[] = ['timesharing', '1m', '5m', '15m', '1h', '4h', '1d', '1w'];

export const INTERVAL_LABELS: Record<KlineInterval, string> = {
  'timesharing': '分时',
  '1m': '1 分钟',
  // ... 其他周期
};
```

## 实施步骤

### Step 1: 类型定义
- [ ] 修改 `types/market.ts` 中的 `KlineInterval` 类型，新增 `'timesharing'`

### Step 2: 常量配置
- [ ] 更新 `constants/api.ts` 中的 `KLINE_INTERVALS` 数组，在最前面添加 `'timesharing'`
- [ ] 更新 `INTERVAL_LABELS`，添加分时的中文标签

### Step 3: 修改 useChartInit
- [ ] 修改 `seriesRef` 类型为 `ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null`
- [ ] 初始化时仍创建 CandlestickSeries（保持现有逻辑）

### Step 4: 新增系列切换 Hook
- [ ] 创建 `useSeriesTypeSwitch` hook
- [ ] 监听 `interval` 变化
- [ ] 当切换到/离开 `'timesharing'` 时，重建系列

### Step 5: 修改数据加载逻辑
- [ ] 在 `useKlineDataLoader` 中判断 `interval === 'timesharing'`
- [ ] 分时模式下，将 K线数据转换为折线数据后设置到 LineSeries
- [ ] 非分时模式，正常设置 K线数据到 CandlestickSeries

### Step 6: 修改 ChartControls
- [ ] 无需修改逻辑，只需确保遍历 `KLINE_INTERVALS` 时包含 `'timesharing'`
- [ ] 按钮文本使用 `INTERVAL_LABELS[interval]`

### Step 7: 处理 Mock 数据
- [ ] 确保 Mock 数据生成器支持 `'timesharing'` 周期
- [ ] 可以映射到 `'1m'` 数据作为分时数据源

### Step 8: 测试验证
- [ ] 切换到分时，显示折线图
- [ ] 指标正常计算和显示
- [ ] 切换回 K线，恢复蜡烛图
- [ ] WebSocket 实时更新正常工作

## 技术细节

### lightweight-charts v5 API 使用

**创建 LineSeries**：
```typescript
import { LineSeries } from 'lightweight-charts';
const lineSeries = chart.addSeries(LineSeries, options);
```

**移除系列**：
```typescript
chart.removeSeries(seriesRef.current);
```

### 状态保存方案

使用 `useState` 保存临时的指标配置：

```typescript
const [savedIndicatorConfigs, setSavedIndicatorConfigs] = 
  useState<Record<IndicatorType, IndicatorConfig> | null>(null);
```

### 性能考虑

- 切换模式时不重新加载数据，只切换系列类型
- 使用 `useMemo` 缓存转换后的分时数据
- 避免频繁的配置保存/恢复操作

## 测试要点

1. **模式切换**：K线 ↔ 分时切换流畅，无闪烁
2. **指标保持**：退出分时后，指标配置恢复到进入前的状态
3. **数据连续性**：切换模式不丢失数据，价格显示正确
4. **UI 响应**：按钮状态正确，禁用/启用逻辑准确
5. **周期互斥**：分时模式下，周期选择器应该禁用
6. **成交量显示**：分时模式下，成交量副图始终显示

## 边界情况

1. **首次进入分时**：如果用户没有启用任何指标，保存的配置为空
2. **快速切换**：防抖处理，避免频繁切换导致性能问题
3. **数据未加载**：分时模式下，等待数据加载完成后再渲染
4. **窗口调整**：切换模式后，图表应正确响应窗口大小变化

## 注意事项

1. **API 版本**：使用 lightweight-charts v5.x API，不要使用 v4 的字符串方式
2. **类型安全**：确保 TypeScript 类型定义准确，避免运行时错误
3. **状态一致性**：指标配置的保存/恢复要确保完整性
4. **用户体验**：提供清晰的视觉反馈，让用户知道当前处于哪种模式
