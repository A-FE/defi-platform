# K 线图副图指标和 UI 改进方案

## 需求
1. **副图指标**：RSI、MACD、KDJ、VOL 显示在 K 线图下方（独立副图）
2. **UI 改进**：指标切换改为平铺按钮，放在周期选择器右侧

## 方案设计

### 方案 A：使用独立的副图 Chart 实例（推荐）

#### 优势
- ✅ 完全独立的价格轴和时间轴
- ✅ 副图可以单独缩放
- ✅ 更符合专业交易软件的体验
- ✅ lightweight-charts 原生支持

#### 劣势
- ❌ 需要维护多个 chart 实例
- ❌ 时间轴需要同步滚动

#### 实现架构
```
┌─────────────────────────────────────┐
│  周期选择 | 主图指标按钮              │
├─────────────────────────────────────┤
│                                     │
│  主图 Chart (K线 + MA/EMA/BOLL)     │  ← chartRef
│                                     │
├─────────────────────────────────────┤
│  副图 Chart (RSI/MACD/KDJ/VOL)      │  ← subChartRef
│                                     │
└─────────────────────────────────────┘
```

### 方案 B：使用同一 Chart 的不同 priceScale（当前方案）

#### 优势
- ✅ 实现简单，一个 chart 实例
- ✅ 自动时间轴对齐

#### 劣势
- ❌ 副图指标挤在主图下方，不够清晰
- ❌ 价格轴共享，副图指标可能被压缩
- ❌ 无法独立调整副图高度

---

## 推荐方案：方案 A（独立副图）

### 1. 文件结构
```
components/Chart/
├── KlineChart.tsx              [修改] 布局调整，添加副图容器
├── ChartControls.tsx           [修改] 合并周期和指标选择
├── IndicatorPanel.tsx          [删除] 不再使用浮动面板
├── IndicatorConfigModal.tsx    [保留] 参数配置弹窗
├── hooks/
│   ├── useChartInit.ts         [修改] 初始化主图和副图
│   ├── useSubChart.ts          [新增] 副图管理
│   └── useIndicators.ts        [修改] 支持主图/副图分离
```

### 2. 布局设计

#### 新的 KlineChart 布局
```tsx
<div className="w-full h-full flex flex-col">
  {/* 控制栏：周期 + 主图指标 + 副图指标 */}
  <ChartControls 
    interval={interval}
    onIntervalChange={setInterval}
  />

  {/* 主图容器 (70% 高度) */}
  <div className="flex-[7] relative">
    <div ref={mainChartRef} className="absolute inset-0" />
  </div>

  {/* 副图容器 (30% 高度，条件渲染) */}
  {hasSubIndicators && (
    <div className="flex-[3] relative border-t border-gray-700">
      <div ref={subChartRef} className="absolute inset-0" />
    </div>
  )}
</div>
```

#### 新的 ChartControls 布局
```tsx
<div className="flex items-center gap-6 mb-3 px-2">
  {/* 周期选择 */}
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-400">周期</span>
    {INTERVALS.map(int => <button>...</button>)}
  </div>

  {/* 分隔线 */}
  <div className="h-6 w-px bg-gray-700" />

  {/* 主图指标 */}
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-400">主图</span>
    <button>MA</button>
    <button>EMA</button>
    <button>BOLL</button>
  </div>

  {/* 分隔线 */}
  <div className="h-6 w-px bg-gray-700" />

  {/* 副图指标 */}
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-400">副图</span>
    <button>RSI</button>
    <button>MACD</button>
    <button>KDJ</button>
    <button>VOL</button>
  </div>

  {/* 右侧：参数配置图标 */}
  <div className="ml-auto">
    <button>⚙️</button>
  </div>
</div>
```

### 3. 核心实现

#### useSubChart Hook
```typescript
export function useSubChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: { background: { color: '#111827' } },
      // 副图专用配置
      timeScale: {
        visible: true,
        borderColor: '#1f2937',
      },
      rightPriceScale: {
        visible: true,
        borderColor: '#1f2937',
      },
    });

    chartRef.current = chart;

    return () => chart.remove();
  }, []);

  return { containerRef, chartRef };
}
```

#### 时间轴同步
```typescript
// 主图和副图的时间轴同步
useEffect(() => {
  if (!mainChartRef.current || !subChartRef.current) return;

  const mainTimeScale = mainChartRef.current.timeScale();
  const subTimeScale = subChartRef.current.timeScale();

  // 主图滚动时，副图同步
  const handleVisibleRangeChange = (range: any) => {
    subTimeScale.setVisibleRange(range);
  };

  mainTimeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

  return () => {
    mainTimeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
  };
}, [mainChartRef, subChartRef]);
```

#### IndicatorManager 改进
```typescript
export class IndicatorManager {
  private mainChart: IChartApi;
  private subChart: IChartApi | null;
  private mainSeries: ISeriesApi<'Candlestick'>;

  constructor(
    mainChart: IChartApi,
    mainSeries: ISeriesApi<'Candlestick'>,
    subChart?: IChartApi
  ) {
    this.mainChart = mainChart;
    this.mainSeries = mainSeries;
    this.subChart = subChart || null;
  }

  addIndicator(config: IndicatorConfig, bars: KlineBar[]): void {
    const chart = config.position === 'main' ? this.mainChart : this.subChart;
    
    if (!chart) {
      console.error('副图 chart 未初始化');
      return;
    }

    // 使用对应的 chart 渲染指标
    const indicatorData = this.calculateIndicator(config, bars);
    this.renderIndicator(indicatorData, config, chart);
  }

  private renderIndicator(
    data: IndicatorData,
    config: IndicatorConfig,
    chart: IChartApi
  ): void {
    // 在指定的 chart 上渲染
    data.series.forEach((s) => {
      const lineSeries = chart.addSeries(LineSeries, {
        color: s.color,
        lineWidth: 2,
      });
      lineSeries.setData(s.data);
    });
  }
}
```

### 4. 实现步骤

1. **Step 1**: 修改 `useChartInit.ts`，支持副图初始化
2. **Step 2**: 创建 `useSubChart.ts`，管理副图生命周期
3. **Step 3**: 修改 `ChartControls.tsx`，改为平铺按钮布局
4. **Step 4**: 修改 `KlineChart.tsx`，添加副图容器和布局
5. **Step 5**: 修改 `IndicatorManager.ts`，支持主图/副图分离渲染
6. **Step 6**: 删除 `IndicatorPanel.tsx`
7. **Step 7**: 实现时间轴同步逻辑
8. **Step 8**: 测试和优化

### 5. UI 示例

#### 按钮状态
- **未启用**: 灰色背景 `bg-gray-800`
- **已启用**: 紫色背景 `bg-purple-600`
- **悬停**: `hover:bg-gray-700` / `hover:bg-purple-700`

#### 响应式
- 宽屏：所有按钮平铺显示
- 窄屏：主图/副图指标折叠为下拉菜单

---

## 时间估算
- Step 1-2: 60分钟（副图初始化）
- Step 3: 45分钟（控制栏 UI 重构）
- Step 4: 30分钟（布局调整）
- Step 5: 45分钟（IndicatorManager 改进）
- Step 6-7: 30分钟（清理和同步逻辑）
- Step 8: 30分钟（测试）

**总计：约 4 小时**

---

## 最终效果预览

```
┌────────────────────────────────────────────────────────┐
│ 周期: 1m 5m [1h] 4h 1d | 主图: [MA] EMA BOLL | 副图: RSI [MACD] KDJ VOL ⚙️ │
├────────────────────────────────────────────────────────┤
│                                                        │
│               K 线图 + MA 指标线                        │
│                                                        │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│               MACD 副图指标                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

蓝色方括号 `[]` 表示已启用的选项。
