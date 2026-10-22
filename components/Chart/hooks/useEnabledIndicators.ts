import { useIndicatorStore } from '@/stores';
import { useMemo } from 'react';
import { IndicatorConfig } from '@/types/indicator';

/**
 * 响应式订阅启用的指标配置
 *
 * 职责：
 * - 订阅 Zustand store 的 configs 状态
 * - 自动过滤出已启用的指标
 * - 只有 configs 变化时才重新计算
 *
 * 使用场景：
 * - 需要获取当前启用指标列表的组件
 * - 需要响应指标开关变化的逻辑
 */
export function useEnabledIndicators(): IndicatorConfig[] {
  // 订阅整个 configs 对象，任何指标配置变化都会触发更新
  const configs = useIndicatorStore((state) => state.configs);

  // 缓存过滤结果，避免不必要的数组重新生成
  return useMemo(
    () => Object.values(configs).filter((c) => c.enabled),
    [configs],
  );
}
