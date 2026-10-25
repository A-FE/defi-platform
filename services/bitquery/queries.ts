/**
 * Bitquery GraphQL 查询定义
 * 文档：https://docs.bitquery.io/v2/
 */

/**
 * K线数据查询
 * 获取指定时间范围内的 OHLCV 数据
 */
export const KLINE_QUERY = `
  query GetKlineData(
    $network: evm_network!
    $baseCurrency: String!
    $quoteCurrency: String!
    $from: DateTime!
    $to: DateTime!
    $interval: Int!
  ) {
    EVM(network: $network) {
      DEXTradeByTokens(
        where: {
          Trade: {
            Currency: { SmartContract: { is: $baseCurrency } }
            Side: { Currency: { SmartContract: { is: $quoteCurrency } } }
          }
          Block: { Time: { since: $from, till: $to } }
        }
        orderBy: { descending: Block_Time }
        limit: { count: 10000 }
      ) {
        Block {
          Time(interval: { in: minutes, count: $interval })
        }
        Trade {
          open: Price(minimum: Block_Number)
          high: Price(maximum: Block_Number)
          low: Price(minimum: Block_Number)
          close: Price(maximum: Block_Number)
        }
        volume: sum(of: Trade_Amount)
        count
      }
    }
  }
`;

/**
 * 24小时 Ticker 数据查询
 */
export const TICKER_QUERY = `
  query GetTicker24h(
    $network: evm_network!
    $baseCurrency: String!
    $quoteCurrency: String!
  ) {
    EVM(network: $network) {
      DEXTradeByTokens(
        where: {
          Trade: {
            Currency: { SmartContract: { is: $baseCurrency } }
            Side: { Currency: { SmartContract: { is: $quoteCurrency } } }
          }
          Block: { Time: { since: "24 hours ago" } }
        }
        limit: { count: 10000 }
      ) {
        Trade {
          price: Price
          high24h: Price(maximum: Block_Number)
          low24h: Price(minimum: Block_Number)
        }
        volume24h: sum(of: Trade_Amount)
        trades: count
      }
    }
  }
`;

/**
 * 最近交易查询（用于模拟订单簿）
 */
export const RECENT_TRADES_QUERY = `
  query GetRecentTrades(
    $network: evm_network!
    $baseCurrency: String!
    $quoteCurrency: String!
    $limit: Int!
  ) {
    EVM(network: $network) {
      DEXTradeByTokens(
        where: {
          Trade: {
            Currency: { SmartContract: { is: $baseCurrency } }
            Side: { Currency: { SmartContract: { is: $quoteCurrency } } }
          }
        }
        orderBy: { descending: Block_Time }
        limit: { count: $limit }
      ) {
        Block {
          Time
        }
        Trade {
          Price
          Amount
          Side {
            Type
          }
        }
      }
    }
  }
`;
