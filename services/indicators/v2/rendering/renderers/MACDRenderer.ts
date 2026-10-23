/**
 * MACD 指标渲染器（V2）
 * 渲染：DIF 线 + DEA 线 + MACD 柱状图
 */

import { LineSeries, HistogramSeries, LineData, HistogramData, Time } from 'lightweight-charts';
import { BaseRenderer } from './BaseRenderer';
import { IndicatorConfig, IndicatorDataPoint } from '../../types';

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

    data.forEach((point) => {
      const { dif, dea, macd } = point.values;

      if (typeof dif === 'number') {
        difData.push({ time: point.time as Time, value: dif });
      }

      if (typeof dea === 'number') {
        deaData.push({ time: point.time as Time, value: dea });
      }

      if (typeof macd === 'number') {
        histData.push({
          time: point.time as Time,
          value: macd,
          color: macd >= 0 ? '#26a69a' : '#ef5350',
        });
      }
    });

    // 创建 DIF 线
    const difSeries = this.chart.addSeries(
      LineSeries,
      {
        priceLineVisible: false,
        color: config.colors[0] || '#2962FF',
        lineWidth: 1,
        lastValueVisible: false,
      },
      paneIndex,
    );
    difSeries.setData(difData);

    // 创建 DEA 线
    const deaSeries = this.chart.addSeries(
      LineSeries,
      {
        priceLineVisible: false,
        color: config.colors[1] || '#FF6D00',
        lineWidth: 1,
        lastValueVisible: false,
      },
      paneIndex,
    );
    deaSeries.setData(deaData);

    // 创建 MACD 柱状图
    const histSeries = this.chart.addSeries(
      HistogramSeries,
      {
        priceLineVisible: false,
        priceFormat: {
          type: 'price',
          precision: 4,
          minMove: 0.0001,
        },
      },
      paneIndex,
    );
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

    data.forEach((point) => {
      const { dif, dea, macd } = point.values;

      if (typeof dif === 'number') {
        difData.push({ time: point.time as Time, value: dif });
      }

      if (typeof dea === 'number') {
        deaData.push({ time: point.time as Time, value: dea });
      }

      if (typeof macd === 'number') {
        histData.push({
          time: point.time as Time,
          value: macd,
          color: macd >= 0 ? '#26a69a' : '#ef5350',
        });
      }
    });

    if (difData.length > 0) {
      console.info(`[MACDRenderer] Updating with ${difData.length} points, time range: ${difData[0]?.time} ~ ${difData[difData.length - 1]?.time}`);
      difSeries.setData(difData);
      deaSeries.setData(deaData);
      histSeries.setData(histData);
    } else {
      console.warn('[MACDRenderer] No data to update');
    }
  }
}
