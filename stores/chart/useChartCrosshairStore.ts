import { create } from 'zustand';
import { KlineBar } from '@/types/market';

/**
 * 图表十字光标数据
 * 用于在 PriceTicker 中显示鼠标 hover 时的 K 线数据
 */
interface CrosshairData {
  bar: KlineBar | null;       // 当前鼠标悬停的 K 线数据
  isHovering: boolean;         // 是否正在 hover
  symbol: string;              // 交易对
}

interface ChartCrosshairState {
  // 每个 symbol 独立的 crosshair 数据
  crosshairs: Record<string, CrosshairData>;

  // 更新 crosshair 数据
  updateCrosshair: (symbol: string, bar: KlineBar | null, isHovering: boolean) => void;

  // 清除 crosshair 数据
  clearCrosshair: (symbol: string) => void;

  // 获取指定 symbol 的 crosshair 数据
  getCrosshair: (symbol: string) => CrosshairData | null;
}

/**
 * 图表十字光标 Store
 *
 * 职责：
 * - 存储图表鼠标 hover 时的 K 线数据
 * - 供 PriceTicker 组件读取和显示
 */
export const useChartCrosshairStore = create<ChartCrosshairState>((set, get) => ({
  crosshairs: {},

  updateCrosshair: (symbol, bar, isHovering) => {
    set((state) => ({
      crosshairs: {
        ...state.crosshairs,
        [symbol]: {
          bar,
          isHovering,
          symbol,
        },
      },
    }));
  },

  clearCrosshair: (symbol) => {
    set((state) => ({
      crosshairs: {
        ...state.crosshairs,
        [symbol]: {
          bar: null,
          isHovering: false,
          symbol,
        },
      },
    }));
  },

  getCrosshair: (symbol) => {
    return get().crosshairs[symbol] || null;
  },
}));
