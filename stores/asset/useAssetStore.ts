import { create } from 'zustand';
import { AssetState } from '@/types/store';
import { AssetData, Position } from '@/types/market';

/**
 * 防抖函数
 */
function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

/**
 * 资产 Store
 * 职责：管理用户资产、持仓、盈亏计算
 *
 * 注意：需要外部传入真实的持仓数据
 * 可以从：
 * 1. 链上查询代币余额（通过 Wagmi/Viem）
 * 2. 本地交易历史记录
 * 3. 后端 API（如果有）
 */
export const useAssetStore = create<AssetState>((set, get) => ({
  assets: null,
  isCalculating: false,

  /**
   * 加载资产数据
   * 需要外部传入真实的钱包地址和代币数据
   */
  loadAssets: async (walletAddress?: string, positions?: Position[]) => {
    set({ isCalculating: true });

    try {
      // 如果没有提供持仓数据，返回空资产
      if (!positions || positions.length === 0) {
        set({
          assets: {
            totalValueUSD: 0,
            availableUSD: 0,
            frozenUSD: 0,
            positions: [],
          },
          isCalculating: false,
        });
        return;
      }

      // 计算总价值
      const totalValue = positions.reduce(
        (sum, pos) => sum + (pos.currentPrice || pos.costPrice) * pos.quantity,
        0,
      );

      // 计算可用余额（稳定币）
      const availableUSD = positions
        .filter((pos) => ['USDC', 'USDT', 'DAI', 'BUSD'].includes(pos.symbol))
        .reduce((sum, pos) => sum + pos.quantity * (pos.currentPrice || 1), 0);

      const assets: AssetData = {
        totalValueUSD: totalValue,
        availableUSD,
        frozenUSD: totalValue - availableUSD,
        positions,
      };

      set({ assets, isCalculating: false });
    } catch (error) {
      console.error('Load assets error:', error);
      set({
        assets: {
          totalValueUSD: 0,
          availableUSD: 0,
          frozenUSD: 0,
          positions: [],
        },
        isCalculating: false,
      });
    }
  },

  /**
   * 计算盈亏（实时）
   * 需要外部传入最新的代币价格
   */
  calculatePnL: (priceMap?: Record<string, number>) => {
    const { assets } = get();
    if (!assets || !priceMap) {return;}

    set({ isCalculating: true });

    try {
      // 更新持仓的当前价格和盈亏
      const updatedPositions = assets.positions.map((pos) => {
        const currentPrice = priceMap[pos.symbol] || pos.currentPrice || pos.costPrice;
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
        0,
      );

      const availableUSD = updatedPositions
        .filter((pos) => ['USDC', 'USDT', 'DAI', 'BUSD'].includes(pos.symbol))
        .reduce((sum, pos) => sum + pos.quantity * (pos.currentPrice || 1), 0);

      set({
        assets: {
          ...assets,
          totalValueUSD: totalValue,
          availableUSD,
          frozenUSD: totalValue - availableUSD,
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
  calculatePnLDebounced: debounce((priceMap?: Record<string, number>) => {
    get().calculatePnL(priceMap);
  }, 1000),
}));
