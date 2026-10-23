/**
 * 指标渲染器（V2）
 * 职责：接收指标数据，创建/更新 Series
 *
 * 使用策略模式：每个指标类型对应一个 Renderer
 */

import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { IndicatorConfig, IndicatorDataPoint } from '../types';
import { PaneManager } from './PaneManager';
import { BaseRenderer } from './renderers/BaseRenderer';
import {
  MARenderer,
  EMARenderer,
  BOLLRenderer,
  RSIRenderer,
  MACDRenderer,
  KDJRenderer,
  VOLRenderer,
} from './renderers';

export class IndicatorRenderer {
  private chart: IChartApi;
  private paneManager: PaneManager;
  private renderers: Map<string, BaseRenderer>;

  constructor(chart: IChartApi) {
    this.chart = chart;
    this.paneManager = new PaneManager(chart);

    // 注册各指标的渲染器（策略模式）
    this.renderers = new Map([
      ['MA', new MARenderer(chart, this.paneManager)],
      ['EMA', new EMARenderer(chart, this.paneManager)],
      ['BOLL', new BOLLRenderer(chart, this.paneManager)],
      ['RSI', new RSIRenderer(chart, this.paneManager)],
      ['MACD', new MACDRenderer(chart, this.paneManager)],
      ['KDJ', new KDJRenderer(chart, this.paneManager)],
      ['VOL', new VOLRenderer(chart, this.paneManager)],
    ]);
  }

  /**
   * 渲染单个指标（创建 Series）
   */
  render(type: string, data: IndicatorDataPoint[], config: IndicatorConfig): ISeriesApi<'Line' | 'Histogram'>[] {
    const renderer = this.renderers.get(type);
    if (!renderer) {
      console.warn(`[IndicatorRenderer] No renderer for ${type}`);
      return [];
    }

    console.info(`[IndicatorRenderer] Rendering ${type}, data points: ${data.length}`);
    return renderer.render(data, config);
  }

  /**
   * 更新指标数据（不重建 Series）
   */
  update(type: string, data: IndicatorDataPoint[]): void {
    const renderer = this.renderers.get(type);
    if (!renderer) {
      console.warn(`[IndicatorRenderer] No renderer for ${type}`);
      return;
    }

    renderer.update(data);
  }

  /**
   * 移除指标
   */
  remove(type: string): void {
    const renderer = this.renderers.get(type);
    if (!renderer) {
      return;
    }

    console.info(`[IndicatorRenderer] Removing ${type}`);
    renderer.destroy();
    this.paneManager.removePaneIfEmpty(type);
  }

  /**
   * 检查指标是否已渲染
   */
  hasRenderer(type: string): boolean {
    const renderer = this.renderers.get(type);
    return renderer ? renderer.isRendered() : false;
  }

  /**
   * 清空所有指标
   */
  clear(): void {
    console.info('[IndicatorRenderer] Clearing all indicators');

    this.renderers.forEach((renderer) => {
      renderer.destroy();
    });

    this.paneManager.clear();
  }

  /**
   * 获取 Pane 管理器（供外部使用）
   */
  getPaneManager(): PaneManager {
    return this.paneManager;
  }
}
