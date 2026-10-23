import { KlineInterval } from '@/types/market';

/**
 * 获取 K 线周期对应的秒数
 */
export function getIntervalSeconds(interval: KlineInterval): number {
  const map: Record<KlineInterval, number> = {
    'timesharing': 1,  // 分时图：1秒
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
 * 根据周期获取时间格式配置
 */
export function getTimeFormatOptions(interval: KlineInterval) {
  switch (interval) {
    case 'timesharing':
    case '1m':
      return {
        timeVisible: true,
        secondsVisible: true,
        localization: {
          timeFormatter: (timestamp: number | string) => {
            const time = typeof timestamp === 'number' ? timestamp : Number(timestamp);
            const date = new Date(time * 1000);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
          },
        },
      };

    case '5m':
    case '15m':
      return {
        timeVisible: true,
        secondsVisible: false,
        localization: {
          timeFormatter: (timestamp: number | string) => {
            const time = typeof timestamp === 'number' ? timestamp : Number(timestamp);
            const date = new Date(time * 1000);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
          },
        },
      };

    case '1h':
    case '4h':
      return {
        timeVisible: true,
        secondsVisible: false,
        localization: {
          timeFormatter: (timestamp: number | string) => {
            const time = typeof timestamp === 'number' ? timestamp : Number(timestamp);
            const date = new Date(time * 1000);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${month}-${day} ${hours}:${minutes}`;
          },
        },
      };

    case '1d':
    case '1w':
      return {
        timeVisible: true,
        secondsVisible: false,
        localization: {
          timeFormatter: (timestamp: number | string) => {
            const time = typeof timestamp === 'number' ? timestamp : Number(timestamp);
            const date = new Date(time * 1000);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          },
        },
      };

    default:
      return {
        timeVisible: true,
        secondsVisible: false,
      };
  }
}
