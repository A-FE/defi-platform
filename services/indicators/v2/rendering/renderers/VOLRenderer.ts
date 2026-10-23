/**
 * VOL 指标渲染器（V2）
 * 渲染：成交量柱状图（颜色跟随 K 线涨跌）
 */

import { HistogramSeries, HistogramData, Time } from 'lightweight-charts';
import { BaseRenderer } from './BaseRenderer';
import { IndicatorConfig, IndicatorDataPoint } from '../../types';

export class VOLRenderer extends BaseRenderer {
  render(data: IndicatorDataPoint[], config: IndicatorConfig) {
    if (data.length === 0) {
      console.warn('[VOLRenderer] No data to render');
      return [];
    }

    // 获取或创建 Pane（VOL 是副图指标）
    const paneIndex = this.paneManager.getOrCreatePane(config);

    // 提取成交量数据（颜色跟随涨跌）
    const volData: HistogramData[] = [];

    data.forEach((point) => {
      const { volume, color } = point.values;

      if (typeof volume === 'number') {
        // 根据涨跌决定颜色
        const barColor = color === 'up' ? '#10b981' : '#ef4444';

        volData.push({
          time: point.time as Time,
          value: volume,
          color: barColor,
        });
      }
    });

    if (volData.length === 0) {
      console.warn('[VOLRenderer] No volume data to render');
      return [];
    }

    // 创建成交量柱状图
    const volSeries = this.chart.addSeries(
      HistogramSeries,
      {
        priceLineVisible: false,
        baseLineVisible: false,
        priceFormat: {
          type: 'volume',
        },
      },
      paneIndex,
    );
    volSeries.setData(volData);

    this.series = [volSeries];
    this.rendered = true;

    console.info(`[VOLRenderer] Rendered volume histogram with ${volData.length} bars`);
    return this.series;
  }

  update(data: IndicatorDataPoint[]): void {
    if (this.series.length !== 1) {
      console.warn('[VOLRenderer] Series not initialized');
      return;
    }

    const [volSeries] = this.series;

    const volData: HistogramData[] = [];

    data.forEach((point) => {
      const { volume, color } = point.values;

      if (typeof volume === 'number') {
        const barColor = color === 'up' ? '#10b981' : '#ef4444';

        volData.push({
          time: point.time as Time,
          value: volume,
          color: barColor,
        });
      }
    });

    if (volData.length > 0) {
      volSeries.setData(volData);
    }
  }
}
