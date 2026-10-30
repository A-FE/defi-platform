import { KlineBar, TickerData, DepthData, DepthItem } from '@/types/market';

/**
 * Bitquery 数据适配器
 * 将 Bitquery API 响应转换为标准数据格式
 */

interface BitqueryTrade {
  Block?: { Time: string };
  Trade?: {
    open: string;
    high: string;
    low: string;
    close: string;
    price: string;
    high24h: string;
    low24h: string;
    Price: string;
    Amount: string;
  };
  volume?: string;
  volume24h?: string;
}

/**
 * 适配 K线数据
 * ✅ 修复：去重相同时间戳的数据，合并 OHLCV
 */
export function adaptKlineData(trades: BitqueryTrade[]): KlineBar[] {
  console.info('[adaptKlineData] Input:', { tradesCount: trades?.length });

  if (!trades || trades.length === 0) {
    console.warn('[adaptKlineData] No trades data');
    return [];
  }

  // 🐛 调试：打印第一条数据
  console.info('[adaptKlineData] Sample trade:', JSON.stringify(trades[0], null, 2));

  // 先转换数据
  const bars = trades.map((trade) => {
    const time = Math.floor(new Date(trade.Block?.Time ?? Date.now()).getTime() / 1000);

    return {
      time,
      open: parseFloat(trade.Trade?.open ?? '0'),
      high: parseFloat(trade.Trade?.high ?? '0'),
      low: parseFloat(trade.Trade?.low ?? '0'),
      close: parseFloat(trade.Trade?.close ?? '0'),
      volume: parseFloat(trade.volume ?? '0'),
    };
  });

  console.info('[adaptKlineData] Converted bars:', bars.length);

  // ✅ 按时间戳分组，合并相同时间戳的数据
  const mergedMap = new Map<number, KlineBar>();

  bars.forEach((bar) => {
    const existing = mergedMap.get(bar.time);

    if (existing) {
      // 合并同一时间戳的数据
      existing.high = Math.max(existing.high, bar.high);
      existing.low = Math.min(existing.low, bar.low);
      existing.close = bar.close; // 使用最新的收盘价
      existing.volume += bar.volume; // 累加成交量
    } else {
      mergedMap.set(bar.time, { ...bar });
    }
  });

  // 转换为数组并按时间升序排序
  const result = Array.from(mergedMap.values()).sort((a, b) => a.time - b.time);
  console.info('[adaptKlineData] Final result:', { count: result.length, first: result[0], last: result[result.length - 1] });

  return result;
}

/**
 * 适配 Ticker 数据
 */
export function adaptTickerData(data: BitqueryTrade[], symbol: string): TickerData {
  console.info('[adaptTickerData] Input:', { dataLength: data?.length, symbol });

  if (!data || data.length === 0) {
    console.warn('[adaptTickerData] No data, returning zero values');
    return {
      symbol,
      price: 0,
      change24h: 0,
      volume24h: 0,
      high24h: 0,
      low24h: 0,
      timestamp: Date.now(),
    };
  }

  // 🐛 调试：打印第一条数据
  console.info('[adaptTickerData] Sample trade:', JSON.stringify(data[0], null, 2));

  // 汇总所有交易数据
  const latestTrade = data[0];
  const latestPrice = parseFloat(latestTrade.Trade?.price ?? '0');

  // 计算 24h 统计
  const high24h = Math.max(...data.map((t) => parseFloat(t.Trade?.high24h ?? '0')));
  const low24h = Math.min(...data.map((t) => parseFloat(t.Trade?.low24h ?? String(latestPrice))));
  const volume24h = data.reduce((sum, t) => sum + parseFloat(t.volume24h ?? '0'), 0);

  // 计算涨跌幅（使用 24h 前的价格）
  const oldestPrice = parseFloat(data[data.length - 1]?.Trade?.price ?? String(latestPrice));
  const change24h = oldestPrice !== 0 ? ((latestPrice - oldestPrice) / oldestPrice) * 100 : 0;

  const result = {
    symbol,
    price: latestPrice,
    change24h: parseFloat(change24h.toFixed(2)),
    volume24h,
    high24h,
    low24h,
    timestamp: Date.now(),
  };

  console.info('[adaptTickerData] Result:', result);
  return result;
}

/**
 * 适配订单簿数据（降级方案：使用最近交易模拟）
 *
 * ⚠️ 重要：Bitquery 只返回实际成交记录，不是真实的订单簿挂单
 * 使用以下策略模拟买卖盘：
 * 1. 计算最近交易的中间价
 * 2. 低于中间价的交易视为买盘（bids）
 * 3. 高于中间价的交易视为卖盘（asks）
 */
export function adaptDepthData(trades: BitqueryTrade[]): DepthData {
  if (!trades || trades.length === 0) {
    return {
      bids: [],
      asks: [],
      sequence: Date.now(),
      timestamp: Date.now(),
    };
  }

  // 收集所有价格并计算中间价
  const prices = trades
    .map((trade) => parseFloat(trade.Trade?.Price ?? '0'))
    .filter((price) => !isNaN(price) && price > 0);

  if (prices.length === 0) {
    console.warn('[adaptDepthData] No valid prices found');
    return {
      bids: [],
      asks: [],
      sequence: Date.now(),
      timestamp: Date.now(),
    };
  }

  // 计算中间价（取平均值）
  const midPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  console.info(`[adaptDepthData] Mid price: ${midPrice.toFixed(2)}, total trades: ${trades.length}`);

  // 按价格聚合交易
  const bidsMap = new Map<number, number>();
  const asksMap = new Map<number, number>();

  trades.forEach((trade) => {
    const price = parseFloat(trade.Trade?.Price ?? '0');
    const amount = parseFloat(trade.Trade?.Amount ?? '0');

    if (!price || !amount || isNaN(price) || isNaN(amount)) {
      return;
    }

    // 价格聚合到小数点后 2 位
    const priceKey = Math.floor(price * 100) / 100;

    // 根据价格与中间价的关系分配到买卖盘
    if (price <= midPrice) {
      // 低于或等于中间价 → 买盘
      bidsMap.set(priceKey, (bidsMap.get(priceKey) || 0) + amount);
    } else {
      // 高于中间价 → 卖盘
      asksMap.set(priceKey, (asksMap.get(priceKey) || 0) + amount);
    }
  });

  // 转换为数组并排序
  const bids: DepthItem[] = Array.from(bidsMap.entries())
    .map(([price, quantity]) => ({ price, quantity }))
    .sort((a, b) => b.price - a.price) // 买盘：价格从高到低
    .slice(0, 20);

  const asks: DepthItem[] = Array.from(asksMap.entries())
    .map(([price, quantity]) => ({ price, quantity }))
    .sort((a, b) => a.price - b.price) // 卖盘：价格从低到高
    .slice(0, 20);

  // 计算累计量
  let cumulativeBids = 0;
  bids.forEach((item) => {
    cumulativeBids += item.quantity;
    item.total = cumulativeBids;
  });

  let cumulativeAsks = 0;
  asks.forEach((item) => {
    cumulativeAsks += item.quantity;
    item.total = cumulativeAsks;
  });

  return {
    bids,
    asks,
    sequence: Date.now(),
    timestamp: Date.now(),
  };
}
