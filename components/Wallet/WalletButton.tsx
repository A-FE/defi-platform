'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

/**
 * 钱包连接按钮 - 使用纯 Wagmi
 * 避免 RainbowKit 的依赖问题
 */
export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // 格式化地址
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      // 使用第一个可用的连接器（MetaMask）
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
    >
      {isPending ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          连接中...
        </span>
      ) : isConnected && address ? (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full" />
          {formatAddress(address)}
        </span>
      ) : (
        '连接钱包'
      )}
    </button>
  );
}

export default WalletButton;
