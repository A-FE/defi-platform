# K线图技术指标功能设计方案

## 一、需求分析

### 1.1 核心需求
为 K 线图增加常用技术指标功能，包括：
- **趋势类指标**：MA（移动平均线）、EMA（指数移动平均线）、BOLL（布林带）
- **动量类指标**：RSI（相对强弱指标）、MACD（指数平滑异同移动平均线）、KDJ（随机指标）
- **成交量指标**：VOL（成交量柱状图）
- **UI 交互**：指标开关、参数配置、多指标组合、颜色自定义

### 1.2 技术栈
- **图表库**：lightweight-charts 5.2.1
- **状态管理**：Zustand
- **计算库**：自研（纯函数计算，轻量级）
- **UI 框架**：React + TailwindCSS

## 二、架构设计

### 2.1 整体架构
```
UI 层（Chart Component）
    ↓
指标管理层（IndicatorStore + IndicatorManager）
    ↓
计算层（Indicator Calculators - 纯函数）
    ↓
数据层（KlineStore）
```

### 2.2 文件结构
```
defi-platform/
├── components/Chart/
│   ├── KlineChart.tsx                    # 主组件（已存在）
│   ├── ChartControls.tsx                 # 控制栏（已存在，需扩展）
│   ├── IndicatorPanel.tsx                # 新增：指标控制面板
│   ├── IndicatorConfigModal.tsx          # 新增：指标参数配置弹窗
│   └── hooks/
│       ├── useChartInit.ts               # 图表初始化（已存在）
│       ├── useKlineData.ts               # K线数据（已存在）
│       └── useIndicators.ts              # 新增：指标管理 Hook
│
├── services/indicators/
│   ├── calculators/
│   │   ├── MA.ts                         # 移动平均线计算
│   │   ├── EMA.ts                        # 指数移动平均线计算
│   │   ├── BOLL.ts                       # 布林带计算
│   │   ├── RSI.ts                        # RSI 计算
│   │   ├── MACD.ts                       # MACD 计算
│   │   ├── KDJ.ts                        # KDJ 计算
│   │   └── index.ts                      # 统一导出
│   │
│   ├── IndicatorManager.ts               # 指标管理器（协调计算和渲染）
│   └── index.ts
│
├── stores/indicators/
│   └── useIndicatorStore.ts              # 指标状态管理（配置、开关）
│
├── types/
│   └── indicator.ts                      # 新增：指标类型定义
│
└── constants/
    └── indicators.ts                     # 新增：指标默认配置
```

## 三、核心模块设计

### 3.1 类型定义 (`types/indicator.ts`)

```typescript
/**
 * 指标类型
 */
export type IndicatorType = 
  | 'MA'      // 移动平均线
  | 'EMA'     // 指数移动平均线
  | 'BOLL'    // 布林带
  | 'RSI'     // 相对强弱指标
  | 'MACD'    // 指数平滑异同移动平均线
  | 'KDJ'     // 随机指标
  | 'VOL';    // 成交量

/**
 * 指标显示位置
 */
export type IndicatorPosition = 'main' | 'sub';

/**
 * 指标配置
 */
export interface IndicatorConfig {
  type: IndicatorType;
  enabled: boolean;
  position: IndicatorPosition;
  params: Record<string, number>;
  colors: string[];
  visible: boolean;
}

/**
 * 指标计算结果（单值）
 */
export interface SingleIndicatorValue {
  time: number;
  value: number;
}

/**
 * 指标计算结果（多值，如 BOLL、MACD）
 */
export interface MultiIndicatorValue {
  time: number;
  values: Record<string, number>;
}

/**
 * 指标数据（用于渲染）
 */
export interface IndicatorData {
  type: IndicatorType;
  series: {
    name: string;
    data: SingleIndicatorValue[];
    color: string;
  }[];
}
```

### 3.2 计算器层（纯函数）

每个指标一个独立文件，纯函数实现，示例：

#### `services/indicators/calculators/MA.ts`
```typescript
import { KlineBar } from '@/types/market';
import { SingleIndicatorValue } from '@/types/indicator';

/**
 * 计算简单移动平均线（SMA）
 * @param bars K线数据
 * @param period 周期（默认 5, 10, 20, 30）
 * @returns 移动平均线数据
 */
export function calculateMA(
  bars: KlineBar[],
  period: number
): SingleIndicatorValue[] {
  const result: SingleIndicatorValue[] = [];

  for (let i = period - 1; i < bars.length; i++) {
    const sum = bars.slice(i - period + 1, i + 1)
      .reduce((acc, bar) => acc + bar.close, 0);
    
    result.push({
      time: bars[i].time,
      value: sum / period,
    });
  }

  return result;
}
```

#### `services/indicators/calculators/MACD.ts`
```typescript
/**
 * 计算 MACD
 * @param bars K线数据
 * @param fastPeriod 快线周期（默认 12）
 * @param slowPeriod 慢线周期（默认 26）
 * @param signalPeriod 信号线周期（默认 9）
 */
export function calculateMACD(
  bars: KlineBar[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MultiIndicatorValue[] {
  // EMA 计算
  const emaFast = calculateEMA(bars, fastPeriod);
  const emaSlow = calculateEMA(bars, slowPeriod);

  // DIF = EMA(12) - EMA(26)
  const dif: SingleIndicatorValue[] = [];
  for (let i = 0; i < Math.min(emaFast.length, emaSlow.length); i++) {
    dif.push({
      time: emaFast[i].time,
      value: emaFast[i].value - emaSlow[i].value,
    });
  }

  // DEA = EMA(DIF, 9)
  const dea = calculateEMAFromValues(dif, signalPeriod);

  // MACD = (DIF - DEA) * 2
  const macd: MultiIndicatorValue[] = [];
  for (let i = 0; i < Math.min(dif.length, dea.length); i++) {
    macd.push({
      time: dif[i].time,
      values: {
        dif: dif[i].value,
        dea: dea[i].value,
        macd: (dif[i].value - dea[i].value) * 2,
      },
    });
  }

  return macd;
}
```

### 3.3 指标管理器 (`services/indicators/IndicatorManager.ts`)

```typescript
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { KlineBar } from '@/types/market';
import { IndicatorConfig, IndicatorData } from '@/types/indicator';
import * as calculators from './calculators';

/**
 * 指标管理器
 * 职责：协调指标计算、创建图表系列、更新渲染
 */
export class IndicatorManager {
  private chart: IChartApi;
  private mainSeries: ISeriesApi<'Candlestick'>;
  
  // 指标系列映射（用于更新和销毁）
  private indicatorSeries: Map<string, ISeriesApi<'Line'>[]> = new Map();

  constructor(chart: IChartApi, mainSeries: ISeriesApi<'Candlestick'>) {
    this.chart = chart;
    this.mainSeries = mainSeries;
  }

  /**
   * 添加指标
   */
  addIndicator(config: IndicatorConfig, bars: KlineBar[]): void {
    const indicatorData = this.calculateIndicator(config, bars);
    this.renderIndicator(indicatorData, config);
  }

  /**
   * 移除指标
   */
  removeIndicator(type: string): void {
    const series = this.indicatorSeries.get(type);
    if (series) {
      series.forEach(s => this.chart.removeSeries(s));
      this.indicatorSeries.delete(type);
    }
  }

  /**
   * 更新指标（参数变化时）
   */
  updateIndicator(config: IndicatorConfig, bars: KlineBar[]): void {
    this.removeIndicator(config.type);
    this.addIndicator(config, bars);
  }

  /**
   * 计算指标数据
   */
  private calculateIndicator(
    config: IndicatorConfig,
    bars: KlineBar[]
  ): IndicatorData {
    switch (config.type) {
      case 'MA':
        return this.calculateMAData(bars, config);
      case 'MACD':
        return this.calculateMACDData(bars, config);
      // ... 其他指标
      default:
        throw new Error(`Unknown indicator: ${config.type}`);
    }
  }

  /**
   * 渲染指标到图表
   */
  private renderIndicator(data: IndicatorData, config: IndicatorConfig): void {
    const series: ISeriesApi<'Line'>[] = [];

    data.series.forEach((s) => {
      const lineSeries = this.chart.addLineSeries({
        color: s.color,
        lineWidth: 2,
        priceScaleId: config.position === 'main' ? 'right' : 'left',
      });

      lineSeries.setData(s.data);
      series.push(lineSeries);
    });

    this.indicatorSeries.set(data.type, series);
  }

  /**
   * 实时更新指标（新 K线到达时）
   */
  updateRealtimeBar(bar: KlineBar, configs: IndicatorConfig[]): void {
    // 获取最新的 N 根 K线（用于计算）
    const recentBars = this.getRecentBars(100);
    recentBars.push(bar);

    configs.forEach((config) => {
      if (!config.enabled) return;

      const indicatorData = this.calculateIndicator(config, recentBars);
      const series = this.indicatorSeries.get(config.type);

      if (series) {
        indicatorData.series.forEach((s, i) => {
          const lastPoint = s.data[s.data.length - 1];
          series[i].update(lastPoint);
        });
      }
    });
  }

  /**
   * 获取最近的 K线数据（从主系列）
   */
  private getRecentBars(count: number): KlineBar[] {
    // 从 mainSeries.data() 获取
    // 转换为 KlineBar 格式
    return [];
  }

  /**
   * 清空所有指标
   */
  clear(): void {
    this.indicatorSeries.forEach((series) => {
      series.forEach(s => this.chart.removeSeries(s));
    });
    this.indicatorSeries.clear();
  }
}
```

### 3.4 状态管理 (`stores/indicators/useIndicatorStore.ts`)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { IndicatorConfig, IndicatorType } from '@/types/indicator';
import { DEFAULT_INDICATOR_CONFIGS } from '@/constants/indicators';

interface IndicatorState {
  // 当前启用的指标配置
  configs: Record<IndicatorType, IndicatorConfig>;

  // 切换指标开关
  toggleIndicator: (type: IndicatorType) => void;

  // 更新指标参数
  updateParams: (type: IndicatorType, params: Record<string, number>) => void;

  // 更新指标颜色
  updateColors: (type: IndicatorType, colors: string[]) => void;

  // 重置为默认配置
  resetConfig: (type: IndicatorType) => void;

  // 获取启用的指标列表
  getEnabledIndicators: () => IndicatorConfig[];
}

export const useIndicatorStore = create<IndicatorState>()(
  persist(
    (set, get) => ({
      configs: DEFAULT_INDICATOR_CONFIGS,

      toggleIndicator: (type) => {
        set((state) => ({
          configs: {
            ...state.configs,
            [type]: {
              ...state.configs[type],
              enabled: !state.configs[type].enabled,
            },
          },
        }));
      },

      updateParams: (type, params) => {
        set((state) => ({
          configs: {
            ...state.configs,
            [type]: {
              ...state.configs[type],
              params: { ...state.configs[type].params, ...params },
            },
          },
        }));
      },

      updateColors: (type, colors) => {
        set((state) => ({
          configs: {
            ...state.configs,
            [type]: {
              ...state.configs[type],
              colors,
            },
          },
        }));
      },

      resetConfig: (type) => {
        set((state) => ({
          configs: {
            ...state.configs,
            [type]: DEFAULT_INDICATOR_CONFIGS[type],
          },
        }));
      },

      getEnabledIndicators: () => {
        const configs = get().configs;
        return Object.values(configs).filter((c) => c.enabled);
      },
    }),
    {
      name: 'indicator-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### 3.5 UI 组件

#### `IndicatorPanel.tsx`（指标控制面板）
```typescript
/**
 * 指标控制面板
 * 位置：图表右上角
 * 功能：
 *  - 显示已启用的指标列表
 *  - 快速开关指标
 *  - 打开配置弹窗
 */
export function IndicatorPanel() {
  const { configs, toggleIndicator } = useIndicatorStore();
  const [showConfig, setShowConfig] = useState(false);
  const [selectedType, setSelectedType] = useState<IndicatorType | null>(null);

  const handleConfigClick = (type: IndicatorType) => {
    setSelectedType(type);
    setShowConfig(true);
  };

  return (
    <div className="absolute top-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700 p-3">
      <div className="text-xs text-gray-400 mb-2">技术指标</div>
      
      <div className="space-y-1">
        {Object.values(configs).map((config) => (
          <div key={config.type} className="flex items-center gap-2">
            <button
              onClick={() => toggleIndicator(config.type)}
              className={`px-2 py-1 rounded text-xs ${
                config.enabled
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {config.type}
            </button>
            
            {config.enabled && (
              <button
                onClick={() => handleConfigClick(config.type)}
                className="text-gray-400 hover:text-white"
              >
                <SettingsIcon size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {showConfig && selectedType && (
        <IndicatorConfigModal
          type={selectedType}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}
```

#### `IndicatorConfigModal.tsx`（参数配置弹窗）
```typescript
/**
 * 指标参数配置弹窗
 * 功能：
 *  - 调整指标参数（如 MA 周期）
 *  - 自定义颜色
 *  - 预览效果
 */
export function IndicatorConfigModal({
  type,
  onClose,
}: {
  type: IndicatorType;
  onClose: () => void;
}) {
  const { configs, updateParams, updateColors, resetConfig } = useIndicatorStore();
  const config = configs[type];

  const [params, setParams] = useState(config.params);
  const [colors, setColors] = useState(config.colors);

  const handleSave = () => {
    updateParams(type, params);
    updateColors(type, colors);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">{type} 配置</h3>

        {/* 参数配置 */}
        <div className="space-y-3 mb-4">
          {Object.entries(params).map(([key, value]) => (
            <div key={key}>
              <label className="text-sm text-gray-400">{key}</label>
              <input
                type="number"
                value={value}
                onChange={(e) =>
                  setParams({ ...params, [key]: Number(e.target.value) })
                }
                className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
              />
            </div>
          ))}
        </div>

        {/* 颜色配置 */}
        <div className="mb-4">
          <label className="text-sm text-gray-400">颜色</label>
          <div className="flex gap-2 mt-2">
            {colors.map((color, i) => (
              <input
                key={i}
                type="color"
                value={color}
                onChange={(e) => {
                  const newColors = [...colors];
                  newColors[i] = e.target.value;
                  setColors(newColors);
                }}
                className="w-10 h-10 rounded cursor-pointer"
              />
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
          >
            保存
          </button>
          <button
            onClick={() => resetConfig(type)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            重置
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3.6 Hook 集成 (`useIndicators.ts`)

```typescript
import { useEffect, useRef } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useIndicatorStore } from '@/stores/indicators/useIndicatorStore';
import { IndicatorManager } from '@/services/indicators/IndicatorManager';
import { KlineBar } from '@/types/market';

/**
 * 指标管理 Hook
 * 职责：
 *  - 监听指标配置变化
 *  - 调用 IndicatorManager 渲染指标
 *  - 处理实时更新
 */
export function useIndicators(
  chartRef: React.RefObject<IChartApi | null>,
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>,
  bars: KlineBar[]
) {
  const managerRef = useRef<IndicatorManager | null>(null);
  const { configs, getEnabledIndicators } = useIndicatorStore();

  // 初始化 IndicatorManager
  useEffect(() => {
    if (chartRef.current && seriesRef.current) {
      managerRef.current = new IndicatorManager(
        chartRef.current,
        seriesRef.current
      );
    }

    return () => {
      managerRef.current?.clear();
    };
  }, [chartRef, seriesRef]);

  // 监听指标配置变化，重新渲染
  useEffect(() => {
    if (!managerRef.current || bars.length === 0) return;

    const enabledIndicators = getEnabledIndicators();

    // 清空旧指标
    managerRef.current.clear();

    // 添加新指标
    enabledIndicators.forEach((config) => {
      managerRef.current?.addIndicator(config, bars);
    });
  }, [configs, bars, getEnabledIndicators]);

  // 实时更新指标（在 useKlineData 的订阅回调中调用）
  const updateRealtimeIndicators = (bar: KlineBar) => {
    if (managerRef.current) {
      const enabledIndicators = getEnabledIndicators();
      managerRef.current.updateRealtimeBar(bar, enabledIndicators);
    }
  };

  return { updateRealtimeIndicators };
}
```

## 四、集成流程

### 4.1 修改 `KlineChart.tsx`
```typescript
export function KlineChart({ symbol, defaultInterval = '1h' }: KlineChartProps) {
  const { containerRef, chartRef, seriesRef } = useChartInit();
  const { interval, setInterval, isLoading, isLoadingMore } = useKlineData(...);
  
  // 新增：指标管理
  const bars = useKlineStore((state) => state.bars);
  const { updateRealtimeIndicators } = useIndicators(chartRef, seriesRef, bars);

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 rounded-lg border border-gray-800 p-4">
      <ChartControls interval={interval} onIntervalChange={setInterval} />

      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />
        
        {/* 新增：指标面板 */}
        <IndicatorPanel />

        {/* 加载状态 */}
        {isLoading && <LoadingSpinner />}
      </div>
    </div>
  );
}
```

### 4.2 修改 `useKlineData.ts`（实时更新部分）
```typescript
// 在订阅回调中增加指标更新
const unsubscribe = subscribeBars(symbol, newInterval, lastBar, (bar) => {
  if (seriesRef.current) {
    seriesRef.current.update({...});
    
    // 新增：更新指标
    updateRealtimeIndicators?.(bar);
  }
});
```

## 五、指标列表与默认配置

### 5.1 指标列表
| 指标 | 位置 | 参数 | 说明 |
|------|------|------|------|
| MA | 主图 | periods: [5, 10, 20, 30] | 移动平均线，多周期 |
| EMA | 主图 | periods: [7, 25, 99] | 指数移动平均线 |
| BOLL | 主图 | period: 20, stdDev: 2 | 布林带（上轨、中轨、下轨） |
| RSI | 副图 | period: 14 | 相对强弱指标 |
| MACD | 副图 | fast: 12, slow: 26, signal: 9 | MACD 柱状图 + DIF + DEA |
| KDJ | 副图 | period: 9, k: 3, d: 3 | 随机指标 |
| VOL | 副图 | - | 成交量柱状图 |

### 5.2 默认配置 (`constants/indicators.ts`)
```typescript
export const DEFAULT_INDICATOR_CONFIGS: Record<IndicatorType, IndicatorConfig> = {
  MA: {
    type: 'MA',
    enabled: false,
    position: 'main',
    params: { period1: 5, period2: 10, period3: 20, period4: 30 },
    colors: ['#00bcd4', '#ff9800', '#e91e63', '#9c27b0'],
    visible: true,
  },
  MACD: {
    type: 'MACD',
    enabled: false,
    position: 'sub',
    params: { fast: 12, slow: 26, signal: 9 },
    colors: ['#00bcd4', '#ff9800', '#4caf50'],
    visible: true,
  },
  // ... 其他指标
};
```

## 六、实现步骤（分 7 步）

### Step 1: 类型定义与常量（30分钟）
- 创建 `types/indicator.ts`
- 创建 `constants/indicators.ts`

### Step 2: 计算器层（90分钟）
- 实现 MA、EMA、BOLL 计算器（45分钟）
- 实现 RSI、MACD、KDJ 计算器（45分钟）

### Step 3: 指标管理器（60分钟）
- 创建 `IndicatorManager.ts`
- 实现添加、移除、更新逻辑
- 处理主图/副图渲染

### Step 4: 状态管理（30分钟）
- 创建 `useIndicatorStore.ts`
- 实现配置持久化

### Step 5: UI 组件（60分钟）
- 创建 `IndicatorPanel.tsx`（30分钟）
- 创建 `IndicatorConfigModal.tsx`（30分钟）

### Step 6: Hook 集成（45分钟）
- 创建 `useIndicators.ts`
- 修改 `useKlineData.ts`（实时更新）
- 修改 `KlineChart.tsx`（集成面板）

### Step 7: 测试与优化（45分钟）
- 测试各指标计算准确性
- 测试实时更新性能
- 测试多指标组合
- UI/UX 优化

**总计：约 6 小时**

## 七、技术难点与解决方案

### 7.1 副图渲染
**问题**：lightweight-charts 5.x 不原生支持多子图（副图）

**解决方案**：
1. **使用独立的 priceScaleId**：主图用 `right`，副图用 `left`
2. **调整 priceScale 范围**：为副图指标单独设置合适的价格范围
3. **可选方案**：创建两个独立的 chart 实例（主图 + 副图），垂直排列

```typescript
// 方案 1：共享 chart，使用不同 priceScale
const rsiSeries = chart.addLineSeries({
  priceScaleId: 'rsi',
  priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
});

chart.priceScale('rsi').applyOptions({
  scaleMargins: { top: 0.7, bottom: 0 }, // RSI 在图表下方 30% 区域
});

// 方案 2：独立副图 chart（推荐，更灵活）
const subChartContainer = document.createElement('div');
subChartContainer.style.height = '30%';
const subChart = createChart(subChartContainer, {...});
```

### 7.2 实时更新性能
**问题**：每次 K线更新都重新计算所有指标，性能开销大

**解决方案**：
1. **增量计算**：只计算最新一根 K线的指标值
2. **缓存机制**：缓存中间计算结果（如 EMA 的前一个值）
3. **节流优化**：对频繁更新的指标（1m 周期）进行节流

```typescript
// 增量计算示例（EMA）
class EMACalculator {
  private lastEMA: number | null = null;

  calculate(bars: KlineBar[], period: number): SingleIndicatorValue[] {
    // 全量计算（初次）
    if (this.lastEMA === null) {
      return this.fullCalculate(bars, period);
    }

    // 增量计算（实时更新）
    const newBar = bars[bars.length - 1];
    const multiplier = 2 / (period + 1);
    const newEMA = (newBar.close - this.lastEMA) * multiplier + this.lastEMA;
    this.lastEMA = newEMA;

    return [{ time: newBar.time, value: newEMA }];
  }
}
```

### 7.3 周期切换时的指标重置
**问题**：切换 K线周期时，指标需要重新计算，但 IndicatorManager 引用的是旧数据

**解决方案**：
- 在 `useKlineData.setInterval` 时，触发 `IndicatorManager.clear()` 并重新初始化

```typescript
const setInterval = useCallback(async (newInterval: KlineInterval) => {
  // 1. 清空旧指标
  managerRef.current?.clear();

  // 2. 切换周期，加载新数据
  await loadKlineData(newInterval);

  // 3. 重新渲染指标（通过 useEffect 自动触发）
}, [...]);
```

## 八、扩展性考虑

### 8.1 自定义指标
未来可支持用户自定义指标公式：
```typescript
interface CustomIndicator {
  name: string;
  formula: string; // 如 "SMA(close, 10) + 2 * STD(close, 10)"
  parser: (formula: string, bars: KlineBar[]) => SingleIndicatorValue[];
}
```

### 8.2 指标组合模板
预设常用指标组合，一键应用：
```typescript
const INDICATOR_TEMPLATES = {
  'trend': ['MA', 'BOLL', 'VOL'],
  'momentum': ['RSI', 'MACD', 'KDJ'],
  'full': ['MA', 'BOLL', 'RSI', 'MACD', 'VOL'],
};
```

### 8.3 指标信号提醒
当指标触发特定条件时（如 RSI > 70 超买），显示提醒：
```typescript
interface IndicatorAlert {
  type: IndicatorType;
  condition: (value: number) => boolean;
  message: string;
}

// 示例：RSI 超买提醒
{
  type: 'RSI',
  condition: (rsi) => rsi > 70,
  message: 'RSI 超买，注意风险',
}
```

## 九、测试计划

### 9.1 单元测试
- 每个计算器函数的准确性测试
- 边界条件测试（数据不足、参数异常）

### 9.2 集成测试
- 指标开关切换
- 参数配置修改后的重新渲染
- 周期切换时的指标重置
- 实时更新的连续性

### 9.3 性能测试
- 1000 根 K线 + 5 个指标的渲染时间（< 200ms）
- 实时更新频率（1m 周期，每秒更新）
- 内存占用监控

## 十、UI/UX 优化

### 10.1 视觉优化
- 指标线条区分：虚线、实线、粗细
- 颜色对比度：深色背景下的高对比配色
- MACD 柱状图：红绿区分（正负值）

### 10.2 交互优化
- 指标图例显示：鼠标悬停显示当前值
- 快捷键：快速开关指标（如 `M` 切换 MA）
- 移动端适配：指标面板折叠为抽屉

### 10.3 性能优化
- 懒加载计算：只计算可见区域的指标值
- Web Worker：将计算逻辑移到 Worker 线程（复杂指标）

## 十一、文档与示例

### 11.1 开发文档
- 如何添加新指标（计算器 + 配置）
- IndicatorManager API 文档

### 11.2 用户文档
- 各指标的含义和用法
- 参数配置说明

## 十二、总结

本方案采用**分层架构**：
- **计算层**：纯函数，易测试、易扩展
- **管理层**：统一协调，减少耦合
- **状态层**：持久化配置，提升体验
- **UI 层**：组件化，灵活组合

核心优势：
1. **轻量级**：无需引入重量级技术分析库
2. **高性能**：增量计算 + 缓存优化
3. **易扩展**：新增指标只需 3 步（计算器 + 配置 + 渲染逻辑）
4. **用户友好**：可视化配置 + 模板快捷应用

---

**预计工作量**：6 小时（核心功能）+ 2 小时（测试优化）= 8 小时
**优先级**：高（提升图表专业性和用户体验）
