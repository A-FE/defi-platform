/**
 * 技术指标服务统一导出
 *
 * 后端驱动架构：
 * - IndicatorManager：只负责渲染后端返回的指标数据
 * - calculators：保留用于 mock（后端接口就绪后将移除）
 */

// 指标管理器（后端驱动版本）
export { IndicatorManager } from './IndicatorManager';

// 计算器（仅用于 mock，后续将移除）
export * from './calculators';
