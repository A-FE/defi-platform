/**
 * 指标渲染器基类（V2）
 *
 * 策略模式：每个指标实现自己的渲染器
 *
 * 子类职责：
 * 1. 实现 render(): 创建 Series 并渲染数据
 * 2. 实现 update(): 更新 Series 数据
 * 3. 可选实现 destroy(): 自定义清理逻辑
 */

import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { IndicatorConfig, IndicatorDataPoint } from '../../types';
import { PaneManager } from '../PaneManager';

export abstract class BaseRenderer {
  protected chart: IChartApi;
  protected paneManager: PaneManager;
  protected series: Array<ISeriesApi<'Line' | 'Histogram'>> = [];
  protected rendered = false;

  constructor(chart: IChartApi, paneManager: PaneManager) {
    this.chart = chart;
    this.paneManager = paneManager;
  }

  /**
   * 渲染指标（创建 Series）
   * @param data 指标数据
   * @param config 指标配置
   * @returns 创建的 Series 列表
   */
  abstract render(data: IndicatorDataPoint[], config: IndicatorConfig): Array<ISeriesApi<'Line' | 'Histogram'>>;

  /**
   * 更新指标数据（不重建 Series）
   * @param data 新的指标数据
   */
  abstract update(data: IndicatorDataPoint[]): void;

  /**
   * 检查是否已渲染
   */
  isRendered(): boolean {
    return this.rendered;
  }

  /**
   * 销毁渲染器（移除 Series）
   */
  destroy(): void {
    this.series.forEach((s) => {
      try {
        this.chart.removeSeries(s);
      } catch (error) {
        console.warn('[BaseRenderer] Failed to remove series:', error);
      }
    });

    this.series = [];
    this.rendered = false;
  }
}
