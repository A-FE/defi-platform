/**
 * KDJ 指标渲染器（V2）
 * 渲染：K 线 + D 线 + J 线
 */

import { LineSeries, LineData, Time } from 'lightweight-charts';
import { BaseRenderer } from './BaseRenderer';
import { IndicatorConfig, IndicatorDataPoint } from '../../types';

export class KDJRenderer extends BaseRenderer {
  render(data: IndicatorDataPoint[], config: IndicatorConfig) {
    if (data.length === 0) {
      console.warn('[KDJRenderer] No data to render');
      return [];
    }

    // 获取或创建 Pane（KDJ 是副图指标）
    const paneIndex = this.paneManager.getOrCreatePane(config);

    // 提取 K、D、J 线数据
    const kData: LineData[] = [];
    const dData: LineData[] = [];
    const jData: LineData[] = [];

    data.forEach((point) => {
      const { k, d, j } = point.values;

      if (typeof k === 'number') {
        kData.push({ time: point.time as Time, value: k });
      }

      if (typeof d === 'number') {
        dData.push({ time: point.time as Time, value: d });
      }

      if (typeof j === 'number') {
        jData.push({ time: point.time as Time, value: j });
      }
    });

    // 创建 K 线
    const kSeries = this.chart.addSeries(
      LineSeries,
      {
        color: config.colors[0] || '#2962FF',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      },
      paneIndex,
    );
    kSeries.setData(kData);

    // 创建 D 线
    const dSeries = this.chart.addSeries(
      LineSeries,
      {
        color: config.colors[1] || '#FF6D00',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      },
      paneIndex,
    );
    dSeries.setData(dData);

    // 创建 J 线
    const jSeries = this.chart.addSeries(
      LineSeries,
      {
        color: config.colors[2] || '#9C27B0',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      },
      paneIndex,
    );
    jSeries.setData(jData);

    this.series = [kSeries, dSeries, jSeries];
    this.rendered = true;

    console.info('[KDJRenderer] Rendered 3 KDJ lines');
    return this.series;
  }

  update(data: IndicatorDataPoint[]): void {
    if (this.series.length !== 3) {
      console.warn('[KDJRenderer] Series not initialized');
      return;
    }

    const [kSeries, dSeries, jSeries] = this.series;

    const kData: LineData[] = [];
    const dData: LineData[] = [];
    const jData: LineData[] = [];

    data.forEach((point) => {
      const { k, d, j } = point.values;

      if (typeof k === 'number') {
        kData.push({ time: point.time as Time, value: k });
      }

      if (typeof d === 'number') {
        dData.push({ time: point.time as Time, value: d });
      }

      if (typeof j === 'number') {
        jData.push({ time: point.time as Time, value: j });
      }
    });

    if (kData.length > 0) {
      kSeries.setData(kData);
      dSeries.setData(dData);
      jSeries.setData(jData);
    }
  }
}
