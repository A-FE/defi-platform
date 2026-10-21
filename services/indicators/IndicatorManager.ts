import { IChartApi, ISeriesApi, LineData, HistogramData, LineSeries, HistogramSeries } from 'lightweight-charts';
import { IndicatorKlineItem } from '@/types/api';
import { IndicatorConfig } from '@/types/indicator';

/**
 * 指标管理器 - 后端驱动版本
 *
 * 职责：只负责渲染后端返回的指标数据，不包含任何计算逻辑
 * 核心改变：
 * 1. 移除所有指标计算逻辑
 * 2. 直接使用后端返回的指标数据
 * 3. 专注于图表渲染和 pane 管理
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

  constructor(chart: IChartApi, mainSeries: ISeriesApi<'Candlestick'>) {
    this.chart = chart;
    this.mainSeries = mainSeries;
  }

  /**
   * 渲染后端返回的指标数据（主入口）
   * @param bars 带指标的 K 线数据（来自后端）
   * @param configs 启用的指标配置
   */
  renderIndicators(bars: IndicatorKlineItem[], configs: IndicatorConfig[]): void {
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

    console.log(`[IndicatorManager] Rendering MACD:`, bars);

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
      // title: 'DIF',
      // priceLineVisible: false,
      lastValueVisible: false,
    }, paneIndex);
    difSeries.setData(difData);

    // 创建 DEA 线
    const deaSeries = this.chart.addSeries(LineSeries, {
      color: config.colors[1] || '#FF6D00',
      lineWidth: 1,
      // title: 'DEA',
      // priceLineVisible: false,
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
      // title: 'K',
      priceLineVisible: false,
      lastValueVisible: false,
    }, paneIndex);
    kSeries.setData(kData);

    const dSeries = this.chart.addSeries(LineSeries, {
      color: config.colors[1] || '#FF6D00',
      lineWidth: 1,
      // title: 'D',
      priceLineVisible: false,
      lastValueVisible: false,
    }, paneIndex);
    dSeries.setData(dData);

    const jSeries = this.chart.addSeries(LineSeries, {
      color: config.colors[2] || '#9C27B0',
      lineWidth: 1,
      // title: 'J',
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
          title: maKey.toUpperCase(),
          priceLineVisible: false,
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

    // 创建新的 pane
    // Lightweight Charts 5.x: addPane() 不再接受配置对象
    const paneApi = this.chart.addPane();
    const newPaneIndex = this.chart.panes().length - 1;

    // 设置 pane 高度比例（防止布局偏移）
    // 使用 stretch factor: 1.0 表示占合理的高度（自动平衡）
    paneApi.setStretchFactor(1.0);

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

  /**
   * 移除单个指标
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
}
