import { KlineInterval } from '@/types/market';
import { KLINE_INTERVALS, INTERVAL_LABELS } from '@/constants/api';

interface ChartControlsProps {
  interval: KlineInterval;
  onIntervalChange: (interval: KlineInterval) => void;
}

/**
 * K线图控制栏
 * 职责：周期切换
 */
export function ChartControls({ interval, onIntervalChange }: ChartControlsProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-gray-400 mr-2">周期：</span>
      {KLINE_INTERVALS.map((int) => (
        <button
          key={int}
          onClick={() => onIntervalChange(int)}
          className={`px-3 py-1 rounded text-sm font-medium transition-all ${
            interval === int
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
          }`}
        >
          {int}
        </button>
      ))}
    </div>
  );
}

export default ChartControls;
