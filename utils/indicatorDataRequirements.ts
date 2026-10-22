import { IndicatorConfig, IndicatorType } from '@/types/indicator';

/**
 * 冗余倍数：为了安全，获取 2 倍的最小数据量
 */
const REDUNDANCY_MULTIPLIER = 2;

/**
 * 获取指标的最小数据需求
 * @param config 指标配置
 * @returns 最小所需数据量
 */
export function getIndicatorMinDataSize(config: IndicatorConfig): number {
  const { type, params } = config;

  switch (type) {
    case 'MA':
      // MA 需要的数据量等于周期参数中的最大值
      // 例如 MA(5,10,20,30) 需要 30 根数据
      return Math.max(...Object.values(params));

    case 'EMA':
      // EMA 需要的数据量等于周期参数中的最大值
      return Math.max(...Object.values(params));

    case 'BOLL':
      // BOLL(period, stdDev) 需要 period 根数据
      return params.period || 20;

    case 'MACD':
      // MACD(fast, slow, signal) 需要 slow + signal 根数据
      // 例如 MACD(12, 26, 9) 需要 26 + 9 = 35 根
      const fast = params.fast || 12;
      const slow = params.slow || 26;
      const signal = params.signal || 9;
      return slow + signal;

    case 'RSI':
      // RSI(period) 需要 period + 1 根数据
      return (params.period || 14) + 1;

    case 'KDJ':
      // KDJ(k, d, j) 需要 k 根数据
      return params.k || 9;

    case 'VOL':
      // VOL 不需要额外数据
      return 0;

    default:
      return 0;
  }
}

/**
 * 计算启用指标所需的最大冗余数据量（已乘以 2 倍）
 * @param enabledIndicators 启用的指标配置数组
 * @returns 最大冗余数据量
 */
export function calculateMaxRedundantDataSize(enabledIndicators: IndicatorConfig[]): number {
  if (enabledIndicators.length === 0) {
    return 0;
  }

  // 找出所有指标中需求最大的
  const maxMinSize = Math.max(
    ...enabledIndicators.map((config) => getIndicatorMinDataSize(config))
  );

  // 返回 2 倍冗余
  return maxMinSize * REDUNDANCY_MULTIPLIER;
}

/**
 * 获取启用指标中的最大数据需求（不含冗余倍数）
 * 用于无限加载的触发阈值计算
 * @param enabledIndicators 启用的指标配置数组
 * @returns 最大数据需求量（例如：MACD 返回 35）
 */
export function getMaxIndicatorDataRequirement(
  enabledIndicators: IndicatorConfig[]
): number {
  if (enabledIndicators.length === 0) {
    return 0;
  }

  return Math.max(
    ...enabledIndicators.map((config) => getIndicatorMinDataSize(config))
  );
}

/**
 * 计算实际需要加载的总数据量
 * @param displaySize 可视区数据量
 * @param enabledIndicators 启用的指标配置数组
 * @returns 实际需要加载的总数据量
 */
export function calculateTotalDataSize(
  displaySize: number,
  enabledIndicators: IndicatorConfig[]
): number {
  const redundantSize = calculateMaxRedundantDataSize(enabledIndicators);
  return displaySize + redundantSize;
}
