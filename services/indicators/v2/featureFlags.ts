/**
 * 指标系统功能开关配置
 *
 * 通过环境变量控制是否使用 V2 架构
 */

export const FEATURE_FLAGS = {
  /**
   * 是否使用 V2 指标系统
   * 默认：false（使用旧版 IndicatorManager）
   *
   * 启用方式：
   * 1. 添加环境变量：NEXT_PUBLIC_USE_INDICATOR_V2=true
   * 2. 或在代码中手动设置：FEATURE_FLAGS.USE_INDICATOR_V2 = true
   */
  USE_INDICATOR_V2: process.env.NEXT_PUBLIC_USE_INDICATOR_V2 === 'true',
};

/**
 * 日志工具（用于调试）
 */
export function logFeatureFlag(flag: keyof typeof FEATURE_FLAGS, context?: string) {
  const value = FEATURE_FLAGS[flag];
  const prefix = context ? `[${context}]` : '[FeatureFlag]';

  if (value) {
    console.info(`${prefix} ✅ ${flag} is ENABLED`);
  } else {
    console.info(`${prefix} ❌ ${flag} is DISABLED (using legacy))`);
  }
}
