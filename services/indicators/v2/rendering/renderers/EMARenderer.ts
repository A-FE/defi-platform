/**
 * EMA 指标渲染器（V2）
 * 渲染：多条 EMA 线
 */

import { LineSeries, LineData, Time, ISeriesApi } from 'lightweight-charts';
import { BaseRenderer } from './BaseRenderer';
import { IndicatorConfig, IndicatorDataPoint } from '../../types';

export class EMARenderer extends BaseRenderer {
  render(data: IndicatorDataPoint[], config: IndicatorConfig) {
    if (data.length === 0) {
      console.warn('[EMARenderer] No data to render');
      return [];
    }

    // 获取或创建 Pane（EMA 是主图指标）
    const paneIndex = this.paneManager.getOrCreatePane(config);

    // 获取所有 EMA 周期
    const periods = Object.keys(config.params);
    const series: Array<ISeriesApi<'Line'>> = [];

    periods.forEach((period, index) => {
      const emaKey = `ema${config.params[period]}`;
      const emaData: LineData[] = [];

      data.forEach((point) => {
        const value = point.values[emaKey];
        if (typeof value === 'number') {
          emaData.push({
            time: point.time as Time,
            value,
          });
        }
      });

      if (emaData.length > 0) {
        const emaSeries = this.chart.addSeries(
          LineSeries,
          {
            color: config.colors[index] || '#FF6D00',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
          },
          paneIndex,
        );
        emaSeries.setData(emaData);
        series.push(emaSeries);
      }
    });

    this.series = series;
    this.rendered = true;

    console.info(`[EMARenderer] Rendered ${series.length} EMA lines`);
    return this.series;
  }

  update(data: IndicatorDataPoint[]): void {
    if (this.series.length === 0) {
      console.warn('[EMARenderer] Series not initialized');
      return;
    }

    // 提取所有 EMA keys
    const emaKeys = Object.keys(data[0]?.values || {}).filter((k) => k.startsWith('ema'));

    this.series.forEach((emaSeries, index) => {
      const emaKey = emaKeys[index];
      if (!emaKey) {return;}

      const emaData: LineData[] = [];

      data.forEach((point) => {
        const value = point.values[emaKey];
        if (typeof value === 'number') {
          emaData.push({
            time: point.time as Time,
            value,
          });
        }
      });

      if (emaData.length > 0) {
        emaSeries.setData(emaData);
      }
    });
  }
}
