/**
 * 指标系统 V2 - 统一导出
 *
 * 使用方式：
 * ```typescript
 * import { IndicatorOrchestrator } from '@/services/indicators/v2';
 *
 * const orchestrator = new IndicatorOrchestrator(chart);
 * orchestrator.updateIndicators(symbol, interval, bars, configs);
 * ```
 */

export { IndicatorOrchestrator } from './IndicatorOrchestrator';
export { IndicatorCalculator } from './core/IndicatorCalculator';
export { IndicatorCache, hashBars } from './core/IndicatorCache';
export { IndicatorRenderer } from './rendering/IndicatorRenderer';
export { PaneManager } from './rendering/PaneManager';
export * from './types';
