# DeFi 交易平台重构详细设计

本文档提供各重构项的详细技术设计和实施步骤。

---

## 重构 1: 拆分 IndicatorManager

### 目标
将 1242 行的 `IndicatorManager` 拆分为 4 个独立模块，遵循单一职责原则。

### 新目录结构

```
services/indicators/
├── core/
│   ├── IndicatorCalculator.ts      # 纯计算层（无副作用）
│   ├── IndicatorCache.ts            # 缓存管理
│   └── calculators/                 # 各指标计算器（已存在）
│       ├── ma.ts
│       ├── ema.ts
│       ├── boll.ts
│       ├── rsi.ts
│       ├── macd.ts
│       ├── kdj.ts
│       └── index.ts
├── rendering/
│   ├── IndicatorRenderer.ts         # 渲染层（操作 chart API）
│   ├── PaneManager.ts               # Pane 生命周期管理
│   ├── renderers/                   # 各指标渲染器
│   │   ├── BaseRenderer.ts          # 基础渲染器接口
│   │   ├── MARenderer.ts
│   │   ├── EMARenderer.ts
│   │   ├── BOLLRenderer.ts
│   │   ├── RSIRenderer.ts
│   │   ├── MACDRenderer.ts
│   │   ├── KDJRenderer.ts
│   │   ├── VOLRenderer.ts
│   │   └── index.ts
│   └── index.ts
├── IndicatorOrchestrator.ts         # 协调器（对外接口）
├── types.ts                         # 类型定义
└── index.ts
```

---

### 模块 1: IndicatorCalculator（计算层）

**职责**: 纯计算逻辑，无副作用，易于测试

```typescript
// services/indicators/core/IndicatorCalculator.ts

import { KlineBar } from '@/types/market';
import { IndicatorConfig, IndicatorType, IndicatorDataPoint } from '../types';
import * as calculators from './calculators';

/**
 * 指标计算器（纯函数，无副作用）
 * 职责：接收 KlineBar[]，返回指标数据
 * 
 * ✅ 优势：
 * 1. 纯函数，易于测试（无需 chart 实例）
 * 2. 可以独立使用（Web Worker 中计算）
 * 3. 性能优化空间大（缓存、增量计算）
 */
export class IndicatorCalculator {
  /**
   * 计算单个指标
   * @param bars 原始 K线数据
   * @param config 指标配置
   * @returns 指标数据数组
   */
  calculate(
    bars: KlineBar[],
    config: IndicatorConfig
  ): IndicatorDataPoint[] {
    try {
      switch (config.type) {
        case 'MA':
          return this.calculateMA(bars, config.params);
        case 'EMA':
          return this.calculateEMA(bars, config.params);
        case 'BOLL':
          return this.calculateBOLL(bars, config.params);
        case 'RSI':
          return this.calculateRSI(bars, config.params);
        case 'MACD':
          return this.calculateMACD(bars, config.params);
        case 'KDJ':
          return this.calculateKDJ(bars, config.params);
        case 'VOL':
          return this.calculateVOL(bars);
        default:
          throw new Error(`Unknown indicator type: ${config.type}`);
      }
    } catch (error) {
      console.error(`[IndicatorCalculator] Failed to calculate ${config.type}:`, error);
      return [];
    }
  }

  /**
   * 批量计算多个指标
   * @param bars 原始 K线数据
   * @param configs 指标配置列表
   * @returns Map<指标类型, 指标数据>
   */
  calculateBatch(
    bars: KlineBar[],
    configs: IndicatorConfig[]
  ): Map<IndicatorType, IndicatorDataPoint[]> {
    const result = new Map<IndicatorType, IndicatorDataPoint[]>();
    
    configs.forEach(config => {
      const data = this.calculate(bars, config);
      result.set(config.type, data);
    });
    
    return result;
  }

  // ==================== 各指标计算方法 ====================

  private calculateMA(bars: KlineBar[], params: Record<string, number>): IndicatorDataPoint[] {
    const periods = Object.values(params);
    const result = calculators.calculateMultiMA(bars, periods);
    
    // 转换为统一的 IndicatorDataPoint 格式
    const dataPoints: IndicatorDataPoint[] = [];
    
    bars.forEach((bar, index) => {
      const values: Record<string, number> = {};
      
      Object.entries(result).forEach(([key, lineData]) => {
        const point = lineData.find(d => d.time === bar.time);
        if (point) {
          values[key.toLowerCase()] = point.value;
        }
      });
      
      if (Object.keys(values).length > 0) {
        dataPoints.push({
          time: bar.time,
          values,
        });
      }
    });
    
    return dataPoints;
  }

  private calculateEMA(bars: KlineBar[], params: Record<string, number>): IndicatorDataPoint[] {
    const periods = Object.values(params);
    const result = calculators.calculateMultiEMA(bars, periods);
    
    const dataPoints: IndicatorDataPoint[] = [];
    
    bars.forEach(bar => {
      const values: Record<string, number> = {};
      
      Object.entries(result).forEach(([key, lineData]) => {
        const point = lineData.find(d => d.time === bar.time);
        if (point) {
          values[key.toLowerCase()] = point.value;
        }
      });
      
      if (Object.keys(values).length > 0) {
        dataPoints.push({
          time: bar.time,
          values,
        });
      }
    });
    
    return dataPoints;
  }

  private calculateBOLL(bars: KlineBar[], params: Record<string, number>): IndicatorDataPoint[] {
    const { period = 20, stdDev = 2 } = params;
    const result = calculators.calculateBOLL(bars, period, stdDev);
    
    return result.map(item => ({
      time: item.time,
      values: {
        upper: item.values.upper,
        middle: item.values.middle,
        lower: item.values.lower,
      },
    }));
  }

  private calculateRSI(bars: KlineBar[], params: Record<string, number>): IndicatorDataPoint[] {
    const periods = Object.values(params);
    const result = calculators.calculateMultiRSI(bars, periods);
    
    const dataPoints: IndicatorDataPoint[] = [];
    
    bars.forEach(bar => {
      const values: Record<string, number> = {};
      
      Object.entries(result).forEach(([key, lineData]) => {
        const point = lineData.find(d => d.time === bar.time);
        if (point) {
          values[key.toLowerCase()] = point.value;
        }
      });
      
      if (Object.keys(values).length > 0) {
        dataPoints.push({
          time: bar.time,
          values,
        });
      }
    });
    
    return dataPoints;
  }

  private calculateMACD(bars: KlineBar[], params: Record<string, number>): IndicatorDataPoint[] {
    const { fast = 12, slow = 26, signal = 9 } = params;
    const result = calculators.calculateMACD(bars, fast, slow, signal);
    
    return result.map(item => ({
      time: item.time,
      values: {
        dif: item.values.dif,
        dea: item.values.dea,
        macd: item.values.macd,
      },
    }));
  }

  private calculateKDJ(bars: KlineBar[], params: Record<string, number>): IndicatorDataPoint[] {
    const { period = 9, k = 3, d = 3 } = params;
    const result = calculators.calculateKDJ(bars, period, k, d);
    
    return result.map(item => ({
      time: item.time,
      values: {
        k: item.values.k,
        d: item.values.d,
        j: item.values.j,
      },
    }));
  }

  private calculateVOL(bars: KlineBar[]): IndicatorDataPoint[] {
    // VOL 直接使用 K线的 volume 字段
    return bars
      .filter(bar => bar.volume !== undefined)
      .map(bar => ({
        time: bar.time,
        values: {
          volume: bar.volume,
          color: bar.close >= bar.open ? 'up' : 'down',
        },
      }));
  }
}
```

---

### 模块 2: IndicatorCache（缓存层）

**职责**: 缓存指标计算结果，减少重复计算

```typescript
// services/indicators/core/IndicatorCache.ts

import { IndicatorConfig, IndicatorType, IndicatorDataPoint } from '../types';

interface CacheEntry {
  data: IndicatorDataPoint[];
  barsHash: string;      // K线数据的哈希值
  timestamp: number;     // 缓存时间
}

/**
 * 指标数据缓存（减少重复计算）
 * 
 * 缓存策略：
 * 1. Key: symbol + interval + indicatorType + params
 * 2. 验证: barsHash（K线数据变化时失效）
 * 3. 过期: 60 秒（实时数据场景）
 */
export class IndicatorCache {
  private cache = new Map<string, CacheEntry>();
  private ttl = 60000; // 缓存有效期：60 秒

  /**
   * 获取缓存 Key
   */
  private getCacheKey(
    symbol: string,
    interval: string,
    type: IndicatorType,
    params: Record<string, any>
  ): string {
    const paramsStr = JSON.stringify(params, Object.keys(params).sort());
    return `${symbol}_${interval}_${type}_${paramsStr}`;
  }

  /**
   * 获取缓存数据
   * @returns 缓存的指标数据，如果过期或不存在则返回 null
   */
  get(
    symbol: string,
    interval: string,
    config: IndicatorConfig,
    barsHash: string  // K线数据的哈希值，用于检测数据是否变化
  ): IndicatorDataPoint[] | null {
    const key = this.getCacheKey(symbol, interval, config.type, config.params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 数据变化，缓存失效
    if (entry.barsHash !== barsHash) {
      this.cache.delete(key);
      return null;
    }

    // 过期检查
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.info(`[IndicatorCache] Hit: ${key}`);
    return entry.data;
  }

  /**
   * 设置缓存
   */
  set(
    symbol: string,
    interval: string,
    config: IndicatorConfig,
    barsHash: string,
    data: IndicatorDataPoint[]
  ): void {
    const key = this.getCacheKey(symbol, interval, config.type, config.params);
    
    this.cache.set(key, {
      data,
      barsHash,
      timestamp: Date.now(),
    });
    
    console.info(`[IndicatorCache] Set: ${key}, data points: ${data.length}`);
  }

  /**
   * 清空指定 symbol 的缓存
   */
  clear(symbol?: string): void {
    if (!symbol) {
      this.cache.clear();
      console.info('[IndicatorCache] Cleared all');
      return;
    }
    
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(symbol)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.info(`[IndicatorCache] Cleared ${keysToDelete.length} entries for ${symbol}`);
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * 设置缓存过期时间
   */
  setTTL(ttl: number): void {
    this.ttl = ttl;
  }
}

/**
 * 计算 K线数据的哈希值（用于缓存验证）
 */
export function hashBars(bars: any[]): string {
  if (bars.length === 0) {
    return '0';
  }
  
  // 使用长度 + 最后一根 K线的关键字段生成哈希
  const lastBar = bars[bars.length - 1];
  return `${bars.length}_${lastBar.time}_${lastBar.close}_${lastBar.volume}`;
}
```

---

### 模块 3: IndicatorRenderer（渲染层）

**职责**: 操作 Lightweight Charts API，创建和更新 Series

```typescript
// services/indicators/rendering/IndicatorRenderer.ts

import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { IndicatorConfig, IndicatorType, IndicatorDataPoint } from '../types';
import { PaneManager } from './PaneManager';
import { BaseRenderer } from './renderers/BaseRenderer';
import {
  MARenderer,
  EMARenderer,
  BOLLRenderer,
  RSIRenderer,
  MACDRenderer,
  KDJRenderer,
  VOLRenderer,
} from './renderers';

/**
 * 指标渲染器（操作 chart API）
 * 职责：接收指标数据，创建/更新 Series
 */
export class IndicatorRenderer {
  private chart: IChartApi;
  private paneManager: PaneManager;
  private renderers: Map<IndicatorType, BaseRenderer>;

  constructor(chart: IChartApi) {
    this.chart = chart;
    this.paneManager = new PaneManager(chart);
    
    // 注册各指标的渲染器（策略模式）
    this.renderers = new Map([
      ['MA', new MARenderer(chart, this.paneManager)],
      ['EMA', new EMARenderer(chart, this.paneManager)],
      ['BOLL', new BOLLRenderer(chart, this.paneManager)],
      ['RSI', new RSIRenderer(chart, this.paneManager)],
      ['MACD', new MACDRenderer(chart, this.paneManager)],
      ['KDJ', new KDJRenderer(chart, this.paneManager)],
      ['VOL', new VOLRenderer(chart, this.paneManager)],
    ]);
  }

  /**
   * 渲染单个指标（创建 Series）
   */
  render(
    type: IndicatorType,
    data: IndicatorDataPoint[],
    config: IndicatorConfig
  ): ISeriesApi[] {
    const renderer = this.renderers.get(type);
    if (!renderer) {
      throw new Error(`No renderer for ${type}`);
    }

    console.info(`[IndicatorRenderer] Rendering ${type}, data points: ${data.length}`);
    return renderer.render(data, config);
  }

  /**
   * 更新指标数据（不重建 Series）
   */
  update(
    type: IndicatorType,
    data: IndicatorDataPoint[]
  ): void {
    const renderer = this.renderers.get(type);
    if (!renderer) {
      console.warn(`[IndicatorRenderer] No renderer for ${type}`);
      return;
    }

    renderer.update(data);
  }

  /**
   * 移除指标
   */
  remove(type: IndicatorType): void {
    const renderer = this.renderers.get(type);
    if (!renderer) {
      return;
    }

    console.info(`[IndicatorRenderer] Removing ${type}`);
    renderer.destroy();
    this.paneManager.removePaneIfEmpty(type);
  }

  /**
   * 检查指标是否已渲染
   */
  hasRenderer(type: IndicatorType): boolean {
    const renderer = this.renderers.get(type);
    return renderer ? renderer.isRendered() : false;
  }

  /**
   * 清空所有指标
   */
  clear(): void {
    console.info('[IndicatorRenderer] Clearing all indicators');
    
    this.renderers.forEach(renderer => {
      renderer.destroy();
    });
    
    this.paneManager.clear();
  }

  /**
   * 获取 Pane 管理器（供外部使用）
   */
  getPaneManager(): PaneManager {
    return this.paneManager;
  }
}
```

---

### 模块 4: BaseRenderer（渲染器基类）

```typescript
// services/indicators/rendering/renderers/BaseRenderer.ts

import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { IndicatorConfig, IndicatorDataPoint } from '../../types';
import { PaneManager } from '../PaneManager';

/**
 * 指标渲染器基类（策略模式）
 * 
 * 子类职责：
 * 1. 实现 render(): 创建 Series 并渲染数据
 * 2. 实现 update(): 更新 Series 数据
 * 3. 可选实现 destroy(): 自定义清理逻辑
 */
export abstract class BaseRenderer {
  protected chart: IChartApi;
  protected paneManager: PaneManager;
  protected series: ISeriesApi[] = [];
  protected rendered = false;

  constructor(chart: IChartApi, paneManager: PaneManager) {
    this.chart = chart;
    this.paneManager = paneManager;
  }

  /**
   * 渲染指标（创建 Series）
   * @param data 指标数据
   * @param config 指标配置
   * @returns 创建的 Series 列表
   */
  abstract render(data: IndicatorDataPoint[], config: IndicatorConfig): ISeriesApi[];

  /**
   * 更新指标数据（不重建 Series）
   * @param data 新的指标数据
   */
  abstract update(data: IndicatorDataPoint[]): void;

  /**
   * 检查是否已渲染
   */
  isRendered(): boolean {
    return this.rendered;
  }

  /**
   * 销毁渲染器（移除 Series）
   */
  destroy(): void {
    this.series.forEach(s => {
      try {
        this.chart.removeSeries(s);
      } catch (error) {
        console.warn('[BaseRenderer] Failed to remove series:', error);
      }
    });
    
    this.series = [];
    this.rendered = false;
  }
}
```

---

### 示例渲染器: MACDRenderer

```typescript
// services/indicators/rendering/renderers/MACDRenderer.ts

import { LineSeries, HistogramSeries, LineData, HistogramData, Time } from 'lightweight-charts';
import { BaseRenderer } from './BaseRenderer';
import { IndicatorConfig, IndicatorDataPoint } from '../../types';

/**
 * MACD 指标渲染器
 * 渲染：DIF 线 + DEA 线 + MACD 柱状图
 */
export class MACDRenderer extends BaseRenderer {
  render(data: IndicatorDataPoint[], config: IndicatorConfig) {
    if (data.length === 0) {
      console.warn('[MACDRenderer] No data to render');
      return [];
    }

    // 获取或创建 Pane
    const paneIndex = this.paneManager.getOrCreatePane(config);

    // 提取 DIF、DEA、MACD 数据
    const difData: LineData[] = [];
    const deaData: LineData[] = [];
    const histData: HistogramData[] = [];

    data.forEach(point => {
      const { dif, dea, macd } = point.values;

      if (dif !== undefined) {
        difData.push({ time: point.time as Time, value: dif });
      }

      if (dea !== undefined) {
        deaData.push({ time: point.time as Time, value: dea });
      }

      if (macd !== undefined) {
        histData.push({
          time: point.time as Time,
          value: macd,
          color: macd >= 0 ? '#26a69a' : '#ef5350',
        });
      }
    });

    // 创建 DIF 线
    const difSeries = this.chart.addSeries(LineSeries, {
      priceLineVisible: false,
      color: config.colors[0] || '#2962FF',
      lineWidth: 1,
      lastValueVisible: false,
    }, paneIndex);
    difSeries.setData(difData);

    // 创建 DEA 线
    const deaSeries = this.chart.addSeries(LineSeries, {
      priceLineVisible: false,
      color: config.colors[1] || '#FF6D00',
      lineWidth: 1,
      lastValueVisible: false,
    }, paneIndex);
    deaSeries.setData(deaData);

    // 创建 MACD 柱状图
    const histSeries = this.chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    }, paneIndex);
    histSeries.setData(histData);

    this.series = [difSeries, deaSeries, histSeries];
    this.rendered = true;

    console.info(`[MACDRenderer] Rendered, series count: ${this.series.length}`);
    return this.series;
  }

  update(data: IndicatorDataPoint[]): void {
    if (this.series.length !== 3) {
      console.warn('[MACDRenderer] Series not initialized');
      return;
    }

    const [difSeries, deaSeries, histSeries] = this.series;

    const difData: LineData[] = [];
    const deaData: LineData[] = [];
    const histData: HistogramData[] = [];

    data.forEach(point => {
      const { dif, dea, macd } = point.values;

      if (dif !== undefined) {
        difData.push({ time: point.time as Time, value: dif });
      }

      if (dea !== undefined) {
        deaData.push({ time: point.time as Time, value: dea });
      }

      if (macd !== undefined) {
        histData.push({
          time: point.time as Time,
          value: macd,
          color: macd >= 0 ? '#26a69a' : '#ef5350',
        });
      }
    });

    if (difData.length > 0) {
      difSeries.setData(difData);
      deaSeries.setData(deaData);
      histSeries.setData(histData);
    }
  }
}
```

---

## 继续下一部分...

由于内容较长，我将分文件继续编写其他重构方案的详细设计。
