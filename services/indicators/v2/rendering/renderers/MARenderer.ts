/**
 * MA 指标渲染器（V2）
 * 渲染：多条 MA 线
 */

import { LineSeries, LineData, Time, ISeriesApi } from 'lightweight-charts';
import { BaseRenderer } from './BaseRenderer';
import { IndicatorConfig, IndicatorDataPoint } from '../../types';

export class MARenderer extends BaseRenderer {
  render(data: IndicatorDataPoint[], config: IndicatorConfig) {
    if (data.length === 0) {
      console.warn('[MARenderer] No data to render');
      return [];
    }

    // 获取或创建 Pane（MA 是主图指标）
    const paneIndex = this.paneManager.getOrCreatePane(config);

    // 获取所有 MA 周期
    const periods = Object.keys(config.params);
    const series: Array<ISeriesApi<'Line'>> = [];

    periods.forEach((period, index) => {
      const maKey = `ma${config.params[period]}`;
      const maData: LineData[] = [];

      data.forEach((point) => {
        const value = point.values[maKey];
        if (typeof value === 'number') {
          maData.push({
            time: point.time as Time,
            value,
          });
        }
      });

      if (maData.length > 0) {
        const maSeries = this.chart.addSeries(
          LineSeries,
          {
            color: config.colors[index] || '#2962FF',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
          },
          paneIndex,
        );
        maSeries.setData(maData);
        series.push(maSeries);
      }
    });

    this.series = series;
    this.rendered = true;

    console.info(`[MARenderer] Rendered ${series.length} MA lines`);
    return this.series;
  }

  update(data: IndicatorDataPoint[]): void {
    if (this.series.length === 0) {
      console.warn('[MARenderer] Series not initialized');
      return;
    }

    // 假设 series 顺序与 params 顺序一致
    // TODO: 需要更健壮的匹配机制

    this.series.forEach((maSeries) => {
      const maKey = Object.keys(data[0]?.values || {}).find((k) => k.startsWith('ma'));

      if (!maKey) {return;}

      const maData: LineData[] = [];

      data.forEach((point) => {
        const value = point.values[maKey];
        if (typeof value === 'number') {
          maData.push({
            time: point.time as Time,
            value,
          });
        }
      });

      if (maData.length > 0) {
        maSeries.setData(maData);
      }
    });
  }
}
