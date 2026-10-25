import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { KlineState } from '@/types/store';
import { KlineInterval } from '@/types/market';
import { klineSessionManager } from '@/services/mock/kline';
import { bitqueryKlineService } from '@/services/bitquery';

/**
 * 辅助函数：获取 K 线周期对应的秒数
 */
function getIntervalSeconds(interval: KlineInterval): number {
  const map: Record<KlineInterval, number> = {
    'timesharing': 1,  // 分时图：1秒
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
    '1w': 604800,
  };
  return map[interval] || 3600;
}

/**
 * K线 Store V3 - Bitquery 集成版本
 * 职责：管理原始 K线数据、缓存、订阅
 * 数据源：优先使用 Bitquery，降级到 Mock
 */
export const useKlineStore = create<KlineState>()(
  persist(
    (set, get) => ({
      bars: [],
      interval: '1h',
      cache: {},
      isLoading: false,

      /**
       * ✅ V3：支持 Bitquery + Mock 降级
       * @param symbol 交易对
       * @param interval K线周期
       * @param from 开始时间（UTC 秒）
       * @param to 结束时间（UTC 秒）
       */
      fetchKlines: async (symbol, interval, from, to) => {
        set({ isLoading: true });

        try {
          // 检查是否启用 Bitquery（支持客户端和服务端环境变量）
          const apiKey = process.env.NEXT_PUBLIC_BITQUERY_API_KEY || process.env.BITQUERY_API_KEY;
          const useBitquery = process.env.NEXT_PUBLIC_USE_BITQUERY === 'true' && Boolean(apiKey);

          console.info('[KlineStore] Config:', {
            useBitquery,
            hasApiKey: Boolean(apiKey),
            useFlag: process.env.NEXT_PUBLIC_USE_BITQUERY,
            apiKeyPrefix: `${apiKey?.substring(0, 15)  }...`,
          });

          // 🎭 Mock 模式
          if (!useBitquery) {
            console.info('[Mock Mode] fetchKlines:', {
              symbol,
              interval,
              limit: Math.ceil((to - from) / getIntervalSeconds(interval)),
            });

            // 使用 Mock 服务生成 K线数据
            const limit = Math.ceil((to - from) / getIntervalSeconds(interval));
            const session = klineSessionManager.getOrCreateSession(symbol, interval);
            const bars = session.generateHistory(limit, to);

            console.info('[Mock] Generated', bars.length, 'bars');
            get().saveToCache(symbol, interval, bars);
            set({ bars, interval, isLoading: false });
            return bars;
          }

          console.info('[Bitquery Mode] fetchKlines:', {
            symbol,
            interval,
            from: new Date(from * 1000).toISOString(),
            to: new Date(to * 1000).toISOString(),
          });

          // 🚀 从 Bitquery 获取数据
          const bars = await bitqueryKlineService.fetchKlineData(symbol, interval, from, to);

          if (bars && bars.length > 0) {
            console.info('[Bitquery] Fetched', bars.length, 'bars');
            get().saveToCache(symbol, interval, bars);
            set({ bars, interval, isLoading: false });
            return bars;
          }

          // 如果 Bitquery 返回空数据
          console.warn('[Bitquery] No data available for', symbol);
          set({ bars: [], interval, isLoading: false });
          return [];
        } catch (error) {
          console.error('[KlineStore] Fetch error:', error);
          set({ bars: [], interval, isLoading: false });
          return [];
        }
      },

      /**
       * 订阅实时 K线更新（仅 Bitquery 模式）
       */
      subscribeBars: (_symbol, _interval, _lastBar, _callback) => {
        console.warn('[subscribeBars] Real-time updates not available without WebSocket');
        // 返回空的取消订阅函数
        return () => {};
      },

      /**
       * 取消订阅
       */
      unsubscribeBars: (symbol, interval) => {
        console.info('[unsubscribeBars] Cleanup for', symbol, interval);
      },

      /**
       * ✅ 简化：更新最新的 K线
       */
      updateBar: (symbol, bar) => {
        set((state) => {
          const bars = [...state.bars];
          const lastBar = bars[bars.length - 1];

          // 如果是同一根 K线（时间相同），则更新
          if (lastBar && lastBar.time === bar.time) {
            bars[bars.length - 1] = bar;
          } else {
            // 否则添加新 K线
            bars.push(bar);
          }

          return { bars };
        });
      },

      /**
       * 从缓存获取数据
       */
      getFromCache: (symbol, interval) => {
        const cacheKey = `${symbol}_${interval}`;
        const cached = get().cache[cacheKey];

        if (!cached) {return null;}

        // 缓存有效期：5 分钟
        const isExpired = Date.now() - cached.timestamp > 5 * 60 * 1000;
        if (isExpired) {return null;}

        // 确保 time 字段是 number 类型（防止序列化问题）
        const bars = cached.bars.map((bar) => ({
          ...bar,
          time: typeof bar.time === 'number' ? bar.time : Number(bar.time),
        }));

        return bars;
      },

      /**
       * 保存到缓存
       */
      saveToCache: (symbol, interval, bars) => {
        const cacheKey = `${symbol}_${interval}`;
        set((state) => ({
          cache: {
            ...state.cache,
            [cacheKey]: {
              bars,
              timestamp: Date.now(),
            },
          },
        }));
      },
    }),
    {
      name: 'kline-cache',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ cache: state.cache }), // 只持久化缓存
    },
  ),
);
