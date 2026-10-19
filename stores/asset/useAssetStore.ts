import { create } from 'zustand';
import { AssetState } from '@/types/store';
import { AssetData, Position } from '@/types/market';
import { TOKENS } from '@/constants/tokens';

/**
 * 防抖函数
 */
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

/**
 * 资产 Store
 * 职责：管理用户资产、持仓、盈亏计算
 */
export const useAssetStore = create<AssetState>((set, get) => ({
  assets: null,
  isCalculating: false,

  /**
   * 加载资产数据
   */
  loadAssets: async () => {
    set({ isCalculating: true });

    try {
      // 开发阶段：使用 Mock 数据
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 模拟持仓数据
      const positions: Position[] = [
        {
          symbol: 'SOL',
          tokenMint: 'So11111111111111111111111111111111111111112',
          quantity: 10.5,
          costPrice: 100.0,
          currentPrice: 105.0,
          unrealizedPnL: 52.5,
          pnlPercent: 5.0,
        },
        {
          symbol: 'USDC',
          tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          quantity: 5000.0,
          costPrice: 1.0,
          currentPrice: 1.0,
          unrealizedPnL: 0,
          pnlPercent: 0,
        },
        {
          symbol: 'RAY',
          tokenMint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
          quantity: 500.0,
          costPrice: 1.5,
          currentPrice: 1.8,
          unrealizedPnL: 150.0,
          pnlPercent: 20.0,
        },
      ];

      const totalValue = positions.reduce(
        (sum, pos) => sum + (pos.currentPrice || 0) * pos.quantity,
        0
      );

      const assets: AssetData = {
        totalValueUSD: totalValue,
        availableUSD: 5000.0, // USDC 可用余额
        frozenUSD: totalValue - 5000.0, // 其他代币锁定价值
        positions,
      };

      set({ assets, isCalculating: false });
    } catch (error) {
      console.error('Load assets error:', error);
      set({ isCalculating: false });
    }
  },

  /**
   * 计算盈亏（实时）
   */
  calculatePnL: () => {
    const { assets } = get();
    if (!assets) return;

    set({ isCalculating: true });

    try {
      // 模拟实时价格更新
      const updatedPositions = assets.positions.map((pos) => {
        // 随机波动 ±1%
        const priceChange = (Math.random() - 0.5) * 0.02;
        const currentPrice = (pos.currentPrice || pos.costPrice) * (1 + priceChange);

        const unrealizedPnL = (currentPrice - pos.costPrice) * pos.quantity;
        const pnlPercent = ((currentPrice - pos.costPrice) / pos.costPrice) * 100;

        return {
          ...pos,
          currentPrice,
          unrealizedPnL,
          pnlPercent,
        };
      });

      const totalValue = updatedPositions.reduce(
        (sum, pos) => sum + (pos.currentPrice || 0) * pos.quantity,
        0
      );

      set({
        assets: {
          ...assets,
          totalValueUSD: totalValue,
          positions: updatedPositions,
        },
        isCalculating: false,
      });
    } catch (error) {
      console.error('Calculate PnL error:', error);
      set({ isCalculating: false });
    }
  },

  /**
   * 防抖版本的 calculatePnL（避免频繁计算）
   */
  calculatePnLDebounced: debounce(() => {
    get().calculatePnL();
  }, 1000),
}));
