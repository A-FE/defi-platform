'use client';

import { useIndicatorStore } from '@/stores';
import { KlineInterval, IndicatorType } from '@/types';
import { KLINE_INTERVALS, INTERVAL_LABELS } from '@/constants/api';
import { INDICATOR_META } from '@/constants/indicators';
import { useEffect } from 'react';

interface ChartControlsProps {
  interval: KlineInterval;
  onIntervalChange: (interval: KlineInterval) => void;
}

/**
 * K线图控制栏
 * 职责：周期切换 + 指标开关（平铺布局）
 * 分时模式：隐藏主图指标配置
 */
// eslint-disable-next-line max-lines-per-function
export function ChartControls({ interval, onIntervalChange }: ChartControlsProps) {
  const { configs, toggleIndicator, selectMainIndicator } = useIndicatorStore();

  // 分组：主图指标和副图指标
  const mainIndicators: IndicatorType[] = ['MA', 'EMA', 'BOLL'];
  const subIndicators: IndicatorType[] = ['RSI', 'MACD', 'KDJ', 'VOL'];

  // 判断是否为分时模式
  const isTimesharing = interval === 'timesharing';

  // 获取当前选中的主图指标
  const selectedMainIndicator = mainIndicators.find(type => configs[type].enabled) || null;

  // ✅ 切换到分时模式时，自动清除所有主图指标
  useEffect(() => {
    if (isTimesharing && selectedMainIndicator !== null) {
      selectMainIndicator(null);
    }
  }, [isTimesharing, selectedMainIndicator, selectMainIndicator]);

  // 防止 SSR 时 configs 未定义
  if (!configs) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-3 px-2 flex-wrap">
        {/* 周期选择 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">周期</span>
          {KLINE_INTERVALS.map((int) => (
            <button
              key={int}
              onClick={() => onIntervalChange(int)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                interval === int
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
              }`}
            >
              {INTERVAL_LABELS[int]}
            </button>
          ))}
        </div>

        {/* ✅ 分时模式下隐藏主图指标配置 */}
        {!isTimesharing && (
          <>
            {/* 分隔线 */}
            <div className="h-6 w-px bg-gray-700" />

            {/* 主图指标（单选 Radio） */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">主图</span>

              {/* 无指标选项 */}
              <button
                onClick={() => selectMainIndicator(null)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  selectedMainIndicator === null
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                }`}
              >
                无
              </button>

              {mainIndicators.map((type) => {
                // const config = configs[type];
                const meta = INDICATOR_META[type];
                const isSelected = selectedMainIndicator === type;

                return (
                  <button
                    key={type}
                    onClick={() => selectMainIndicator(type)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    }`}
                    title={meta.description}
                  >
                    {meta.name}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* 分隔线 */}
        <div className="h-6 w-px bg-gray-700" />

        {/* 副图指标 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">副图</span>
          {subIndicators.map((type) => {
            const config = configs[type];
            const meta = INDICATOR_META[type];

            return (
              <button
                key={type}
                onClick={() => toggleIndicator(type)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  config.enabled
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                }`}
                title={meta.description}
              >
                {meta.name}
              </button>
            );
          })}
        </div>


      </div>
    </>
  );
}

export default ChartControls;
