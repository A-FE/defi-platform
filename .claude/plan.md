# DeFi 平台迁移技术方案
## Solana → EVM + Mock → Bitquery + 单币 → 多币切换

---

## 📋 项目概述

**目标：** 将基于 Solana 的 DeFi 行情平台迁移到 EVM 生态，使用 Bitquery API 替代 Mock 数据，并增加多币种切换功能。

**当前状态分析：**
- ✅ 框架：Next.js 14 + TypeScript + Tailwind CSS
- ✅ 图表：TradingView Lightweight Charts
- ✅ 状态管理：Zustand
- ❌ 区块链：Solana Web3.js（需要替换为 EVM）
- ❌ 数据源：Mock 数据生成器（需要替换为 Bitquery）
- ❌ 币种：单一 BTCUSDT 硬编码（需要支持多币种切换）

---

## 🎯 三大核心改造任务

### 1️⃣ Solana → EVM 迁移
### 2️⃣ Mock 数据 → Bitquery API 集成
### 3️⃣ 单币 → 多币种左侧面板切换

---

## 📐 架构设计方案

### 一、EVM 生态迁移

#### 1.1 依赖包调整

**移除：**
```json
{
  "@solana/wallet-adapter-react": "^0.15.40",
  "@solana/wallet-adapter-react-ui": "^0.9.40",
  "@solana/wallet-adapter-wallets": "^0.19.40",
  "@solana/web3.js": "^1.99.0"
}
```

**新增：**
```json
{
  "viem": "^2.21.0",              // 轻量级 EVM 库（推荐，优于 ethers）
  "wagmi": "^2.12.0",             // React Hooks for Ethereum
  "@tanstack/react-query": "^5.59.0",  // wagmi 依赖
  "@rainbow-me/rainbowkit": "^2.1.0"   // 钱包连接 UI
}
```

**理由：**
- **viem**：类型安全、轻量、现代化的 EVM 库，比 ethers.js 体积小 70%
- **wagmi**：官方推荐的 React Hooks，与 viem 深度集成
- **RainbowKit**：开箱即用的钱包连接 UI，支持 MetaMask、WalletConnect 等

#### 1.2 类型定义重构

**文件：** `types/evm.ts`（新建，替代 `types/solana.ts`）

```typescript
/**
 * 钱包信息 - EVM 版本
 */
export interface WalletInfo {
  address: `0x${string}`;      // EVM 地址格式
  chainId: number;             // 链 ID (1=Mainnet, 137=Polygon)
  connected: boolean;
  balance: bigint;             // ETH/MATIC 余额（wei 单位）
  balanceFormatted: string;    // 格式化余额（带单位）
}

/**
 * 代币信息 - ERC20
 */
export interface TokenInfo {
  address: `0x${string}`;      // 合约地址
  symbol: string;              // 代币符号
  name: string;
  decimals: number;
  logoURI?: string;
  chainId: number;             // 所属链
  balance?: bigint;
  balanceUSD?: number;
}

/**
 * 支持的 EVM 链
 */
export type EVMChain = 'ethereum' | 'polygon' | 'bsc' | 'arbitrum' | 'base';

/**
 * 链配置
 */
export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}
```

#### 1.3 代币常量更新

**文件：** `constants/tokens.ts`（重构）

```typescript
import { TokenInfo } from '@/types/evm';

/**
 * 主流 ERC20 代币（以太坊主网）
 */
export const EVM_TOKENS: Record<string, TokenInfo> = {
  ETH: {
    address: '0x0000000000000000000000000000000000000000', // 原生代币
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    chainId: 1,
    logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  },
  USDT: {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    chainId: 1,
    logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  },
  USDC: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: 1,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  WBTC: {
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    chainId: 1,
    logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  },
};

/**
 * 默认交易对
 */
export const DEFAULT_SWAP_FROM = 'ETH';
export const DEFAULT_SWAP_TO = 'USDC';
```

#### 1.4 钱包集成改造

**文件：** `app/providers.tsx`（新建）

```typescript
'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, polygon } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  appName: 'DeFi Trading Platform',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [mainnet, polygon],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL),
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

**文件：** `components/Wallet/WalletButton.tsx`（重构）

```typescript
'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function WalletButton() {
  return (
    <ConnectButton
      chainStatus="icon"
      showBalance={false}
      accountStatus={{
        smallScreen: 'avatar',
        largeScreen: 'full',
      }}
    />
  );
}
```

---

### 二、Bitquery API 集成

#### 2.1 Bitquery 接口分析

**选用方案：** Bitquery V2 (GraphQL API)

**核心端点：**
- **K线数据：** `ethereum.dexTrades` + 时间聚合
- **订单簿深度：** 暂无直接支持（降级方案：使用 DEX 最新交易模拟）
- **Ticker 行情：** `ethereum.dexTrades` + 24h 统计
- **链上资产：** `ethereum.address.balances`

**API 配置：**
```typescript
// config/bitquery.ts
export const BITQUERY_CONFIG = {
  endpoint: 'https://streaming.bitquery.io/graphql',
  apiKey: process.env.BITQUERY_API_KEY!,
  network: 'ethereum',
  dexes: ['Uniswap', 'SushiSwap', 'Curve'], // 聚合多个 DEX
};
```

#### 2.2 服务层架构

**文件结构：**
```
services/
├── bitquery/
│   ├── BitqueryClient.ts      # GraphQL 客户端封装
│   ├── queries.ts              # GraphQL 查询定义
│   ├── klineService.ts         # K线数据服务
│   ├── depthService.ts         # 订单簿服务（降级）
│   ├── tickerService.ts        # Ticker 服务
│   └── types.ts                # Bitquery 响应类型
└── adapters/
    └── bitqueryAdapter.ts      # 数据格式适配器
```

#### 2.3 K线数据服务实现

**文件：** `services/bitquery/klineService.ts`

```typescript
import { BitqueryClient } from './BitqueryClient';
import { KLINE_QUERY } from './queries';
import { KlineBar, KlineInterval } from '@/types/market';
import { bitqueryAdapter } from '../adapters/bitqueryAdapter';

export class BitqueryKlineService {
  private client: BitqueryClient;

  constructor() {
    this.client = new BitqueryClient();
  }

  /**
   * 获取 K线数据
   * @param symbol - 交易对（如 "WETH/USDC"）
   * @param interval - 周期
   * @param from - 起始时间戳（秒）
   * @param to - 结束时间戳（秒）
   */
  async fetchKlineData(
    symbol: string,
    interval: KlineInterval,
    from: number,
    to: number,
  ): Promise<KlineBar[]> {
    const [baseToken, quoteToken] = symbol.split('/');
    
    // 转换周期为 Bitquery 时间单位
    const timeInterval = this.convertInterval(interval);

    const variables = {
      network: 'ethereum',
      baseCurrency: this.getTokenAddress(baseToken),
      quoteCurrency: this.getTokenAddress(quoteToken),
      from: new Date(from * 1000).toISOString(),
      to: new Date(to * 1000).toISOString(),
      interval: timeInterval,
    };

    const response = await this.client.query(KLINE_QUERY, variables);
    
    // 适配为标准 KlineBar 格式
    return bitqueryAdapter.adaptKlineData(response.data.ethereum.dexTrades);
  }

  /**
   * 周期转换：1h → { unit: 'hour', count: 1 }
   */
  private convertInterval(interval: KlineInterval) {
    const map: Record<KlineInterval, any> = {
      '1m': { unit: 'minute', count: 1 },
      '5m': { unit: 'minute', count: 5 },
      '15m': { unit: 'minute', count: 15 },
      '1h': { unit: 'hour', count: 1 },
      '4h': { unit: 'hour', count: 4 },
      '1d': { unit: 'day', count: 1 },
      '1w': { unit: 'week', count: 1 },
      'timesharing': { unit: 'minute', count: 1 },
    };
    return map[interval];
  }

  private getTokenAddress(symbol: string): string {
    // 从 constants/tokens.ts 获取合约地址
    return EVM_TOKENS[symbol]?.address || '';
  }
}

export const bitqueryKlineService = new BitqueryKlineService();
```

#### 2.4 GraphQL 查询定义

**文件：** `services/bitquery/queries.ts`

```typescript
export const KLINE_QUERY = `
  query GetKlineData(
    $network: EthereumNetwork!,
    $baseCurrency: String!,
    $quoteCurrency: String!,
    $from: ISO8601DateTime!,
    $to: ISO8601DateTime!,
    $interval: Int!
  ) {
    ethereum(network: $network) {
      dexTrades(
        baseCurrency: { is: $baseCurrency },
        quoteCurrency: { is: $quoteCurrency },
        time: { since: $from, till: $to },
        options: { asc: "timeInterval.minute" }
      ) {
        timeInterval {
          minute(count: $interval)
        }
        baseCurrency {
          symbol
        }
        quoteCurrency {
          symbol
        }
        open: minimum(of: time, get: quote_price)
        high: maximum(of: block, get: quote_price)
        low: minimum(of: block, get: quote_price)
        close: maximum(of: time, get: quote_price)
        volume: sum(of: base_amount)
        tradeAmount(in: USD)
      }
    }
  }
`;

export const TICKER_QUERY = `
  query GetTicker24h(
    $network: EthereumNetwork!,
    $baseCurrency: String!,
    $quoteCurrency: String!
  ) {
    ethereum(network: $network) {
      dexTrades(
        baseCurrency: { is: $baseCurrency },
        quoteCurrency: { is: $quoteCurrency },
        time: { since: "24 hours ago" }
      ) {
        price: quotePrice
        high24h: maximum(of: block, get: quote_price)
        low24h: minimum(of: block, get: quote_price)
        volume24h: sum(of: base_amount)
        trades: count
      }
    }
  }
`;
```

#### 2.5 数据适配器

**文件：** `services/adapters/bitqueryAdapter.ts`

```typescript
import { KlineBar } from '@/types/market';

export const bitqueryAdapter = {
  /**
   * 将 Bitquery 响应转换为标准 KlineBar 格式
   */
  adaptKlineData(trades: any[]): KlineBar[] {
    return trades.map(trade => ({
      time: Math.floor(new Date(trade.timeInterval.minute).getTime() / 1000),
      open: parseFloat(trade.open),
      high: parseFloat(trade.high),
      low: parseFloat(trade.low),
      close: parseFloat(trade.close),
      volume: parseFloat(trade.volume),
    }));
  },

  /**
   * 适配 Ticker 数据
   */
  adaptTickerData(data: any, symbol: string) {
    const latestPrice = data[data.length - 1]?.price || 0;
    const firstPrice = data[0]?.price || latestPrice;
    const change24h = ((latestPrice - firstPrice) / firstPrice) * 100;

    return {
      symbol,
      price: parseFloat(latestPrice),
      change24h: parseFloat(change24h.toFixed(2)),
      volume24h: data.reduce((sum: number, t: any) => sum + parseFloat(t.volume24h), 0),
      high24h: Math.max(...data.map((t: any) => parseFloat(t.high24h))),
      low24h: Math.min(...data.map((t: any) => parseFloat(t.low24h))),
      timestamp: Date.now(),
    };
  },
};
```

#### 2.6 订单簿降级方案

**⚠️ 限制：** Bitquery 不直接提供实时订单簿深度，仅支持链上交易历史。

**降级策略：**
1. 使用最新 50 笔 DEX 交易数据模拟订单簿
2. 按价格聚合买单/卖单
3. 展示"基于链上交易的近似深度"标签
4. 未来考虑集成专业 DEX API（如 Uniswap V3 Subgraph）

**文件：** `services/bitquery/depthService.ts`

```typescript
export class BitqueryDepthService {
  async fetchDepthData(symbol: string): Promise<DepthData> {
    // 获取最近 50 笔交易
    const trades = await this.fetchRecentTrades(symbol, 50);
    
    // 按价格区间聚合
    const { bids, asks } = this.aggregateTrades(trades);

    return {
      bids,
      asks,
      sequence: Date.now(),
      timestamp: Date.now(),
    };
  }

  private aggregateTrades(trades: any[]): { bids: DepthItem[]; asks: DepthItem[] } {
    // 简化实现：按价格分组累加数量
    const bidsMap = new Map<number, number>();
    const asksMap = new Map<number, number>();

    trades.forEach(trade => {
      const price = Math.floor(trade.price * 100) / 100; // 2位小数聚合
      const qty = trade.amount;

      if (trade.side === 'BUY') {
        bidsMap.set(price, (bidsMap.get(price) || 0) + qty);
      } else {
        asksMap.set(price, (asksMap.get(price) || 0) + qty);
      }
    });

    // 转换为数组并排序
    const bids = Array.from(bidsMap.entries())
      .map(([price, quantity]) => ({ price, quantity }))
      .sort((a, b) => b.price - a.price)
      .slice(0, 20);

    const asks = Array.from(asksMap.entries())
      .map(([price, quantity]) => ({ price, quantity }))
      .sort((a, b) => a.price - b.price)
      .slice(0, 20);

    return { bids, asks };
  }
}
```

---

### 三、多币种切换功能

#### 3.1 UI 设计方案（左中右布局）

**布局改造：**

```
┌──────────────────────────────────────────────────────────────────┐
│                Header (Wallet + Nav)                              │
├─────────┬──────────────────────────────────────┬─────────────────┤
│         │  Ticker Bar (Price + 24h Stats)      │                 │
│  Coin   ├───────────────────────────────────────┤   Order Book   │
│  List   │                                       │                 │
│         │                                       │   📊 Asks (20)  │
│  🔍     │          K-Line Chart                 │                 │
│  [搜索]  │                                       │   ────────────  │
│         │           (主区域)                     │   💰 Bids (20)  │
│  ETH ✓  │                                       │                 │
│  BTC    │                                       │   📈 深度图      │
│  SOL    │                                       │                 │
│  BNB    │                                       │                 │
│  UNI    │                                       │                 │
│  LINK   │                                       │                 │
│  ...    │                                       │                 │
│         │                                       │                 │
└─────────┴───────────────────────────────────────┴─────────────────┘
```

**布局尺寸：**
- **左侧（Coin List）：** 220px 固定宽度
- **中间（Ticker + Chart）：** flex-1 弹性布局（占据剩余空间）
- **右侧（Order Book）：** 320px 固定宽度

**响应式策略：**
- **Desktop (≥1280px)：** 左中右三栏完整显示
- **Tablet (768px-1279px)：** 
  - 左侧面板折叠为浮动抽屉（点击图标展开）
  - 中间 + 右侧并排显示
- **Mobile (<768px)：** 
  - 左侧、右侧均折叠
  - 中间全屏显示
  - 底部增加 Tab 切换（Chart / OrderBook）

#### 3.2 币种配置列表

**文件：** `constants/markets.ts`（新建）

```typescript
import { MarketSymbol } from '@/types/market';

/**
 * 支持的交易市场列表
 */
export const MARKETS: MarketSymbol[] = [
  {
    symbol: 'WETH/USDC',
    name: 'ETH/USDC',
    baseAsset: 'WETH',
    quoteAsset: 'USDC',
    icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    dex: 'Uniswap V3',
    chainId: 1,
  },
  {
    symbol: 'WBTC/USDC',
    name: 'BTC/USDC',
    baseAsset: 'WBTC',
    quoteAsset: 'USDC',
    icon: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
    dex: 'Uniswap V3',
    chainId: 1,
  },
  {
    symbol: 'LINK/USDC',
    name: 'LINK/USDC',
    baseAsset: 'LINK',
    quoteAsset: 'USDC',
    icon: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
    dex: 'Uniswap V3',
    chainId: 1,
  },
  {
    symbol: 'UNI/USDC',
    name: 'UNI/USDC',
    baseAsset: 'UNI',
    quoteAsset: 'USDC',
    icon: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
    dex: 'Uniswap V3',
    chainId: 1,
  },
  // 可扩展更多币种...
];

export const DEFAULT_MARKET = 'WETH/USDC';
```

#### 3.3 币种列表组件（左侧面板）

**文件：** `components/MarketPanel/MarketList.tsx`（新建）

```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MARKETS } from '@/constants/markets';
import { useMarketStore } from '@/stores/market/useMarketStore';

export default function MarketList() {
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedSymbol, setSelectedSymbol } = useMarketStore();

  // 搜索过滤
  const filteredMarkets = MARKETS.filter(market =>
    market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    market.baseAsset.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-[220px] h-full bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">交易市场</h3>
      </div>

      {/* 搜索框 */}
      <div className="p-3 border-b border-gray-800">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索币种..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-800 text-white text-sm rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition-colors"
          />
          {/* 搜索图标 */}
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* 币种列表（滚动区域） */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredMarkets.length > 0 ? (
          filteredMarkets.map((market) => (
            <button
              key={market.symbol}
              onClick={() => setSelectedSymbol(market.symbol)}
              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-all duration-200 ${
                selectedSymbol === market.symbol
                  ? 'bg-purple-600/20 border-l-2 border-purple-600'
                  : 'border-l-2 border-transparent'
              }`}
            >
              {/* 币种图标 */}
              <div className="relative flex-shrink-0">
                <Image
                  src={market.icon}
                  alt={market.baseAsset}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
                {selectedSymbol === market.symbol && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 rounded-full border-2 border-gray-900" />
                )}
              </div>

              {/* 币种信息 */}
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {market.name}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {market.dex}
                </div>
              </div>

              {/* 右侧箭头（选中时显示） */}
              {selectedSymbol === market.symbol && (
                <svg
                  className="w-4 h-4 text-purple-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </button>
          ))
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">未找到匹配的币种</p>
          </div>
        )}
      </div>

      {/* 底部统计 */}
      <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
        <span className="text-xs text-gray-500">交易对数量</span>
        <span className="text-xs font-medium text-purple-400">
          {filteredMarkets.length}
        </span>
      </div>
    </div>
  );
}
```

#### 3.4 状态管理：币种切换

**文件：** `stores/market/useMarketStore.ts`（新建）

```typescript
import { create } from 'zustand';
import { DEFAULT_MARKET } from '@/constants/markets';

interface MarketState {
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  selectedSymbol: DEFAULT_MARKET,
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
}));
```

#### 3.5 页面集成（左中右布局）

**文件：** `app/market/page.tsx`（重构）

```typescript
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import TradingLayout from '@/components/Layout/TradingLayout';
import MarketList from '@/components/MarketPanel/MarketList';
import PriceTicker from '@/components/Ticker/PriceTicker';
import { useMarketStore } from '@/stores/market/useMarketStore';

const KlineChart = dynamic(() => import('@/components/Chart/KlineChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const OrderBook = dynamic(() => import('@/components/OrderBook/OrderBook'), {
  loading: () => <OrderBookSkeleton />,
  ssr: false,
});

export default function MarketPage() {
  const { selectedSymbol } = useMarketStore();

  return (
    <TradingLayout>
      {/* 左中右三栏布局 */}
      <div className="flex h-[calc(100vh-180px)]">
        {/* 左侧：币种列表（220px 固定宽度） */}
        <MarketList />

        {/* 中间：Ticker + K线图（弹性布局） */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Ticker 行情栏 */}
          <div className="px-6 py-4 bg-gray-900 border-b border-gray-800">
            <PriceTicker symbol={selectedSymbol} />
          </div>

          {/* K线图主区域 */}
          <div className="flex-1 p-4">
            <Suspense fallback={<ChartSkeleton />}>
              <KlineChart
                key={selectedSymbol}
                symbol={selectedSymbol}
                defaultInterval="1h"
              />
            </Suspense>
          </div>
        </div>

        {/* 右侧：订单簿（320px 固定宽度） */}
        <div className="w-[320px] border-l border-gray-800">
          <Suspense fallback={<OrderBookSkeleton />}>
            <OrderBook key={selectedSymbol} symbol={selectedSymbol} />
          </Suspense>
        </div>
      </div>
    </TradingLayout>
  );
}

/**
 * K线图骨架屏
 */
function ChartSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg p-4 h-full animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-48 mb-4" />
      <div className="h-[calc(100%-3rem)] bg-gray-800 rounded" />
    </div>
  );
}

/**
 * 订单簿骨架屏
 */
function OrderBookSkeleton() {
  return (
    <div className="bg-gray-900 h-full p-4 animate-pulse">
      <div className="h-6 bg-gray-800 rounded w-24 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="h-6 bg-gray-800 rounded" />
        ))}
      </div>
    </div>
  );
}
```

---

## 🔧 环境变量配置

**文件：** `.env.example`（更新）

```env
# EVM RPC URLs
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY

# Bitquery API
BITQUERY_API_KEY=your_bitquery_api_key_here

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Network (mainnet | testnet)
NEXT_PUBLIC_NETWORK=mainnet
```

---

## 📋 实施计划

### 阶段一：基础设施（第 1-2 周）
- [ ] 安装 EVM 依赖包（viem, wagmi, RainbowKit）
- [ ] 移除 Solana 依赖
- [ ] 创建 EVM 类型定义（types/evm.ts）
- [ ] 更新代币常量（constants/tokens.ts）
- [ ] 集成钱包连接（app/providers.tsx + WalletButton）

### 阶段二：Bitquery 集成（第 3-4 周）
- [ ] 创建 Bitquery 客户端（services/bitquery/BitqueryClient.ts）
- [ ] 实现 K线数据服务（klineService.ts）
- [ ] 实现 Ticker 服务（tickerService.ts）
- [ ] 实现订单簿降级方案（depthService.ts）
- [ ] 创建数据适配器（adapters/bitqueryAdapter.ts）
- [ ] 更新 Zustand stores 以使用真实 API

### 阶段三：多币种切换（第 5 周）
- [ ] 创建市场配置列表（constants/markets.ts）
- [ ] 实现币种列表组件（MarketPanel/MarketList.tsx）
- [ ] 创建市场状态管理（stores/market/useMarketStore.ts）
- [ ] 重构 market 页面布局
- [ ] 实现移动端响应式（底部 Drawer）

### 阶段四：测试与优化（第 6 周）
- [ ] 单元测试（Bitquery 服务 + 适配器）
- [ ] 集成测试（币种切换 + 数据加载）
- [ ] 性能优化（缓存策略、请求合并）
- [ ] UI/UX 调优（加载状态、错误处理）
- [ ] 文档更新（README.md + 技术文档）

---

## ⚠️ 风险与对策

### 风险 1：Bitquery API 限流
**对策：**
- 实现请求缓存（5分钟）
- 使用 SWR 或 React Query 管理缓存
- 考虑升级到付费计划

### 风险 2：订单簿数据不准确
**对策：**
- 明确标注"基于链上交易的近似深度"
- 未来集成 Uniswap V3 Subgraph 获取真实流动性
- 考虑增加 CEX API（如 Binance）作为备选

### 风险 3：多链支持复杂度
**对策：**
- 第一阶段仅支持以太坊主网
- 后续按需扩展 Polygon/BSC/Arbitrum
- 使用 wagmi 的多链能力简化实现

### 风险 4：Gas 费用高（钱包交互）
**对策：**
- 仅展示行情，不执行链上交易
- Swap 功能考虑集成 1inch/0x 聚合器
- 提供 Gas 费用预估

---

## 📊 成功指标

| 指标 | 目标 |
|------|------|
| **API 响应时间** | K线数据 < 2s |
| **数据准确性** | 与 CEX 价格误差 < 1% |
| **币种覆盖** | 至少 10 个主流币种 |
| **页面加载时间** | LCP < 2.5s |
| **错误率** | API 失败率 < 1% |

---

## 🎯 待确认事项

1. **Bitquery 付费计划：** 是否需要升级到付费版本？（免费版有请求限制）
2. **DEX 选择：** 默认使用 Uniswap V3，是否需要支持 SushiSwap/Curve？
3. **链支持优先级：** 以太坊主网 → Polygon → BSC → Arbitrum？
4. **订单簿降级方案：** 是否接受"近似深度"方案，还是考虑集成 CEX API？
5. **移动端设计：** 左侧面板在移动端是否改为底部抽屉？

---

## 📚 参考文档

- [Bitquery V2 API 文档](https://docs.bitquery.io/)
- [Viem 官方文档](https://viem.sh/)
- [Wagmi 官方文档](https://wagmi.sh/)
- [RainbowKit 文档](https://www.rainbowkit.com/)
- [Uniswap V3 Subgraph](https://thegraph.com/hosted-service/subgraph/uniswap/uniswap-v3)

---

**方案版本：** v1.0  
**创建时间：** 2026-10-24  
**预计工期：** 6 周  
**作者：** Claude Code
