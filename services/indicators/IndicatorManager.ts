import { IChartApi, ISeriesApi, LineData, HistogramData, LineSeries, HistogramSeries } from 'lightweight-charts';
import { KlineBar } from '@/types/market';
import { IndicatorConfig, IndicatorData, IndicatorSeriesData, IndicatorType } from '@/types/indicator';
import { INDICATOR_META } from '@/constants/indicators';
import * as calculators from './calculators';

/**
 * 指标管理器
 * 职责：协调指标计算、创建图表系列、更新渲染
 * 支持主图和副图分离
 */
export class IndicatorManager {
  private mainChart: IChartApi;
  private subChart: IChartApi | null;
  private mainSeries: ISeriesApi<'Candlestick'>;

  // 指标系列映射（用于更新和销毁）
  private indicatorSeries: Map<string, ISeriesApi<'Line' | 'Histogram'>[]> = new Map();

  constructor(
    mainChart: IChartApi,
    mainSeries: ISeriesApi<'Candlestick'>,
    subChart?: IChartApi
  ) {
    this.mainChart = mainChart;
    this.mainSeries = mainSeries;
    this.subChart = subChart || null;
  }

  /**
   * 设置副图实例
   */
  setSubChart(subChart: IChartApi): void {
    this.subChart = subChart;
  }

  /**
   * 添加指标
   */
  addIndicator(config: IndicatorConfig, bars: KlineBar[]): void {
    if (!config.enabled || bars.length === 0) {
      return;
    }

    try {
      // 🔥 关键修复：从图表的主系列获取实际渲染的 K 线数据
      // 这样可以确保指标的时间戳与图表完全一致
      const chartData = this.mainSeries.data();

      // 将图表数据转换为 KlineBar 格式
      const chartBars: KlineBar[] = chartData
        .filter((d): d is any => 'open' in d) // 过滤掉 WhitespaceData
        .map((d: any) => ({
          time: d.time as number,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: 0, // 图表数据中没有 volume，使用 0
        }));

      // 使用图表数据计算指标
      const indicatorData = this.calculateIndicator(config, chartBars);
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
        // 从对应的 chart 中移除
        try {
          this.mainChart.removeSeries(s);
        } catch {
          // 如果不在主图，尝试从副图移除
          if (this.subChart) {
            try {
              this.subChart.removeSeries(s);
            } catch (e) {
              console.warn('Failed to remove series:', e);
            }
          }
        }
      });
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
  private calculateIndicator(config: IndicatorConfig, bars: KlineBar[]): IndicatorData {
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

    const series: IndicatorSeriesData[] = [
      {
        name: 'MACD-DIF',
        data: macdData.map((d) => ({ time: d.time, value: d.values.dif })),
        color: config.colors[0],
      },
      {
        name: 'MACD-DEA',
        data: macdData.map((d) => ({ time: d.time, value: d.values.dea })),
        color: config.colors[1],
      },
      {
        name: 'MACD-HIST',
        data: macdData.map((d) => ({ time: d.time, value: d.values.macd })),
        color: config.colors[2],
      },
    ];

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
    // 根据指标位置选择对应的 chart
    const targetChart = config.position === 'main' ? this.mainChart : this.subChart;

    if (!targetChart) {
      console.warn(`[IndicatorManager] ${config.position} chart 未初始化，跳过渲染 ${config.type}`);
      return;
    }

    const series: ISeriesApi<'Line' | 'Histogram'>[] = [];

    data.series.forEach((s) => {
      if (s.data.length === 0) {
        return;
      }

      // MACD 柱状图特殊处理
      if (s.name === 'MACD-HIST') {
        const histogramSeries = targetChart.addSeries(HistogramSeries, {
          color: s.color,
        });

        const histogramData: HistogramData[] = s.data.map((d) => ({
          time: d.time as any,
          value: d.value,
          color: d.value >= 0 ? '#26a69a' : '#ef5350',
        }));

        histogramSeries.setData(histogramData);
        series.push(histogramSeries);
      } else {
        // 其他指标使用线图
        const lineSeries = targetChart.addSeries(LineSeries, {
          color: s.color,
          lineWidth: 2,
          lastValueVisible: false,
          priceLineVisible: false,
          title: s.name,
        });

        const lineData: LineData[] = s.data.map((d) => ({
          time: (typeof d.time === 'number' ? d.time : Number(d.time)) as any,
          value: typeof d.value === 'number' ? d.value : Number(d.value),
        }));

        lineSeries.setData(lineData);
        series.push(lineSeries);
      }
    });

    this.indicatorSeries.set(data.type, series);
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
      const config = INDICATOR_META[type as IndicatorType];

      // 如果配置不存在，尝试从两个图表中删除
      if (!config) {
        series.forEach((s) => {
          try {
            this.mainChart.removeSeries(s);
          } catch {
            this.subChart?.removeSeries(s);
          }
        });
        return;
      }

      const targetChart = config.position === 'main' ? this.mainChart : this.subChart;

      if (targetChart) {
        series.forEach((s) => {
          try {
            targetChart.removeSeries(s);
          } catch (e) {
            console.warn(`Failed to remove series for ${type}:`, e);
          }
        });
      }
    });
    this.indicatorSeries.clear();
  }
}
