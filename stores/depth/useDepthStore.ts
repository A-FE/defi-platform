import { create } from 'zustand';
import { DepthState } from '@/types/store';
import { DepthItem } from '@/types/market';
import { wsCenter } from '@/services/websocket';
import { depthMockService } from '@/services/mock';
import { DEPTH_LEVELS } from '@/constants/api';

/**
 * 订单簿 Store
 * 职责：管理订单簿深度数据
 */
export const useDepthStore = create<DepthState>((set, get) => ({
  bids: [],
  asks: [],
  sequence: 0,
  changedPrices: new Set(),

  /**
   * 订阅订单簿深度
   */
  subscribe: (symbol: string) => {
    // 1. 首次获取快照
    const snapshot = depthMockService.generateSnapshot(symbol, DEPTH_LEVELS);
    get().handleSnapshot(snapshot);

    // 2. 订阅增量更新
    const unsubscribeSnapshot = wsCenter.subscribe('depth_snapshot', (message) => {
      if (message.symbol === symbol) {
        get().handleSnapshot(message);
      }
    });

    const unsubscribeUpdate = wsCenter.subscribe('depth_update', (message) => {
      if (message.symbol === symbol) {
        get().handleUpdate(message);
      }
    });

    // 开发阶段：使用 Mock 数据模拟实时更新
    const mockInterval = setInterval(() => {
      const update = depthMockService.generateUpdate(symbol);
      get().handleUpdate(update);
    }, 100); // 每 100ms 更新一次（高频）

    // 清理函数
    return () => {
      unsubscribeSnapshot();
      unsubscribeUpdate();
      clearInterval(mockInterval);
    };
  },

  /**
   * 取消订阅
   */
  unsubscribe: (symbol: string) => {
    wsCenter.unsubscribeSymbol(symbol, ['depth_snapshot', 'depth_update']);
  },

  /**
   * 处理快照
   */
  handleSnapshot: (data: any) => {
    set({
      bids: data.bids || [],
      asks: data.asks || [],
      sequence: data.sequence || 0,
      changedPrices: new Set(),
    });
  },

  /**
   * 处理增量更新
   */
  handleUpdate: (data: any) => {
    const { bids: currentBids, asks: currentAsks, sequence: currentSeq } = get();

    // 序列号校验（防乱序）
    if (data.sequence && data.sequence <= currentSeq) {
      console.warn('[Depth] Outdated update, ignoring');
      return;
    }

    const changedPrices = new Set<number>();
    let newBids = [...currentBids];
    let newAsks = [...currentAsks];

    // 更新买盘
    if (data.bids && data.bids.length > 0) {
      newBids = updateDepthSide(newBids, data.bids, 'desc', changedPrices);
      newBids = newBids.slice(0, DEPTH_LEVELS); // 裁剪只保留指定档位
    }

    // 更新卖盘
    if (data.asks && data.asks.length > 0) {
      newAsks = updateDepthSide(newAsks, data.asks, 'asc', changedPrices);
      newAsks = newAsks.slice(0, DEPTH_LEVELS);
    }

    set({
      bids: newBids,
      asks: newAsks,
      sequence: data.sequence || currentSeq,
      changedPrices,
    });

    // 1 秒后清除高亮
    setTimeout(() => {
      set({ changedPrices: new Set() });
    }, 1000);
  },
}));

/**
 * 更新深度一侧
 */
function updateDepthSide(
  current: DepthItem[],
  updates: DepthItem[] | [number, number][],
  order: 'asc' | 'desc',
  changedPrices: Set<number>
): DepthItem[] {
  const map = new Map<number, number>();

  // 将当前数据放入 Map
  current.forEach((item) => map.set(item.price, item.quantity));

  // 应用增量更新
  updates.forEach((item) => {
    const price = Array.isArray(item) ? item[0] : item.price;
    const quantity = Array.isArray(item) ? item[1] : item.quantity;

    changedPrices.add(price);

    if (quantity === 0) {
      map.delete(price); // 数量 = 0，删除该档位
    } else {
      map.set(price, quantity);
    }
  });

  // 排序 + 计算累计量
  const sortedItems = Array.from(map.entries())
    .map(([price, quantity]) => ({ price, quantity }))
    .sort((a, b) => (order === 'desc' ? b.price - a.price : a.price - b.price));

  // 计算累计量
  let cumulativeTotal = 0;
  return sortedItems.map((item) => {
    cumulativeTotal += item.quantity;
    return {
      ...item,
      total: cumulativeTotal,
    };
  });
}
