/**
 * K线 Mock 服务统一导出
 * 使用会话隔离架构，确保不同周期的数据完全独立
 */

export { TimeAlignmentUtil } from './TimeAlignmentUtil';
export { PriceGenerator } from './PriceGenerator';
export { KlineSession } from './KlineSession';
export { KlineSessionManager, klineSessionManager } from './KlineSessionManager';
