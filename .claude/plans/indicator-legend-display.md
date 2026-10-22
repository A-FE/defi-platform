# 副图指标标题和数值显示实现计划

## 目标

在每个副图（RSI、MACD、KDJ、VOL）的左上角显示：
- 指标标题（如 "RSI 6"）
- 当前实时数值（如 "32.70"）

参考截图中的效果：
```
成交量(Volume) SMA  137
RSI 6  32.70
```

## Lightweight Charts v5 实现方案

### 方案分析

Lightweight Charts v5 **不提供内置的图例组件**，需要使用以下方案之一：

#### 方案 A: HTML 覆盖层（推荐）
- 在图表容器上层叠 HTML 元素显示图例
- 通过 `subscribeCrosshairMove` API 监听十字线移动事件
- 实时更新当前价格数值

**优点**：
- 灵活度高，样式完全可控
- 性能好，不影响图表渲染
- 支持复杂布局和交互

**缺点**：
- 需要手动管理位置和更新逻辑
- 需要同步多个指标的状态

#### 方案 B: 使用 series.applyOptions({ title })
- 利用系列的 `title` 选项显示标题
- 但**只显示静态标题**，无法显示实时数值

**缺点**：
- 无法显示实时数值
- 不符合需求

## 实施方案：HTML 覆盖层 + crosshairMove 事件

### 架构设计

```
KlineChart.tsx
  └─ useKlineChart()
       ├─ useChartInit() → chartRef
       ├─ useIndicatorRenderer() → 渲染指标
       └─ useIndicatorLegend() → 🆕 管理图例显示
            ├─ 监听 crosshairMove 事件
            ├─ 计算每个指标的当前值
            └─ 更新图例 HTML
```

### 涉及文件

1. **新增 Hook**: `components/Chart/hooks/useIndicatorLegend.ts`
   - 监听 crosshairMove 事件
   - 维护每个指标的当前值状态
   - 返回图例数据供组件渲染

2. **新增组件**: `components/Chart/IndicatorLegend.tsx`
   - 渲染图例 HTML
   - 绝对定位覆盖在图表上方
   - 支持多个副图的图例显示

3. **修改**: `components/Chart/hooks/useKlineChart.ts`
   - 集成 `useIndicatorLegend` Hook

4. **修改**: `components/Chart/KlineChart.tsx`
   - 添加 `<IndicatorLegend />` 组件

### 数据结构

```typescript
// 图例数据项
interface LegendItem {
  indicator: IndicatorType;
  title: string;           // "RSI 6", "MACD DIF"
  value: string | number;  // "32.70", 137
  color: string;           // 线条颜色
  paneIndex: number;       // 所在面板索引
}

// Hook 返回值
interface IndicatorLegendData {
  legends: LegendItem[];
}
```

### 实现细节

#### 1. useIndicatorLegend Hook

```typescript
export function useIndicatorLegend(
  chartRef: React.RefObject<IChartApi | null>,
  enabledIndicators: IndicatorConfig[]
) {
  const [legends, setLegends] = useState<LegendItem[]>([]);
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    const chart = chartRef.current;
    
    // 订阅十字线移动事件
    const unsubscribe = chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setLegends([]);
        return;
      }
      
      const newLegends: LegendItem[] = [];
      
      // 遍历启用的指标
      enabledIndicators.forEach(config => {
        if (config.type === 'RSI') {
          // 处理多周期 RSI
          Object.keys(config.params).forEach((periodKey, index) => {
            const period = config.params[periodKey];
            const value = extractRSIValue(param, period); // 从 param 中提取值
            
            newLegends.push({
              indicator: 'RSI',
              title: `RSI ${period}`,
              value: value?.toFixed(2) || '--',
              color: config.colors[index],
              paneIndex: getPaneIndex(config.type), // 获取面板索引
            });
          });
        }
        // ... 处理其他指标 (MACD, KDJ, VOL)
      });
      
      setLegends(newLegends);
    });
    
    return () => {
      unsubscribe();
    };
  }, [chartRef, enabledIndicators]);
  
  return { legends };
}
```

#### 2. IndicatorLegend 组件

```tsx
interface IndicatorLegendProps {
  legends: LegendItem[];
}

export function IndicatorLegend({ legends }: IndicatorLegendProps) {
  // 按 paneIndex 分组
  const groupedByPane = legends.reduce((acc, item) => {
    if (!acc[item.paneIndex]) {
      acc[item.paneIndex] = [];
    }
    acc[item.paneIndex].push(item);
    return acc;
  }, {} as Record<number, LegendItem[]>);
  
  return (
    <>
      {Object.entries(groupedByPane).map(([paneIndex, items]) => (
        <div
          key={paneIndex}
          className="absolute left-2 top-2 flex gap-4 text-xs pointer-events-none"
          style={{ 
            top: calculatePaneOffset(Number(paneIndex)) // 根据面板索引计算偏移
          }}
        >
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <span style={{ color: item.color }}>{item.title}</span>
              <span className="text-white font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
```

### 关键问题

#### 问题 1: 如何从 crosshairMove 事件中提取指标值？

Lightweight Charts 的 `param.seriesData` 只包含**系列数据**，但我们的指标数据存储在 `IndicatorKlineItem` 中。

**解决方案**：
- 在 `IndicatorManager` 中维护一个**时间 → 指标数据的映射表**
- Hook 通过该映射表查询当前时间点的指标值

```typescript
// IndicatorManager 新增
private dataCache: Map<number, IndicatorKlineItem> = new Map();

public updateIndicators(fullBars, displayBars, configs) {
  // ... 现有逻辑
  
  // 更新缓存
  this.dataCache.clear();
  fullBars.forEach(bar => {
    this.dataCache.set(bar.time, bar);
  });
}

public getIndicatorValue(time: number, type: IndicatorType): any {
  const bar = this.dataCache.get(time);
  return bar?.indicators[type.toLowerCase()];
}
```

#### 问题 2: 如何计算副图的垂直偏移？

每个副图的高度和位置由 Lightweight Charts 动态管理。

**解决方案**：
- 使用 `chart.panes()` API 获取所有面板信息
- 计算每个 pane 的累积高度

```typescript
function calculatePaneOffset(paneIndex: number, chart: IChartApi): number {
  const panes = chart.panes();
  let offset = 0;
  
  for (let i = 0; i < paneIndex && i < panes.length; i++) {
    offset += panes[i].height();
  }
  
  return offset + 8; // 加上 padding
}
```

#### 问题 3: 如何获取指标所在的 paneIndex？

IndicatorManager 已经维护了 `indicatorPanes: Map<string, number>`。

**解决方案**：
- 在 Hook 中访问 `managerRef.current.indicatorPanes`
- 或在 IndicatorManager 中新增 `getPaneIndex(type)` 方法

```typescript
// IndicatorManager 新增
public getPaneIndex(type: IndicatorType): number {
  return this.indicatorPanes.get(type) || 0;
}
```

### 实施步骤

1. **扩展 IndicatorManager**
   - 新增 `dataCache` 缓存时间 → 数据映射
   - 新增 `getIndicatorValue(time, type)` 方法
   - 新增 `getPaneIndex(type)` 方法

2. **创建 useIndicatorLegend Hook**
   - 订阅 `crosshairMove` 事件
   - 从 `managerRef` 查询指标值
   - 返回格式化的图例数据

3. **创建 IndicatorLegend 组件**
   - 接收图例数据数组
   - 按 paneIndex 分组渲染
   - 绝对定位到各个副图左上角

4. **集成到 KlineChart**
   - 在 `useKlineChart` 中调用 `useIndicatorLegend`
   - 在 JSX 中渲染 `<IndicatorLegend />`

### 样式设计

```tsx
<div className="absolute left-2 top-2 z-10 flex gap-4 text-xs pointer-events-none">
  {/* RSI 面板 */}
  <div className="flex items-center gap-1">
    <span className="text-blue-400">RSI 6</span>
    <span className="text-white font-medium">32.70</span>
  </div>
  <div className="flex items-center gap-1">
    <span className="text-red-400">RSI 12</span>
    <span className="text-white font-medium">45.20</span>
  </div>
  <div className="flex items-center gap-1">
    <span className="text-green-400">RSI 24</span>
    <span className="text-white font-medium">58.90</span>
  </div>
</div>
```

### 性能优化

1. **防抖更新**：crosshairMove 事件频率很高，使用 `requestAnimationFrame` 限制更新
2. **memo 组件**：使用 `React.memo` 避免不必要的重渲染
3. **选择性订阅**：只订阅启用的指标

### 预期效果

```
┌─────────────────────────────────────┐
│ 成交量(Volume) SMA  137             │  ← HTML 覆盖层
│ ████████████████████████████████    │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ RSI 6 32.70  RSI 12 45.20  RSI 24 58│  ← HTML 覆盖层
│ ╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲      │
└─────────────────────────────────────┘
```

## 替代方案（如果 HTML 覆盖层复杂）

使用 **Lightweight Charts 的 PriceScale labels**：
- 在右侧 Y 轴显示当前值
- 但无法显示标题，不符合"左上角"需求

## 总结

推荐使用 **HTML 覆盖层 + crosshairMove 事件** 方案：
- 灵活可控
- 符合需求
- 性能良好
- 易于维护
