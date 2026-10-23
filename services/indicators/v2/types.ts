/**
 * 指标系统类型定义（V2）
 */

import { Time } from 'lightweight-charts';

/**
 * 指标数据点（统一格式）
 */
export interface IndicatorDataPoint {
  time: Time;
  values: Record<string, number | string>;
}

/**
 * 指标类型
 */
export type IndicatorType = 'MA' | 'EMA' | 'BOLL' | 'RSI' | 'MACD' | 'KDJ' | 'VOL';

/**
 * 指标配置（从现有类型扩展）
 */
export interface IndicatorConfig {
  type: IndicatorType;
  enabled: boolean;
  params: Record<string, number>;
  colors: string[];
  position: 'main' | 'sub';
}
