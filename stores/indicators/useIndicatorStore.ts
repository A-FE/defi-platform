import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { IndicatorConfig, IndicatorType } from '@/types/indicator';
import { DEFAULT_INDICATOR_CONFIGS } from '@/constants/indicators';

interface IndicatorState {
  // 当前启用的指标配置
  configs: Record<IndicatorType, IndicatorConfig>;

  // 切换指标开关
  toggleIndicator: (type: IndicatorType) => void;

  // 更新指标参数
  updateParams: (type: IndicatorType, params: Record<string, number>) => void;

  // 更新指标颜色
  updateColors: (type: IndicatorType, colors: string[]) => void;

  // 重置为默认配置
  resetConfig: (type: IndicatorType) => void;

  // 批量启用指标（用于模板）
  enableIndicators: (types: IndicatorType[]) => void;

  // 批量禁用指标
  disableAllIndicators: () => void;

  // 获取启用的指标列表
  getEnabledIndicators: () => IndicatorConfig[];

  // 获取主图指标
  getMainIndicators: () => IndicatorConfig[];

  // 获取副图指标
  getSubIndicators: () => IndicatorConfig[];
}

export const useIndicatorStore = create<IndicatorState>()(
  persist(
    (set, get) => ({
      configs: DEFAULT_INDICATOR_CONFIGS,

      toggleIndicator: (type) => {
        // ✅ 立即更新，避免延迟
        set((state) => ({
          configs: {
            ...state.configs,
            [type]: {
              ...state.configs[type],
              enabled: !state.configs[type].enabled,
            },
          },
        }));
      },

      updateParams: (type, params) => {
        set((state) => ({
          configs: {
            ...state.configs,
            [type]: {
              ...state.configs[type],
              params: { ...state.configs[type].params, ...params },
            },
          },
        }));
      },

      updateColors: (type, colors) => {
        set((state) => ({
          configs: {
            ...state.configs,
            [type]: {
              ...state.configs[type],
              colors,
            },
          },
        }));
      },

      resetConfig: (type) => {
        set((state) => ({
          configs: {
            ...state.configs,
            [type]: { ...DEFAULT_INDICATOR_CONFIGS[type] },
          },
        }));
      },

      enableIndicators: (types) => {
        set((state) => {
          const newConfigs = { ...state.configs };
          types.forEach((type) => {
            newConfigs[type] = {
              ...newConfigs[type],
              enabled: true,
            };
          });
          return { configs: newConfigs };
        });
      },

      disableAllIndicators: () => {
        set((state) => {
          const newConfigs = { ...state.configs };
          Object.keys(newConfigs).forEach((key) => {
            newConfigs[key as IndicatorType].enabled = false;
          });
          return { configs: newConfigs };
        });
      },

      getEnabledIndicators: () => {
        const configs = get().configs;
        return Object.values(configs).filter((c) => c.enabled);
      },

      getMainIndicators: () => {
        const configs = get().configs;
        return Object.values(configs).filter((c) => c.enabled && c.position === 'main');
      },

      getSubIndicators: () => {
        const configs = get().configs;
        return Object.values(configs).filter((c) => c.enabled && c.position === 'sub');
      },
    }),
    {
      name: 'indicator-settings-v2',  // 更改版本号，使旧缓存失效
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
