import { http, createConfig } from 'wagmi';
import { mainnet, polygon } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

/**
 * Wagmi 配置
 * 使用支持 CORS 的公共 RPC 端点
 */
export const wagmiConfig = createConfig({
  chains: [mainnet, polygon],
  connectors: [
    injected({
      target: 'metaMask',
    }),
  ],
  transports: {
    // 使用 Cloudflare 的公共 RPC（支持 CORS）
    [mainnet.id]: http('https://cloudflare-eth.com'),
    [polygon.id]: http('https://polygon-rpc.com'),
  },
  ssr: true,
});
