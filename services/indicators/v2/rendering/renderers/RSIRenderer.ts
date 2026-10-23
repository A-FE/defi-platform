/**
 * RSI 指标渲染器（V2）
 * 渲染：多条 RSI 线
 */

import { LineSeries, LineData, Time, ISeriesApi } from 'lightweight-charts';
import { BaseRenderer } from './BaseRenderer';
import { IndicatorConfig, IndicatorDataPoint } from '../../types';

export class RSIRenderer extends BaseRenderer {
  render(data: IndicatorDataPoint[], config: IndicatorConfig) {
    if (data.length === 0) {
      console.warn('[RSIRenderer] No data to render');
      return [];
    }

    // 获取或创建 Pane（RSI 是副图指标）
    const paneIndex = this.paneManager.getOrCreatePane(config);

    // 获取所有 RSI 周期
    const periods = Object.keys(config.params);
    const series: Array<ISeriesApi<'Line'>> = [];

    periods.forEach((period, index) => {
      const rsiKey = `rsi${config.params[period]}`;
      const rsiData: LineData[] = [];

      data.forEach((point) => {
        const value = point.values[rsiKey];
        if (typeof value === 'number') {
          rsiData.push({
            time: point.time as Time,
            value,
          });
        }
      });

      if (rsiData.length > 0) {
        const rsiSeries = this.chart.addSeries(
          LineSeries,
          {
            color: config.colors[index] || '#2962FF',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
          },
          paneIndex,
        );
        rsiSeries.setData(rsiData);
        series.push(rsiSeries);
      }
    });

    this.series = series;
    this.rendered = true;

    console.info(`[RSIRenderer] Rendered ${series.length} RSI lines`);
    return this.series;
  }

  update(data: IndicatorDataPoint[]): void {
    if (this.series.length === 0) {
      console.warn('[RSIRenderer] Series not initialized');
      return;
    }

    console.info('[RSIRenderer] Updating RSI:', {
      dataPointsCount: data.length,
      firstTime: data[0]?.time,
      lastTime: data[data.length - 1]?.time,
      seriesCount: this.series.length,
    });

    // 提取所有 RSI keys
    const rsiKeys = Object.keys(data[0]?.values || {}).filter((k) => k.startsWith('rsi'));

    this.series.forEach((rsiSeries, index) => {
      const rsiKey = rsiKeys[index];
      if (!rsiKey) {return;}

      const rsiData: LineData[] = [];

      data.forEach((point) => {
        const value = point.values[rsiKey];
        if (typeof value === 'number') {
          rsiData.push({
            time: point.time as Time,
            value,
          });
        }
      });

      console.info(`[RSIRenderer] ${rsiKey} data:`, {
        count: rsiData.length,
        firstTime: rsiData[0]?.time,
        lastTime: rsiData[rsiData.length - 1]?.time,
        firstValue: rsiData[0]?.value,
        lastValue: rsiData[rsiData.length - 1]?.value,
      });

      if (rsiData.length > 0) {
        rsiSeries.setData(rsiData);
      }
    });
  }
}
