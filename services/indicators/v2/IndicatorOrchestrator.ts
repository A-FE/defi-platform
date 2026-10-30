/**
 * 指标协调器（V2）
 * 职责：协调计算、缓存、渲染三层，提供统一的对外接口
 *
 * 这是 V2 架构的核心入口，外部只需要调用这个类
 */

import { IChartApi } from 'lightweight-charts';
import { KlineBar } from '@/types/market';
import { IndicatorConfig } from './types';
import { IndicatorCalculator } from './core/IndicatorCalculator';
import { IndicatorCache, hashBars } from './core/IndicatorCache';
import { IndicatorRenderer } from './rendering/IndicatorRenderer';

export class IndicatorOrchestrator {
  private calculator: IndicatorCalculator;
  private cache: IndicatorCache;
  private renderer: IndicatorRenderer;

  constructor(chart: IChartApi) {
    this.calculator = new IndicatorCalculator();
    this.cache = new IndicatorCache();
    this.renderer = new IndicatorRenderer(chart);
  }

  /**
   * 更新指标（智能判断：缓存 vs 计算 vs 更新 vs 重建）
   *
   * @param symbol 交易对
   * @param interval K线周期
   * @param bars K线数据
   * @param configs 指标配置列表
   */
  async updateIndicators(
    symbol: string,
    interval: string,
    bars: KlineBar[],
    configs: IndicatorConfig[],
  ): Promise<void> {
    const barsHash = hashBars(bars as unknown as Record<string, unknown>[]);
    const enabledConfigs = configs.filter((c) => c.enabled);

    console.info('[IndicatorOrchestrator] Updating indicators:', {
      symbol,
      interval,
      barsCount: bars.length,
      enabledIndicators: enabledConfigs.map((c) => c.type),
    });

    for (const config of enabledConfigs) {
      try {
        // 1. 尝试从缓存获取
        let data = this.cache.get(symbol, interval, config, barsHash);

        // 2. 缓存未命中，重新计算
        if (!data) {
          console.info(`[IndicatorOrchestrator] Cache miss for ${config.type}, calculating...`);
          data = this.calculator.calculate(bars, config);
          this.cache.set(symbol, interval, config, barsHash, data);
        }

        // 3. 判断是更新还是重建
        if (this.renderer.hasRenderer(config.type)) {
          this.renderer.update(config.type, data); // 增量更新
        } else {
          this.renderer.render(config.type, data, config); // 首次渲染
        }
      } catch (error) {
        console.error(`[IndicatorOrchestrator] Failed to update ${config.type}:`, error);
      }
    }

    // 4. 移除未启用的指标
    this.removeDisabledIndicators(configs);
  }

  /**
   * 移除未启用的指标
   */
  private removeDisabledIndicators(_configs: IndicatorConfig[]): void {
    // TODO: 需要跟踪当前已渲染的指标类型
    // 暂时跳过此逻辑，后续优化
  }

  /**
   * 清空所有指标
   */
  clear(): void {
    console.info('[IndicatorOrchestrator] Clearing all');
    this.renderer.clear();
    this.cache.clear();
  }

  /**
   * 获取缓存统计（用于调试）
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}
