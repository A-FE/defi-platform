import { readContracts } from 'wagmi/actions';
import { erc20Abi, formatUnits } from 'viem';
import { wagmiConfig } from '@/config/wagmi';
import { Position } from '@/types/market';

/**
 * 常见 ERC20 代币配置
 * 可以根据需要添加更多代币
 */
const COMMON_TOKENS = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`,
    decimals: 6,
    chainId: 1, // Ethereum Mainnet
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as `0x${string}`,
    decimals: 6,
    chainId: 1,
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as `0x${string}`,
    decimals: 18,
    chainId: 1,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`,
    decimals: 18,
    chainId: 1,
  },
];

/**
 * 查询钱包的代币余额
 */
export async function getTokenBalances(
  walletAddress: string,
): Promise<{ symbol: string; balance: number; tokenAddress: string }[]> {
  try {
    const contracts = COMMON_TOKENS.map((token) => ({
      address: token.address,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [walletAddress as `0x${string}`],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chainId: token.chainId as any, // 使用 any 绕过严格的 chainId 类型检查
    }));

    const results = await readContracts(wagmiConfig, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contracts: contracts as any, // 使用 any 绕过类型检查
    });

    return results
      .map((result, index) => {
        const token = COMMON_TOKENS[index];
        if (result.status === 'success' && result.result) {
          const balance = Number(formatUnits(result.result as bigint, token.decimals));
          return {
            symbol: token.symbol,
            balance,
            tokenAddress: token.address,
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && item.balance > 0);
  } catch (error) {
    console.error('Failed to fetch token balances:', error);
    return [];
  }
}

/**
 * 将代币余额转换为持仓数据
 * 注意：这里暂时使用余额作为成本价（假设成本价等于当前价格）
 * 实际应用中应该从交易历史记录计算真实的成本价
 */
export function convertBalancesToPositions(
  balances: { symbol: string; balance: number; tokenAddress: string }[],
  priceMap: Record<string, number>,
): Position[] {
  return balances.map((balance) => {
    const currentPrice = priceMap[balance.symbol] || 0;
    const costPrice = currentPrice; // 暂时假设成本价等于当前价

    return {
      symbol: balance.symbol,
      tokenMint: balance.tokenAddress,
      quantity: balance.balance,
      costPrice,
      currentPrice,
      unrealizedPnL: 0, // 成本价 = 当前价，所以盈亏为 0
      pnlPercent: 0,
    };
  });
}
