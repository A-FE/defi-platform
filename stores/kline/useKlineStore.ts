import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { KlineState } from '@/types/store';
import { KlineInterval, KlineBar } from '@/types/market';
import { klineSessionManager, TimeAlignmentUtil } from '@/services/mock/kline';

/**
 * 辅助函数：获取 K 线周期对应的秒数
 */
function getIntervalSeconds(interval: KlineInterval): number {
  const map: Record<KlineInterval, number> = {
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
 * K线 Store V2 - 前端计算版本
 * 职责：管理原始 K线数据、缓存、订阅
 * 改变：不再处理指标，指标计算由 IndicatorManager 负责
 */
export const useKlineStore = create<KlineState>()(
  persist(
    (set, get) => ({
      bars: [],
      interval: '15m',
      cache: {},
      isLoading: false,

      /**
       * ✅ 简化：只获取原始 K线数据
       * @param symbol 交易对
       * @param interval K线周期
       * @param from 开始时间（UTC 秒）
       * @param to 结束时间（UTC 秒）
       */
      fetchKlines: async (symbol, interval, from, to) => {
        set({ isLoading: true });

        try {
          // 🔧 开发模式：使用 mock 数据
          const useMock = process.env.NODE_ENV === 'development' ||
                          !process.env.NEXT_PUBLIC_KLINE_API_ENABLED;

          if (useMock) {
            console.log('[DEV MODE] fetchKlines:', {
              symbol,
              interval,
              from: new Date(from * 1000).toISOString(),
              to: new Date(to * 1000).toISOString(),
            });

            // 生成基础 K 线数据
            const session = klineSessionManager.getOrCreateSession(symbol, interval);
            const limit = Math.ceil((to - from) / getIntervalSeconds(interval));

            // 使用 before 参数生成指定时间范围之前的历史数据
            const bars = session.generateHistory(limit, to);

            // ✅ 直接返回原始 K线，不计算指标
            get().saveToCache(symbol, interval, bars);
            set({ bars, interval, isLoading: false });
            return bars;
          }

          // 🚀 生产模式：调用真实后端接口
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/klines?` +
            `symbol=${symbol}&interval=${interval}&from=${from}&to=${to}`
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch klines: ${response.statusText}`);
          }

          const data = await response.json();
          const bars: KlineBar[] = data.bars || data;

          get().saveToCache(symbol, interval, bars);
          set({ bars, interval, isLoading: false });
          return bars;

        } catch (error) {
          console.error('[fetchKlines] 获取数据失败:', error);
          set({ isLoading: false });
          return [];
        }
      },

      /**
       * ✅ 简化：订阅只推送原始 K线，不计算指标
       */
      subscribeBars: (symbol, interval, lastBar, callback) => {
        // 获取该 symbol+interval 的会话
        const session = klineSessionManager.getOrCreateSession(symbol, interval);

        // 根据K线周期动态调整更新频率
        const updateIntervalMap: Record<KlineInterval, number> = {
          '1m': 1000,   // 1秒
          '5m': 1000,   // 1秒
          '15m': 2000,  // 2秒
          '1h': 2000,   // 2秒
          '4h': 5000,   // 5秒
          '1d': 5000,   // 5秒
          '1w': 5000,   // 5秒
        };
        const updateInterval = updateIntervalMap[interval] || 2000;

        // 使用统一的时间对齐工具计算当前 bar 的时间
        let lastBarTime = lastBar.time;

        // 开发阶段：使用会话生成实时更新
        const mockInterval = setInterval(() => {
          try {
            // 每次都重新计算当前对齐的时间戳，确保准确性
            const currentBarTime = TimeAlignmentUtil.getCurrentAlignedTime(interval);

            // 生成实时更新
            const bar = session.generateRealtimeUpdate(currentBarTime);

            // 只有时间戳有效时才回调
            if (TimeAlignmentUtil.validateBarTime(bar.time, lastBarTime)) {
              lastBarTime = bar.time;

              // ✅ 直接回调原始 K线
              callback(bar);

              // 更新 Store 中的最新 bar
              get().updateBar(symbol, bar);
            }
          } catch (error) {
            console.error('[subscribeBars] 生成实时更新失败:', error);
          }
        }, updateInterval);

        // 返回取消订阅函数
        return () => {
          clearInterval(mockInterval);
          // 销毁该会话，清理状态
          klineSessionManager.destroySession(symbol, interval);
        };
      },

      /**
       * 取消订阅
       */
      unsubscribeBars: (symbol, interval) => {
        // 销毁对应的会话，清理状态
        klineSessionManager.destroySession(symbol, interval);
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

        if (!cached) return null;

        // 缓存有效期：5 分钟
        const isExpired = Date.now() - cached.timestamp > 5 * 60 * 1000;
        if (isExpired) return null;

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
    }
  )
);
