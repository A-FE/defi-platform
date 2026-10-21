import { IChartApi, ISeriesApi, LineData, HistogramData, LineSeries, HistogramSeries } from 'lightweight-charts';
import { KlineBar } from '@/types/market';
import { IndicatorConfig, IndicatorData, IndicatorSeriesData, IndicatorType } from '@/types/indicator';
import { INDICATOR_META } from '@/constants/indicators';
import * as calculators from './calculators';

/**
 * 指标管理器
 * 职责：协调指标计算、创建图表系列、更新渲染
 * 动态管理 pane：副图指标启用时创建对应的 pane，禁用时移除
 */
export class IndicatorManager {
  private chart: IChartApi;
  private mainSeries: ISeriesApi<'Candlestick'>;

  // 指标系列映射（用于更新和销毁）
  private indicatorSeries: Map<string, ISeriesApi<'Line' | 'Histogram'>[]> = new Map();

  // 副图指标的 pane 索引映射
  private indicatorPanes: Map<string, number> = new Map();

  // 主 pane 固定为 0
  private readonly MAIN_PANE_INDEX = 0;

  constructor(
    chart: IChartApi,
    mainSeries: ISeriesApi<'Candlestick'>
  ) {
    this.chart = chart;
    this.mainSeries = mainSeries;
  }

  /**
   * 获取或创建指标对应的 pane 索引
   */
  private getPaneIndex(config: IndicatorConfig): number {
    // 主图指标使用主 pane
    if (config.position === 'main') {
      return this.MAIN_PANE_INDEX;
    }

    // 副图指标：检查是否已有对应的 pane
    const existingPaneIndex = this.indicatorPanes.get(config.type);
    if (existingPaneIndex !== undefined) {
      return existingPaneIndex;
    }

    // 创建新的 pane
    // Lightweight Charts 5.x: addPane() 不再接受配置对象
    const paneApi = this.chart.addPane();
    const newPaneIndex = this.chart.panes().length - 1;

    // 设置 pane 高度比例
    paneApi.setStretchFactor(0.3);

    this.indicatorPanes.set(config.type, newPaneIndex);

    console.log(`[IndicatorManager] Created pane ${newPaneIndex} for ${config.type}`);
    return newPaneIndex;
  }

  /**
   * 移除指标对应的 pane
   */
  private removePaneIfEmpty(type: string): void {
    const paneIndex = this.indicatorPanes.get(type);

    if (paneIndex !== undefined && paneIndex > 0) {
      try {
        // 移除 pane
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
   * 添加指标
   */
  addIndicator(config: IndicatorConfig, bars: KlineBar[]): void {
    if (!config.enabled || bars.length === 0) {
      return;
    }

    try {
      console.log(`[IndicatorManager] addIndicator ${config.type}:`, {
        barsCount: bars.length,
        firstBar: bars[0],
        lastBar: bars[bars.length - 1],
        volumeSample: bars.slice(0, 5).map(b => b.volume),
      });

      // 🔥 关键修复：直接使用传入的 bars 参数（包含 volume 信息）
      // bars 已经包含完整的 K 线数据，包括 volume
      const indicatorData = this.calculateIndicator(config, bars);

      console.log(`[IndicatorManager] Calculated ${config.type}:`, {
        seriesCount: indicatorData.series.length,
        firstSeriesName: indicatorData.series[0]?.name,
        firstSeriesDataLength: indicatorData.series[0]?.data.length,
        firstSeriesDataSample: indicatorData.series[0]?.data.slice(0, 3),
      });

      this.renderIndicator(indicatorData, config);
    } catch (error) {
      console.error(`[IndicatorManager] 添加指标 ${config.type} 失败:`, error);
    }
  }

  /**
   * 移除指标
   */
  removeIndicator(type: string): void {
    const series = this.indicatorSeries.get(type);
    if (series) {
      series.forEach((s) => {
        try {
          this.chart.removeSeries(s);
        } catch (e) {
          console.warn(`Failed to remove series for ${type}:`, e);
        }
      });
      this.indicatorSeries.delete(type);

      // 如果是副图指标，移除对应的 pane
      this.removePaneIfEmpty(type);
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
  private calculateIndicator(config: IndicatorConfig, bars: KlineBar[]): IndicatorData {
    console.log(`[IndicatorManager] calculateIndicator ${config.type}: received ${bars.length} bars`);

    switch (config.type) {
      case 'MA':
        return this.calculateMAData(bars, config);
      case 'EMA':
        return this.calculateEMAData(bars, config);
      case 'BOLL':
        return this.calculateBOLLData(bars, config);
      case 'RSI':
        return this.calculateRSIData(bars, config);
      case 'MACD':
        return this.calculateMACDData(bars, config);
      case 'KDJ':
        return this.calculateKDJData(bars, config);
      case 'VOL':
        return this.calculateVOLData(bars, config);
      default:
        throw new Error(`Unknown indicator: ${config.type}`);
    }
  }

  /**
   * 计算 MA 数据
   */
  private calculateMAData(bars: KlineBar[], config: IndicatorConfig): IndicatorData {
    const periods = Object.values(config.params);
    const maData = calculators.calculateMultiMA(bars, periods);

    const series: IndicatorSeriesData[] = [];
    Object.entries(maData).forEach(([key, data], index) => {
      series.push({
        name: key,
        data,
        color: config.colors[index] || config.colors[0],
      });
    });

    return { type: config.type, series };
  }

  /**
   * 计算 EMA 数据
   */
  private calculateEMAData(bars: KlineBar[], config: IndicatorConfig): IndicatorData {
    const periods = Object.values(config.params);
    const emaData = calculators.calculateMultiEMA(bars, periods);

    const series: IndicatorSeriesData[] = [];
    Object.entries(emaData).forEach(([key, data], index) => {
      series.push({
        name: key,
        data,
        color: config.colors[index] || config.colors[0],
      });
    });

    return { type: config.type, series };
  }

  /**
   * 计算 BOLL 数据
   */
  private calculateBOLLData(bars: KlineBar[], config: IndicatorConfig): IndicatorData {
    const { period, stdDev } = config.params;
    const bollData = calculators.calculateBOLL(bars, period, stdDev);

    const series: IndicatorSeriesData[] = [
      {
        name: 'BOLL-UPPER',
        data: bollData.map((d) => ({ time: d.time, value: d.values.upper })),
        color: config.colors[0],
      },
      {
        name: 'BOLL-MIDDLE',
        data: bollData.map((d) => ({ time: d.time, value: d.values.middle })),
        color: config.colors[1],
      },
      {
        name: 'BOLL-LOWER',
        data: bollData.map((d) => ({ time: d.time, value: d.values.lower })),
        color: config.colors[2],
      },
    ];

    return { type: config.type, series };
  }

  /**
   * 计算 RSI 数据
   */
  private calculateRSIData(bars: KlineBar[], config: IndicatorConfig): IndicatorData {
    const { period } = config.params;
    const rsiData = calculators.calculateRSI(bars, period);

    const series: IndicatorSeriesData[] = [
      {
        name: 'RSI',
        data: rsiData,
        color: config.colors[0],
      },
    ];

    return { type: config.type, series };
  }

  /**
   * 计算 MACD 数据
   */
  private calculateMACDData(bars: KlineBar[], config: IndicatorConfig): IndicatorData {
    const { fastPeriod, slowPeriod, signalPeriod } = config.params;
    const macdData = calculators.calculateMACD(bars, fastPeriod, slowPeriod, signalPeriod);

    console.log('[IndicatorManager] MACD calculation step 1:', {
      totalBars: bars.length,
      macdDataLength: macdData.length,
      firstMACDTime: macdData[0]?.time,
      lastMACDTime: macdData[macdData.length - 1]?.time,
    });

    // 🔥 立即执行 map 并检查
    const difData = macdData.map((d) => ({ time: d.time, value: d.values.dif }));
    console.log('[IndicatorManager] MACD calculation step 2 - after DIF map:', {
      macdDataLength: macdData.length,
      difDataLength: difData.length,
      difFirstTime: difData[0]?.time,
      difLastTime: difData[difData.length - 1]?.time,
    });

    const deaData = macdData.map((d) => ({ time: d.time, value: d.values.dea }));
    const histData = macdData.map((d) => ({ time: d.time, value: d.values.macd }));

    const series: IndicatorSeriesData[] = [
      {
        name: 'MACD-DIF',
        data: difData,
        color: config.colors[0],
      },
      {
        name: 'MACD-DEA',
        data: deaData,
        color: config.colors[1],
      },
      {
        name: 'MACD-HIST',
        data: histData,
        color: config.colors[2],
      },
    ];

    console.log('[IndicatorManager] MACD series before return:', {
      difFirstTime: series[0].data[0]?.time,
      difDataLength: series[0].data.length,
    });

    return { type: config.type, series };
  }

  /**
   * 计算 KDJ 数据
   */
  private calculateKDJData(bars: KlineBar[], config: IndicatorConfig): IndicatorData {
    const { period, kPeriod, dPeriod } = config.params;
    const kdjData = calculators.calculateKDJ(bars, period, kPeriod, dPeriod);

    const series: IndicatorSeriesData[] = [
      {
        name: 'KDJ-K',
        data: kdjData.map((d) => ({ time: d.time, value: d.values.k })),
        color: config.colors[0],
      },
      {
        name: 'KDJ-D',
        data: kdjData.map((d) => ({ time: d.time, value: d.values.d })),
        color: config.colors[1],
      },
      {
        name: 'KDJ-J',
        data: kdjData.map((d) => ({ time: d.time, value: d.values.j })),
        color: config.colors[2],
      },
    ];

    return { type: config.type, series };
  }

  /**
   * 计算 VOL 数据
   */
  private calculateVOLData(bars: KlineBar[], config: IndicatorConfig): IndicatorData {
    const volData = calculators.calculateVOL(bars);

    const series: IndicatorSeriesData[] = [
      {
        name: 'VOL',
        data: volData,
        color: config.colors[0],
      },
    ];

    return { type: config.type, series };
  }

  /**
   * 渲染指标到图表
   */
  private renderIndicator(data: IndicatorData, config: IndicatorConfig): void {
    // 获取或创建对应的 pane
    const paneIndex = this.getPaneIndex(config);

    // 计算数据范围（用于调试）
    const allValues = data.series.flatMap(s => s.data.map(d => d.value));
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    // 检查时间范围
    const firstTime = data.series[0]?.data[0]?.time;
    const lastTime = data.series[0]?.data[data.series[0]?.data.length - 1]?.time;

    console.log(`[IndicatorManager] Rendering ${config.type}:`, {
      paneIndex,
      seriesCount: data.series.length,
      firstSeriesDataLength: data.series[0]?.data.length,
      timeRange: { first: firstTime, last: lastTime },
      valueRange: { min: minValue, max: maxValue },
      sampleData: data.series[0]?.data.slice(0, 3),
    });

    const series: ISeriesApi<'Line' | 'Histogram'>[] = [];

    data.series.forEach((s) => {
      console.log(`[IndicatorManager] Processing series ${s.name}:`, {
        dataLength: s.data.length,
        firstPoint: s.data[0],
        lastPoint: s.data[s.data.length - 1],
      });

      if (s.data.length === 0) {
        return;
      }

      // MACD 柱状图特殊处理
      if (s.name === 'MACD-HIST') {
        const histogramSeries = this.chart.addSeries(HistogramSeries, {
          color: s.color,
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
        }, paneIndex);

        const histogramData: HistogramData[] = s.data.map((d) => ({
          time: d.time as any,
          value: d.value,
          color: d.value >= 0 ? '#26a69a' : '#ef5350',
        }));

        histogramSeries.setData(histogramData);
        series.push(histogramSeries);
      } else if (config.type === 'VOL') {
        // VOL 使用柱状图
        const histogramSeries = this.chart.addSeries(HistogramSeries, {
          color: s.color,
          priceFormat: {
            type: 'volume',
          },
        }, paneIndex);

        const histogramData: HistogramData[] = s.data.map((d) => ({
          time: d.time as any,
          value: d.value,
          color: '#4fc3f7', // 统一蓝色
        }));

        histogramSeries.setData(histogramData);
        series.push(histogramSeries);
      } else {
        // 其他指标使用线图
        const lineSeries = this.chart.addSeries(LineSeries, {
          color: s.color,
          lineWidth: 2,
          lastValueVisible: true,
          priceLineVisible: false,
          title: s.name,
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
        }, paneIndex);

        const lineData: LineData[] = s.data.map((d) => ({
          time: (typeof d.time === 'number' ? d.time : Number(d.time)) as any,
          value: typeof d.value === 'number' ? d.value : Number(d.value),
        }));

        console.log(`[IndicatorManager] Setting line data for ${s.name}:`, {
          dataLength: lineData.length,
          firstPoint: lineData[0],
          lastPoint: lineData[lineData.length - 1],
          valueRange: {
            min: Math.min(...lineData.map(d => d.value)),
            max: Math.max(...lineData.map(d => d.value)),
          },
        });

        lineSeries.setData(lineData);
        series.push(lineSeries);
      }
    });

    this.indicatorSeries.set(data.type, series);

    console.log(`[IndicatorManager] Rendered ${config.type} on pane ${paneIndex} with ${series.length} series`);
  }

  /**
   * 实时更新指标（新 K线到达时）
   */
  updateRealtimeBar(bar: KlineBar, configs: IndicatorConfig[], allBars: KlineBar[]): void {
    configs.forEach((config) => {
      if (!config.enabled) return;

      try {
        // 重新计算指标（取最近的数据用于计算）
        const indicatorData = this.calculateIndicator(config, allBars);
        const series = this.indicatorSeries.get(config.type);

        if (series && indicatorData.series.length > 0) {
          // 更新每条线的最新数据点
          indicatorData.series.forEach((s, i) => {
            if (s.data.length > 0 && series[i]) {
              const lastPoint = s.data[s.data.length - 1];

              if (s.name === 'MACD-HIST') {
                // 柱状图更新
                (series[i] as ISeriesApi<'Histogram'>).update({
                  time: lastPoint.time as any,
                  value: lastPoint.value,
                  color: lastPoint.value >= 0 ? '#26a69a' : '#ef5350',
                });
              } else {
                // 线图更新
                (series[i] as ISeriesApi<'Line'>).update({
                  time: lastPoint.time as any,
                  value: lastPoint.value,
                });
              }
            }
          });
        }
      } catch (error) {
        console.error(`[IndicatorManager] 更新指标 ${config.type} 失败:`, error);
      }
    });
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
  }
}
