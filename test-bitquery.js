/**
 * Bitquery API 连接测试脚本
 * 测试 K线数据、Ticker 数据和交易数据的获取
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

const BITQUERY_API_KEY = process.env.BITQUERY_API_KEY;
const BITQUERY_ENDPOINT = 'https://streaming.bitquery.io/eap';

// WETH 合约地址
const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

/**
 * 测试 K线数据查询
 */
async function testKlineQuery() {
  console.log('\n🔍 测试 K线数据查询...');

  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 24 * 60 * 60;

  const query = `
    query GetKlineData($from: DateTime!, $to: DateTime!) {
      EVM(network: eth) {
        DEXTradeByTokens(
          orderBy: {descending: Block_Time}
          where: {
            Trade: {
              Currency: {SmartContract: {is: "${WETH_ADDRESS}"}}
              Side: {Currency: {SmartContract: {is: "${USDC_ADDRESS}"}}}
            }
            Block: {Time: {since: $from, till: $to}}
          }
          limit: {count: 100}
        ) {
          Block {
            Time(interval: {in: minutes, count: 60})
          }
          Trade {
            high: Price(maximum: Trade_Price)
            low: Price(minimum: Trade_Price)
            open: Price(minimum: Block_Number)
            close: Price(maximum: Block_Number)
          }
          volume: sum(of: Trade_Amount)
          count
        }
      }
    }
  `;

  try {
    const response = await fetch(BITQUERY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BITQUERY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        variables: {
          from: new Date(oneDayAgo * 1000).toISOString(),
          to: new Date(now * 1000).toISOString(),
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ K线查询失败:', JSON.stringify(data.errors, null, 2));
      return false;
    }

    const trades = data.data?.EVM?.DEXTradeByTokens || [];
    console.log(`✅ K线数据获取成功: ${trades.length} 条记录`);

    if (trades.length > 0) {
      console.log('📊 示例数据:', JSON.stringify(trades[0], null, 2));
    }

    return true;
  } catch (error) {
    console.error('❌ K线查询异常:', error.message);
    return false;
  }
}

/**
 * 测试 Ticker 数据查询
 */
async function testTickerQuery() {
  console.log('\n🔍 测试 Ticker 数据查询...');

  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 24 * 60 * 60;

  const query = `
    query GetTickerData($from: DateTime!, $to: DateTime!) {
      EVM(network: eth) {
        DEXTradeByTokens(
          where: {
            Trade: {
              Currency: {SmartContract: {is: "${WETH_ADDRESS}"}}
              Side: {Currency: {SmartContract: {is: "${USDC_ADDRESS}"}}}
            }
            Block: {Time: {since: $from, till: $to}}
          }
        ) {
          Trade {
            high: Price(maximum: Trade_Price)
            low: Price(minimum: Trade_Price)
            open: Price(minimum: Block_Number)
            close: Price(maximum: Block_Number)
          }
          volume: sum(of: Trade_Amount)
          count
        }
      }
    }
  `;

  try {
    const response = await fetch(BITQUERY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BITQUERY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        variables: {
          from: new Date(oneDayAgo * 1000).toISOString(),
          to: new Date(now * 1000).toISOString(),
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ Ticker 查询失败:', JSON.stringify(data.errors, null, 2));
      return false;
    }

    const result = data.data?.EVM?.DEXTradeByTokens?.[0];
    if (result) {
      console.log('✅ Ticker 数据获取成功:');
      console.log(`  - 最高价: ${result.Trade.high}`);
      console.log(`  - 最低价: ${result.Trade.low}`);
      console.log(`  - 开盘价: ${result.Trade.open}`);
      console.log(`  - 收盘价: ${result.Trade.close}`);
      console.log(`  - 成交量: ${result.volume}`);
      console.log(`  - 交易笔数: ${result.count}`);
    } else {
      console.log('⚠️  未获取到 Ticker 数据');
    }

    return true;
  } catch (error) {
    console.error('❌ Ticker 查询异常:', error.message);
    return false;
  }
}

/**
 * 测试最近交易查询
 */
async function testRecentTrades() {
  console.log('\n🔍 测试最近交易查询...');

  const query = `
    query GetRecentTrades {
      EVM(network: eth) {
        DEXTradeByTokens(
          orderBy: {descending: Block_Time}
          where: {
            Trade: {
              Currency: {SmartContract: {is: "${WETH_ADDRESS}"}}
              Side: {Currency: {SmartContract: {is: "${USDC_ADDRESS}"}}}
            }
          }
          limit: {count: 50}
        ) {
          Block {
            Time
          }
          Trade {
            Price
            Amount
            Side {
              Amount
            }
            Buyer
            Seller
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(BITQUERY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BITQUERY_API_KEY}`,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ 交易查询失败:', JSON.stringify(data.errors, null, 2));
      return false;
    }

    const trades = data.data?.EVM?.DEXTradeByTokens || [];
    console.log(`✅ 最近交易获取成功: ${trades.length} 笔交易`);

    if (trades.length > 0) {
      console.log('💰 最新交易:', JSON.stringify(trades[0], null, 2));
    }

    return true;
  } catch (error) {
    console.error('❌ 交易查询异常:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('🚀 开始测试 Bitquery API 连接...');
  console.log(`📡 API Endpoint: ${BITQUERY_ENDPOINT}`);
  console.log(`🔑 API Key: ${BITQUERY_API_KEY ? BITQUERY_API_KEY.substring(0, 20) + '...' : '未设置'}`);

  if (!BITQUERY_API_KEY) {
    console.error('\n❌ 错误: 未找到 BITQUERY_API_KEY 环境变量');
    console.log('请在 .env.local 文件中设置 BITQUERY_API_KEY');
    process.exit(1);
  }

  const results = {
    kline: false,
    ticker: false,
    trades: false,
  };

  // 测试 K线数据
  results.kline = await testKlineQuery();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 测试 Ticker 数据
  results.ticker = await testTickerQuery();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 测试最近交易
  results.trades = await testRecentTrades();

  // 总结
  console.log('\n📋 测试结果总结:');
  console.log(`  K线数据: ${results.kline ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  Ticker数据: ${results.ticker ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  交易数据: ${results.trades ? '✅ 通过' : '❌ 失败'}`);

  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '🎉 所有测试通过!' : '⚠️  部分测试失败'}`);

  process.exit(allPassed ? 0 : 1);
}

main();
