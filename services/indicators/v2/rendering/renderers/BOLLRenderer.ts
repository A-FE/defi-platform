/**
 * BOLL 指标渲染器（V2）
 * 渲染：上轨 + 中轨 + 下轨
 */

import { LineSeries, LineData, Time } from 'lightweight-charts';
import { BaseRenderer } from './BaseRenderer';
import { IndicatorConfig, IndicatorDataPoint } from '../../types';

export class BOLLRenderer extends BaseRenderer {
  render(data: IndicatorDataPoint[], config: IndicatorConfig) {
    if (data.length === 0) {
      console.warn('[BOLLRenderer] No data to render');
      return [];
    }

    // 获取或创建 Pane（BOLL 是主图指标）
    const paneIndex = this.paneManager.getOrCreatePane(config);

    // 提取上轨、中轨、下轨数据
    const upperData: LineData[] = [];
    const middleData: LineData[] = [];
    const lowerData: LineData[] = [];

    data.forEach((point) => {
      const { upper, middle, lower } = point.values;

      if (typeof upper === 'number') {
        upperData.push({ time: point.time as Time, value: upper });
      }

      if (typeof middle === 'number') {
        middleData.push({ time: point.time as Time, value: middle });
      }

      if (typeof lower === 'number') {
        lowerData.push({ time: point.time as Time, value: lower });
      }
    });

    // 创建上轨
    const upperSeries = this.chart.addSeries(
      LineSeries,
      {
        color: config.colors[0] || '#FF6D00',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      },
      paneIndex,
    );
    upperSeries.setData(upperData);

    // 创建中轨
    const middleSeries = this.chart.addSeries(
      LineSeries,
      {
        color: config.colors[1] || '#2962FF',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      },
      paneIndex,
    );
    middleSeries.setData(middleData);

    // 创建下轨
    const lowerSeries = this.chart.addSeries(
      LineSeries,
      {
        color: config.colors[2] || '#4CAF50',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      },
      paneIndex,
    );
    lowerSeries.setData(lowerData);

    this.series = [upperSeries, middleSeries, lowerSeries];
    this.rendered = true;

    console.info('[BOLLRenderer] Rendered 3 BOLL lines');
    return this.series;
  }

  update(data: IndicatorDataPoint[]): void {
    if (this.series.length !== 3) {
      console.warn('[BOLLRenderer] Series not initialized');
      return;
    }

    const [upperSeries, middleSeries, lowerSeries] = this.series;

    const upperData: LineData[] = [];
    const middleData: LineData[] = [];
    const lowerData: LineData[] = [];

    data.forEach((point) => {
      const { upper, middle, lower } = point.values;

      if (typeof upper === 'number') {
        upperData.push({ time: point.time as Time, value: upper });
      }

      if (typeof middle === 'number') {
        middleData.push({ time: point.time as Time, value: middle });
      }

      if (typeof lower === 'number') {
        lowerData.push({ time: point.time as Time, value: lower });
      }
    });

    if (upperData.length > 0) {
      upperSeries.setData(upperData);
      middleSeries.setData(middleData);
      lowerSeries.setData(lowerData);
    }
  }
}
