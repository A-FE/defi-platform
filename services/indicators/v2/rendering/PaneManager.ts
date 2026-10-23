/**
 * Pane 管理器（V2）
 * 职责：管理图表 Pane 的创建、销毁和索引映射
 */

import { IChartApi } from 'lightweight-charts';
import { IndicatorConfig } from '../types';

export class PaneManager {
  private chart: IChartApi;
  private indicatorPanes = new Map<string, number>(); // 指标类型 -> Pane 索引
  private readonly MAIN_PANE_INDEX = 0;

  constructor(chart: IChartApi) {
    this.chart = chart;
  }

  /**
   * 获取或创建指标对应的 Pane 索引
   */
  getOrCreatePane(config: IndicatorConfig): number {
    // 主图指标使用主 Pane
    if (config.position === 'main') {
      return this.MAIN_PANE_INDEX;
    }

    // 副图指标：检查是否已有对应的 Pane
    const existingPaneIndex = this.indicatorPanes.get(config.type);
    if (existingPaneIndex !== undefined) {
      return existingPaneIndex;
    }

    // 创建新的 Pane
    const paneApi = this.chart.addPane();
    const newPaneIndex = this.chart.panes().length - 1;

    // 设置 Pane 高度比例
    paneApi.setStretchFactor(1.0);

    this.indicatorPanes.set(config.type, newPaneIndex);

    console.info(`[PaneManager] Created pane ${newPaneIndex} for ${config.type}`);
    return newPaneIndex;
  }

  /**
   * 获取指标的 Pane 索引
   */
  getPaneIndex(type: string): number | undefined {
    return this.indicatorPanes.get(type);
  }

  /**
   * 移除指标对应的 Pane（如果为空）
   */
  removePaneIfEmpty(type: string): void {
    const paneIndex = this.indicatorPanes.get(type);

    if (paneIndex === undefined || paneIndex === 0) {
      return; // 主 Pane 不删除
    }

    try {
      // 删除 Pane
      this.chart.removePane(paneIndex);
      this.indicatorPanes.delete(type);

      // 更新其他 Pane 的索引（删除后索引会变化）
      const affectedPanes: Array<[string, number]> = [];
      this.indicatorPanes.forEach((index, key) => {
        if (index > paneIndex) {
          affectedPanes.push([key, index - 1]);
        }
      });

      affectedPanes.forEach(([key, newIndex]) => {
        this.indicatorPanes.set(key, newIndex);
      });

      console.info(`[PaneManager] Removed pane ${paneIndex} for ${type}`);
    } catch (error) {
      console.error(`[PaneManager] Failed to remove pane for ${type}:`, error);
    }
  }

  /**
   * 清空所有副图 Pane
   */
  clear(): void {
    // 从后往前删除，避免索引变化
    const panesToRemove = Array.from(this.indicatorPanes.entries()).sort((a, b) => b[1] - a[1]);

    panesToRemove.forEach(([type, paneIndex]) => {
      if (paneIndex > 0) {
        try {
          this.chart.removePane(paneIndex);
        } catch (e) {
          console.warn(`[PaneManager] Failed to remove pane ${paneIndex} for ${type}:`, e);
        }
      }
    });

    this.indicatorPanes.clear();
    console.info('[PaneManager] Cleared all panes');
  }
}
