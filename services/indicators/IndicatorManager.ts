import { IChartApi, ISeriesApi, LineData, HistogramData, LineSeries, HistogramSeries } from 'lightweight-charts';
import { KlineBar } from '@/types/market';
import { IndicatorConfig } from '@/types/indicator';
import * as calculators from './calculators';

/**
 * 指标数据项（包含K线 + 指标）
 */
interface IndicatorKlineItem extends KlineBar {
  indicators: {
    ma?: Record<string, number>;
    ema?: Record<string, number>;
    boll?: { upper: number; middle: number; lower: number };
    rsi?: { rsi: number };
    macd?: { dif: number; dea: number; macd: number };
    kdj?: { k: number; d: number; j: number };
  };
}

/**
 * 指标管理器 V2 - 前端计算版本
 *
 * 核心改变：
 * 1. 从"纯渲染器"变为"计算器+渲染器"
 * 2. 接收原始 KlineBar[]，内部计算指标
 * 3. 不再依赖后端API返回指标数据
 * 4. 参数变化时立即重新计算，无网络延迟
 */
export class IndicatorManager {
  private chart: IChartApi;

  // 指标系列映射（用于更新和销毁）
  private indicatorSeries: Map<string, ISeriesApi<'Line' | 'Histogram'>[]> = new Map();

  // 副图指标的 pane 索引映射
  private indicatorPanes: Map<string, number> = new Map();

  // ✅ 缓存当前的指标配置（用于检测变化）
  private lastConfigs: IndicatorConfig[] = [];

  // ✅ 缓存最近的K线数据（用于增量更新检测）
  private lastBars: KlineBar[] = [];

  // 主 pane 固定为 0
  private readonly MAIN_PANE_INDEX = 0;

  constructor(chart: IChartApi) {
    this.chart = chart;
  }

  /**
   * ✅ 统一入口：计算 + 渲染指标（优化版：增量更新）
   * @param bars 原始K线数据
   * @param configs 指标配置列表
   */
  public updateIndicators(bars: KlineBar[], configs: IndicatorConfig[]): void {
    const enabledConfigs = configs.filter(c => c.enabled);

    if (enabledConfigs.length === 0) {
      this.clear();
      console.log('[IndicatorManager] No enabled indicators, cleared all');
      return;
    }

    // Step 1: 检查 K 线数据是否变化
    const barsChanged = this.hasBarsChanged(bars);

    // Step 2: 计算指标（前端计算）
    const barsWithIndicators = this.calculateIndicators(bars, enabledConfigs);

    // Step 3: 检查参数是否变化
    const paramsChanged = this.hasConfigChanged(enabledConfigs);

    if (paramsChanged) {
      // 参数变化：完全重建
      console.log('[IndicatorManager] 🔧 参数变化，完全重建');
      this.renderIndicators(barsWithIndicators, enabledConfigs);
      this.lastConfigs = enabledConfigs;
    } else {
      // 参数未变：增量更新（添加新的、删除旧的、更新现有的）
      this.incrementalUpdate(barsWithIndicators, enabledConfigs, barsChanged);
    }

    this.lastBars = bars;
  }

  /**
   * ✅ 检查 K 线数据是否变化
   */
  private hasBarsChanged(bars: KlineBar[]): boolean {
    // 长度变化
    if (bars.length !== this.lastBars.length) {
      return true;
    }

    // 如果长度相同，检查最后一根 K 线是否变化（实时更新）
    if (bars.length > 0 && this.lastBars.length > 0) {
      const lastNew = bars[bars.length - 1];
      const lastOld = this.lastBars[this.lastBars.length - 1];

      return (
        lastNew.time !== lastOld.time ||
        lastNew.close !== lastOld.close ||
        lastNew.open !== lastOld.open ||
        lastNew.high !== lastOld.high ||
        lastNew.low !== lastOld.low
      );
    }

    return false;
  }

  /**
   * ✅ 增量更新：只添加/删除/更新变化的指标
   */
  private incrementalUpdate(bars: IndicatorKlineItem[], newConfigs: IndicatorConfig[], barsChanged: boolean): void {
    const newTypes = new Set(newConfigs.map(c => c.type));
    const oldTypes = new Set(this.lastConfigs.map(c => c.type));

    console.log('[IndicatorManager] 📊 增量更新开始:', {
      oldTypes: Array.from(oldTypes),
      newTypes: Array.from(newTypes),
      barsChanged,
    });

    // 1. 删除不再需要的指标
    for (const oldType of oldTypes) {
      if (!newTypes.has(oldType)) {
        console.log(`[IndicatorManager] ➖ 删除指标: ${oldType}`);
        this.removeIndicator(oldType);
      }
    }

    // 2. 添加新的指标
    for (const config of newConfigs) {
      if (!oldTypes.has(config.type)) {
        console.log(`[IndicatorManager] ➕ 添加指标: ${config.type}`);
        this.renderSingleIndicator(bars, config);
      }
    }

    // 3. 更新现有指标的数据（只有当 K 线数据变化时才更新）
    if (barsChanged) {
      console.log('[IndicatorManager] 📈 K线数据变化，更新现有指标');
      for (const config of newConfigs) {
        if (oldTypes.has(config.type)) {
          console.log(`[IndicatorManager] 🔄 更新指标数据: ${config.type}`);
          this.updateSeriesData(bars, [config]);
        }
      }
    } else {
      console.log('[IndicatorManager] ⏭️ K线数据未变化，跳过更新');
    }

    this.lastConfigs = newConfigs;
    console.log('[IndicatorManager] ✅ 增量更新完成');
  }

  /**
   * ✅ 删除单个指标（优化版：不删除 pane，避免布局变化）
   */
  private removeIndicator(type: string): void {
    const series = this.indicatorSeries.get(type);
    if (!series) return;

    // 只删除系列，不删除 pane（避免图表布局变化）
    if (Array.isArray(series)) {
      series.forEach(s => {
        try {
          this.chart.removeSeries(s);
        } catch (error) {
          console.error(`[IndicatorManager] Failed to remove series for ${type}:`, error);
        }
      });
    } else {
      try {
        this.chart.removeSeries(series);
      } catch (error) {
        console.error(`[IndicatorManager] Failed to remove series for ${type}:`, error);
      }
    }

    // 从系列映射表中删除
    this.indicatorSeries.delete(type);

    // ✅ 保留 pane 不删除，避免布局抖动
    // pane 会在下次需要时被重用（getOrCreatePane 会找到空闲的 pane）
    console.log(`[IndicatorManager] ➖ 删除指标 ${type}（保留 pane）`);
  }

  /**
   * ✅ 渲染单个指标（用于增量添加）
   */
  private renderSingleIndicator(bars: IndicatorKlineItem[], config: IndicatorConfig): void {
    try {
      switch (config.type) {
        case 'MA':
          this.renderMA(bars, config);
          break;
        case 'EMA':
          this.renderEMA(bars, config);
          break;
        case 'BOLL':
          this.renderBOLL(bars, config);
          break;
        case 'RSI':
          this.renderRSI(bars, config);
          break;
        case 'MACD':
          this.renderMACD(bars, config);
          break;
        case 'KDJ':
          this.renderKDJ(bars, config);
          break;
        case 'VOL':
          this.renderVOL(bars, config);
          break;
        default:
          console.warn(`[IndicatorManager] Unknown indicator type: ${config.type}`);
      }
    } catch (error) {
      console.error(`[IndicatorManager] Failed to render ${config.type}:`, error);
    }
  }

  /**
   * ✅ 核心方法：从原始K线计算所有指标
   */
  private calculateIndicators(
    bars: KlineBar[],
    configs: IndicatorConfig[]
  ): IndicatorKlineItem[] {
    const t0 = performance.now();

    // 初始化：所有bar都带空indicators对象
    const result: IndicatorKlineItem[] = bars.map(bar => ({
      ...bar,
      indicators: {}
    }));

    // 遍历启用的指标，逐个计算并合并
    configs.forEach(config => {
      this.calculateSingleIndicator(bars, config, result);
    });

    const t1 = performance.now();
    console.log(`[IndicatorManager] 计算指标耗时: ${(t1 - t0).toFixed(2)}ms`);

    return result;
  }

  /**
   * ✅ 计算单个指标并合并到结果数组
   */
  private calculateSingleIndicator(
    bars: KlineBar[],
    config: IndicatorConfig,
    result: IndicatorKlineItem[]
  ): void {
    try {
      switch (config.type) {
        case 'MA': {
          const periods = Object.values(config.params);
          const maResult = calculators.calculateMultiMA(bars, periods);

          // 合并到 result: result[i].indicators.ma = { ma5: xxx, ma10: xxx, ... }
          Object.entries(maResult).forEach(([key, values]) => {
            values.forEach(({ time, value }) => {
              const index = result.findIndex(b => b.time === time);
              if (index >= 0) {
                if (!result[index].indicators.ma) {
                  result[index].indicators.ma = {};
                }
                const maKey = key.toLowerCase(); // "MA5" -> "ma5"
                result[index].indicators.ma[maKey] = value;
              }
            });
          });
          break;
        }

        case 'EMA': {
          const periods = Object.values(config.params);
          const emaResult = calculators.calculateMultiEMA(bars, periods);

          // 合并到 result: result[i].indicators.ema = { ema7: xxx, ema25: xxx, ... }
          Object.entries(emaResult).forEach(([key, values]) => {
            values.forEach(({ time, value }) => {
              const index = result.findIndex(b => b.time === time);
              if (index >= 0) {
                if (!result[index].indicators.ema) {
                  result[index].indicators.ema = {};
                }
                const emaKey = key.toLowerCase(); // "EMA7" -> "ema7"
                result[index].indicators.ema[emaKey] = value;
              }
            });
          });
          break;
        }

        case 'BOLL': {
          const { period = 20, stdDev = 2 } = config.params;
          const bollData = calculators.calculateBOLL(bars, period, stdDev);

          bollData.forEach(({ time, values }) => {
            const index = result.findIndex(b => b.time === time);
            if (index >= 0) {
              result[index].indicators.boll = {
                upper: values.upper,
                middle: values.middle,
                lower: values.lower
              };
            }
          });
          break;
        }

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

        case 'MACD': {
          const { fast = 12, slow = 26, signal = 9 } = config.params;
          const macdData = calculators.calculateMACD(bars, fast, slow, signal);

          macdData.forEach(({ time, values }) => {
            const index = result.findIndex(b => b.time === time);
            if (index >= 0) {
              result[index].indicators.macd = {
                dif: values.dif,
                dea: values.dea,
                macd: values.macd
              };
            }
          });
          break;
        }

        case 'KDJ': {
          const { period = 9, k = 3, d = 3 } = config.params;
          const kdjData = calculators.calculateKDJ(bars, period, k, d);

          kdjData.forEach(({ time, values }) => {
            const index = result.findIndex(b => b.time === time);
            if (index >= 0) {
              result[index].indicators.kdj = {
                k: values.k,
                d: values.d,
                j: values.j
              };
            }
          });
          break;
        }

        case 'VOL': {
          // VOL 不需要计算，直接使用 K线的 volume 字段
          // 渲染时直接读取 bar.volume
          break;
        }

        default:
          console.warn(`[IndicatorManager] Unknown indicator type: ${config.type}`);
      }
    } catch (error) {
      console.error(`[IndicatorManager] Failed to calculate ${config.type}:`, error);
    }
  }

  /**
   * ✅ 检查是否有系列缺失
   */
  private hasSeriesMissing(configs: IndicatorConfig[]): boolean {
    for (const config of configs) {
      const series = this.indicatorSeries.get(config.type);
      if (!series || series.length === 0) {
        console.log(`[IndicatorManager] Series missing for ${config.type}`);
        return true;
      }
    }
    return false;
  }

  /**
   * ✅ 检查指标配置是否变化（优化版：只检查参数变化，不检查开关状态）
   *
   * 关键优化：
   * - 只有当某个指标的**参数**变化时，才需要完全重建
   * - 指标的开启/关闭只需要增量添加/删除系列，不需要重建所有
   */
  private hasConfigChanged(newConfigs: IndicatorConfig[]): boolean {
    // 创建新旧配置的映射表：type -> params
    const newMap = new Map<string, any>();
    const oldMap = new Map<string, any>();

    newConfigs.forEach(config => {
      newMap.set(config.type, config.params);
    });

    this.lastConfigs.forEach(config => {
      oldMap.set(config.type, config.params);
    });

    // 检查是否有相同指标的参数发生变化
    for (const [type, newParams] of newMap.entries()) {
      const oldParams = oldMap.get(type);

      // 如果旧配置中也有这个指标，比较参数
      if (oldParams) {
        const newParamsStr = JSON.stringify(newParams);
        const oldParamsStr = JSON.stringify(oldParams);

        if (newParamsStr !== oldParamsStr) {
          console.log(`[IndicatorManager] 🔧 参数变化: ${type}`, {
            old: oldParams,
            new: newParams,
          });
          return true; // 参数变化，需要重建
        }
      }
    }

    // 参数都没变化，只是开关状态变化
    return false;
  }

  /**
   * ✅ 只更新系列数据（不重建系列）
   */
  private updateSeriesData(bars: IndicatorKlineItem[], configs: IndicatorConfig[]): void {
    configs.forEach((config) => {
      const series = this.indicatorSeries.get(config.type);
      if (!series) {
        console.warn(`[IndicatorManager] Series not found for ${config.type}, rebuilding`);
        this.renderIndicators(bars, configs);
        return;
      }

      try {
        switch (config.type) {
          case 'MACD':
            this.updateMACDData(bars, series);
            break;
          case 'RSI':
            this.updateRSIData(bars, series);
            break;
          case 'KDJ':
            this.updateKDJData(bars, series);
            break;
          case 'BOLL':
            this.updateBOLLData(bars, series);
            break;
          case 'MA':
            this.updateMAData(bars, series, config);
            break;
          case 'EMA':
            this.updateEMAData(bars, series, config);
            break;
          case 'VOL':
            this.updateVOLData(bars, series);
            break;
          default:
            console.warn(`[IndicatorManager] Unknown indicator type: ${config.type}`);
        }
      } catch (error) {
        console.error(`[IndicatorManager] Failed to update ${config.type}:`, error);
      }
    });
  }

  /**
   * ✅ 更新 MACD 数据
   */
  private updateMACDData(bars: IndicatorKlineItem[], series: ISeriesApi<any>[]): void {
    const [difSeries, deaSeries, histSeries] = series;

    const difData: LineData[] = [];
    const deaData: LineData[] = [];
    const histData: HistogramData[] = [];

    bars.forEach((bar) => {
      if (bar.indicators.macd) {
        const { dif, dea, macd } = bar.indicators.macd;

        difData.push({ time: bar.time as any, value: dif });
        deaData.push({ time: bar.time as any, value: dea });
        histData.push({
          time: bar.time as any,
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

  /**
   * ✅ 更新 RSI 数据
   */
  private updateRSIData(bars: IndicatorKlineItem[], series: ISeriesApi<any>[]): void {
    const [rsiSeries] = series;

    const rsiData: LineData[] = bars
      .filter((bar) => bar.indicators.rsi)
      .map((bar) => ({
        time: bar.time as any,
        value: bar.indicators.rsi!.rsi,
      }));

    if (rsiData.length > 0) {
      rsiSeries.setData(rsiData);
    }
  }

  /**
   * ✅ 更新 KDJ 数据
   */
  private updateKDJData(bars: IndicatorKlineItem[], series: ISeriesApi<any>[]): void {
    const [kSeries, dSeries, jSeries] = series;

    const kData: LineData[] = [];
    const dData: LineData[] = [];
    const jData: LineData[] = [];

    bars.forEach((bar) => {
      if (bar.indicators.kdj) {
        const { k, d, j } = bar.indicators.kdj;
        kData.push({ time: bar.time as any, value: k });
        dData.push({ time: bar.time as any, value: d });
        jData.push({ time: bar.time as any, value: j });
      }
    });

    if (kData.length > 0) {
      kSeries.setData(kData);
      dSeries.setData(dData);
      jSeries.setData(jData);
    }
  }

  /**
   * ✅ 更新 BOLL 数据
   */
  private updateBOLLData(bars: IndicatorKlineItem[], series: ISeriesApi<any>[]): void {
    const [upperSeries, middleSeries, lowerSeries] = series;

    const upperData: LineData[] = [];
    const middleData: LineData[] = [];
    const lowerData: LineData[] = [];

    bars.forEach((bar) => {
      if (bar.indicators.boll) {
        const { upper, middle, lower } = bar.indicators.boll;
        upperData.push({ time: bar.time as any, value: upper });
        middleData.push({ time: bar.time as any, value: middle });
        lowerData.push({ time: bar.time as any, value: lower });
      }
    });

    if (upperData.length > 0) {
      upperSeries.setData(upperData);
      middleSeries.setData(middleData);
      lowerSeries.setData(lowerData);
    }
  }

  /**
   * ✅ 更新 MA 数据
   */
  private updateMAData(bars: IndicatorKlineItem[], series: ISeriesApi<any>[], config: IndicatorConfig): void {
    const periods = Object.keys(config.params);

    periods.forEach((period, index) => {
      const maSeries = series[index];
      if (!maSeries) return;

      const maKey = `ma${config.params[period]}`;
      const maData: LineData[] = [];

      bars.forEach((bar) => {
        if (bar.indicators.ma && bar.indicators.ma[maKey] !== undefined) {
          maData.push({
            time: bar.time as any,
            value: bar.indicators.ma[maKey],
          });
        }
      });

      if (maData.length > 0) {
        maSeries.setData(maData);
      }
    });
  }

  /**
   * ✅ 更新 EMA 数据
   */
  private updateEMAData(bars: IndicatorKlineItem[], series: ISeriesApi<any>[], config: IndicatorConfig): void {
    const periods = Object.keys(config.params);

    periods.forEach((period, index) => {
      const emaSeries = series[index];
      if (!emaSeries) return;

      const emaKey = `ema${config.params[period]}`;
      const emaData: LineData[] = [];

      bars.forEach((bar) => {
        if (bar.indicators.ema && bar.indicators.ema[emaKey] !== undefined) {
          emaData.push({
            time: bar.time as any,
            value: bar.indicators.ema[emaKey],
          });
        }
      });

      if (emaData.length > 0) {
        emaSeries.setData(emaData);
      }
    });
  }

  /**
   * ✅ 更新 VOL 数据
   */
  private updateVOLData(bars: IndicatorKlineItem[], series: ISeriesApi<any>[]): void {
    const [volSeries] = series;

    const volData: HistogramData[] = bars
      .filter((bar) => bar.volume !== undefined)
      .map((bar) => ({
        time: bar.time as any,
        value: bar.volume,
        color: '#4fc3f7',
      }));

    if (volData.length > 0) {
      volSeries.setData(volData);
    }
  }

  /**
   * 渲染指标到图表（完全重建）
   */
  private renderIndicators(bars: IndicatorKlineItem[], configs: IndicatorConfig[]): void {
    console.log('[IndicatorManager] renderIndicators:', {
      barsCount: bars.length,
      configsCount: configs.length,
      configs: configs.map(c => c.type),
    });

    // 清空旧指标
    this.clear();

    // 过滤出启用的指标
    const enabledConfigs = configs.filter(c => c.enabled);

    if (enabledConfigs.length === 0) {
      console.log('[IndicatorManager] No enabled indicators');
      return;
    }

    // 渲染每个指标
    enabledConfigs.forEach((config) => {
      try {
        switch (config.type) {
          case 'MACD':
            this.renderMACD(bars, config);
            break;
          case 'RSI':
            this.renderRSI(bars, config);
            break;
          case 'KDJ':
            this.renderKDJ(bars, config);
            break;
          case 'BOLL':
            this.renderBOLL(bars, config);
            break;
          case 'MA':
            this.renderMA(bars, config);
            break;
          case 'EMA':
            this.renderEMA(bars, config);
            break;
          case 'VOL':
            this.renderVOL(bars, config);
            break;
          default:
            console.warn(`[IndicatorManager] Unknown indicator type: ${config.type}`);
        }
      } catch (error) {
        console.error(`[IndicatorManager] Failed to render ${config.type}:`, error);
      }
    });
  }

  /**
   * 渲染 MACD 指标
   */
  private renderMACD(bars: IndicatorKlineItem[], config: IndicatorConfig): void {
    const paneIndex = this.getOrCreatePane(config);

    // 提取 DIF、DEA、HIST 数据
    const difData: LineData[] = [];
    const deaData: LineData[] = [];
    const histData: HistogramData[] = [];

    bars.forEach((bar) => {
      if (bar.indicators.macd) {
        const { dif, dea, macd } = bar.indicators.macd;

        difData.push({
          time: bar.time as any,
          value: dif
        });

        deaData.push({
          time: bar.time as any,
          value: dea
        });

        histData.push({
          time: bar.time as any,
          value: macd,
          color: macd >= 0 ? '#26a69a' : '#ef5350',
        });
      }
    });

    if (difData.length === 0) {
      console.warn('[IndicatorManager] No MACD data to render');
      return;
    }

    // 创建 DIF 线
    const difSeries = this.chart.addSeries(LineSeries, {
      color: config.colors[0] || '#2962FF',
      lineWidth: 1,
      lastValueVisible: false,
    }, paneIndex);
    difSeries.setData(difData);

    // 创建 DEA 线
    const deaSeries = this.chart.addSeries(LineSeries, {
      color: config.colors[1] || '#FF6D00',
      lineWidth: 1,
      lastValueVisible: false,
    }, paneIndex);
    deaSeries.setData(deaData);

    // 创建 HIST 柱状图
    const histSeries = this.chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    }, paneIndex);
    histSeries.setData(histData);

    this.indicatorSeries.set('MACD', [difSeries, deaSeries, histSeries]);

    console.log(`[IndicatorManager] MACD rendered: ${difData.length} points on pane ${paneIndex}`);
  }

  /**
   * 渲染 RSI 指标
   */
  private renderRSI(bars: IndicatorKlineItem[], config: IndicatorConfig): void {
    const paneIndex = this.getOrCreatePane(config);

    const rsiData: LineData[] = bars
      .filter((bar) => bar.indicators.rsi)
      .map((bar) => ({
        time: bar.time as any,
        value: bar.indicators.rsi!.rsi,
      }));

    if (rsiData.length === 0) {
      console.warn('[IndicatorManager] No RSI data to render');
      return;
    }

    const rsiSeries = this.chart.addSeries(LineSeries, {
      color: config.colors[0] || '#2962FF',
      lineWidth: 2,
      title: 'RSI',
      priceLineVisible: false,
      lastValueVisible: false,
    }, paneIndex);
    rsiSeries.setData(rsiData);

    // 添加超买超卖线
    rsiSeries.createPriceLine({
      price: 70,
      color: '#ef4444',
      lineStyle: 2,
      lineWidth: 1,
      axisLabelVisible: true,
      title: 'Overbought',
    });

    rsiSeries.createPriceLine({
      price: 30,
      color: '#22c55e',
      lineStyle: 2,
      lineWidth: 1,
      axisLabelVisible: true,
      title: 'Oversold',
    });

    this.indicatorSeries.set('RSI', [rsiSeries]);

    console.log(`[IndicatorManager] RSI rendered: ${rsiData.length} points on pane ${paneIndex}`);
  }

  /**
   * 渲染 KDJ 指标
   */
  private renderKDJ(bars: IndicatorKlineItem[], config: IndicatorConfig): void {
    const paneIndex = this.getOrCreatePane(config);

    const kData: LineData[] = [];
    const dData: LineData[] = [];
    const jData: LineData[] = [];

    bars.forEach((bar) => {
      if (bar.indicators.kdj) {
        const { k, d, j } = bar.indicators.kdj;

        kData.push({ time: bar.time as any, value: k });
        dData.push({ time: bar.time as any, value: d });
        jData.push({ time: bar.time as any, value: j });
      }
    });

    if (kData.length === 0) {
      console.warn('[IndicatorManager] No KDJ data to render');
      return;
    }

    const kSeries = this.chart.addSeries(LineSeries, {
      color: config.colors[0] || '#2962FF',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    }, paneIndex);
    kSeries.setData(kData);

    const dSeries = this.chart.addSeries(LineSeries, {
      color: config.colors[1] || '#FF6D00',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    }, paneIndex);
    dSeries.setData(dData);

    const jSeries = this.chart.addSeries(LineSeries, {
      color: config.colors[2] || '#9C27B0',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    }, paneIndex);
    jSeries.setData(jData);

    this.indicatorSeries.set('KDJ', [kSeries, dSeries, jSeries]);

    console.log(`[IndicatorManager] KDJ rendered: ${kData.length} points on pane ${paneIndex}`);
  }

  /**
   * 渲染 BOLL 指标
   */
  private renderBOLL(bars: IndicatorKlineItem[], config: IndicatorConfig): void {
    const paneIndex = this.getOrCreatePane(config);

    const upperData: LineData[] = [];
    const middleData: LineData[] = [];
    const lowerData: LineData[] = [];

    bars.forEach((bar) => {
      if (bar.indicators.boll) {
        const { upper, middle, lower } = bar.indicators.boll;

        upperData.push({ time: bar.time as any, value: upper });
        middleData.push({ time: bar.time as any, value: middle });
        lowerData.push({ time: bar.time as any, value: lower });
      }
    });

    if (upperData.length === 0) {
      console.warn('[IndicatorManager] No BOLL data to render');
      return;
    }

    const upperSeries = this.chart.addSeries(LineSeries, {
      color: config.colors[0] || '#FF6D00',
      lineWidth: 1,
      title: 'UPPER',
      priceLineVisible: false,
    }, paneIndex);
    upperSeries.setData(upperData);

    const middleSeries = this.chart.addSeries(LineSeries, {
      color: config.colors[1] || '#2962FF',
      lineWidth: 2,
      title: 'MIDDLE',
      priceLineVisible: false,
    }, paneIndex);
    middleSeries.setData(middleData);

    const lowerSeries = this.chart.addSeries(LineSeries, {
      color: config.colors[2] || '#4CAF50',
      lineWidth: 1,
      title: 'LOWER',
      priceLineVisible: false,
    }, paneIndex);
    lowerSeries.setData(lowerData);

    this.indicatorSeries.set('BOLL', [upperSeries, middleSeries, lowerSeries]);

    console.log(`[IndicatorManager] BOLL rendered: ${upperData.length} points on pane ${paneIndex}`);
  }

  /**
   * 渲染 MA 指标
   */
  private renderMA(bars: IndicatorKlineItem[], config: IndicatorConfig): void {
    const paneIndex = this.getOrCreatePane(config);

    if (!bars.some(bar => bar.indicators.ma)) {
      console.warn('[IndicatorManager] No MA data to render');
      return;
    }

    const series: ISeriesApi<'Line'>[] = [];
    const periods = Object.keys(config.params);

    periods.forEach((period, index) => {
      const maKey = `ma${config.params[period]}`;
      const maData: LineData[] = [];

      bars.forEach((bar) => {
        if (bar.indicators.ma && bar.indicators.ma[maKey] !== undefined) {
          maData.push({
            time: bar.time as any,
            value: bar.indicators.ma[maKey],
          });
        }
      });

      if (maData.length > 0) {
        const maSeries = this.chart.addSeries(LineSeries, {
          color: config.colors[index] || '#2962FF',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        }, paneIndex);
        maSeries.setData(maData);
        series.push(maSeries);
      }
    });

    this.indicatorSeries.set('MA', series);

    console.log(`[IndicatorManager] MA rendered: ${series.length} lines on pane ${paneIndex}`);
  }

  /**
   * 渲染 EMA 指标
   */
  private renderEMA(bars: IndicatorKlineItem[], config: IndicatorConfig): void {
    const paneIndex = this.getOrCreatePane(config);

    if (!bars.some(bar => bar.indicators.ema)) {
      console.warn('[IndicatorManager] No EMA data to render');
      return;
    }

    const series: ISeriesApi<'Line'>[] = [];
    const periods = Object.keys(config.params);

    periods.forEach((period, index) => {
      const emaKey = `ema${config.params[period]}`;
      const emaData: LineData[] = [];

      bars.forEach((bar) => {
        if (bar.indicators.ema && bar.indicators.ema[emaKey] !== undefined) {
          emaData.push({
            time: bar.time as any,
            value: bar.indicators.ema[emaKey],
          });
        }
      });

      if (emaData.length > 0) {
        const emaSeries = this.chart.addSeries(LineSeries, {
          color: config.colors[index] || '#FF6D00',
          lineWidth: 2,
          title: emaKey.toUpperCase(),
          priceLineVisible: false,
        }, paneIndex);
        emaSeries.setData(emaData);
        series.push(emaSeries);
      }
    });

    this.indicatorSeries.set('EMA', series);

    console.log(`[IndicatorManager] EMA rendered: ${series.length} lines on pane ${paneIndex}`);
  }

  /**
   * 渲染 VOL 指标
   */
  private renderVOL(bars: IndicatorKlineItem[], config: IndicatorConfig): void {
    const paneIndex = this.getOrCreatePane(config);

    const volData: HistogramData[] = bars
      .filter((bar) => bar.volume !== undefined)
      .map((bar) => ({
        time: bar.time as any,
        value: bar.volume,
        color: config.colors[0] || '#4fc3f7',
      }));

    if (volData.length === 0) {
      console.warn('[IndicatorManager] No VOL data to render');
      return;
    }

    const volSeries = this.chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
    }, paneIndex);
    volSeries.setData(volData);

    this.indicatorSeries.set('VOL', [volSeries]);

    console.log(`[IndicatorManager] VOL rendered: ${volData.length} points on pane ${paneIndex}`);
  }

  /**
   * 获取或创建指标对应的 pane 索引
   */
  private getOrCreatePane(config: IndicatorConfig): number {
    // 主图指标使用主 pane
    if (config.position === 'main') {
      return this.MAIN_PANE_INDEX;
    }

    // 副图指标：检查是否已有对应的 pane
    const existingPaneIndex = this.indicatorPanes.get(config.type);
    if (existingPaneIndex !== undefined) {
      return existingPaneIndex;
    }

    // ✅ 优化：尝试重用空闲的 pane（没有任何系列的 pane）
    const allPaneIndices = Array.from(this.indicatorPanes.values());
    const totalPanes = this.chart.panes().length;

    // 查找空闲 pane：存在但没有被任何指标使用的 pane
    for (let i = 1; i < totalPanes; i++) {
      if (!allPaneIndices.includes(i)) {
        // 找到空闲 pane，重用它
        this.indicatorPanes.set(config.type, i);
        console.log(`[IndicatorManager] ♻️ 重用空闲 pane ${i} for ${config.type}`);
        return i;
      }
    }

    // 没有空闲 pane，创建新的
    const paneApi = this.chart.addPane();
    const newPaneIndex = this.chart.panes().length - 1;

    // 设置 pane 高度比例
    paneApi.setStretchFactor(1.0);

    this.indicatorPanes.set(config.type, newPaneIndex);

    console.log(`[IndicatorManager] ➕ 创建新 pane ${newPaneIndex} for ${config.type}`);
    return newPaneIndex;
  }

  /**
   * 移除指标对应的 pane
   */
  private removePaneIfEmpty(type: string): void {
    const paneIndex = this.indicatorPanes.get(type);

    if (paneIndex !== undefined && paneIndex > 0) {
      try {
        this.chart.removePane(paneIndex);
        this.indicatorPanes.delete(type);

        // 更新其他 pane 的索引（移除后索引会变化）
        this.indicatorPanes.forEach((index, key) => {
          if (index > paneIndex) {
            this.indicatorPanes.set(key, index - 1);
          }
        });

        console.log(`[IndicatorManager] Removed pane ${paneIndex} for ${type}`);
      } catch (error) {
        console.warn(`Failed to remove pane for ${type}:`, error);
      }
    }
  }

  /**
   * 清空所有指标
   */
  clear(): void {
    this.indicatorSeries.forEach((series, type) => {
      series.forEach((s) => {
        try {
          this.chart.removeSeries(s);
        } catch (e) {
          console.warn(`Failed to remove series for ${type}:`, e);
        }
      });
    });
    this.indicatorSeries.clear();

    // 移除副图 panes
    const panesToRemove = Array.from(this.indicatorPanes.entries());
    panesToRemove.forEach(([type, paneIndex]) => {
      this.removePaneIfEmpty(type);
    });

    console.log('[IndicatorManager] All indicators cleared');
  }
}
