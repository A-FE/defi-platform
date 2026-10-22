'use client';

import { useWalletStore } from '@/stores';

/**
 * 钱包连接按钮
 */
export function WalletButton() {
  const { wallet, isConnecting, connect, disconnect } = useWalletStore();

  const handleClick = () => {
    if (wallet?.connected) {
      disconnect();
    } else {
      connect();
    }
  };

  // 格式化地址（显示前 4 位和后 4 位）
  const formatAddress = (address: string) => {
    if (!address) {return '';}
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <button
      onClick={handleClick}
      disabled={isConnecting}
      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
    >
      {isConnecting ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          连接中...
        </span>
      ) : wallet?.connected ? (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full" />
          {formatAddress(wallet.address)}
          <span className="text-sm opacity-80">| {wallet.balance.toFixed(2)} SOL</span>
        </span>
      ) : (
        '连接钱包'
      )}
    </button>
  );
}

export default WalletButton;
