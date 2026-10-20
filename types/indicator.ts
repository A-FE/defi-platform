/**
 * 技术指标类型定义
 */

/**
 * 指标类型
 */
export type IndicatorType =
  | 'MA'      // 移动平均线
  | 'EMA'     // 指数移动平均线
  | 'BOLL'    // 布林带
  | 'RSI'     // 相对强弱指标
  | 'MACD'    // 指数平滑异同移动平均线
  | 'KDJ'     // 随机指标
  | 'VOL';    // 成交量

/**
 * 指标显示位置
 */
export type IndicatorPosition = 'main' | 'sub';

/**
 * 指标配置
 */
export interface IndicatorConfig {
  type: IndicatorType;
  enabled: boolean;
  position: IndicatorPosition;
  params: Record<string, number>;
  colors: string[];
  visible: boolean;
}

/**
 * 指标计算结果（单值）
 */
export interface SingleIndicatorValue {
  time: number;
  value: number;
}

/**
 * 指标计算结果（多值，如 BOLL、MACD）
 */
export interface MultiIndicatorValue {
  time: number;
  values: Record<string, number>;
}

/**
 * 指标线条数据（用于渲染）
 */
export interface IndicatorSeriesData {
  name: string;
  data: SingleIndicatorValue[];
  color: string;
}

/**
 * 指标数据（用于渲染）
 */
export interface IndicatorData {
  type: IndicatorType;
  series: IndicatorSeriesData[];
}

/**
 * 指标元信息
 */
export interface IndicatorMeta {
  type: IndicatorType;
  name: string;
  description: string;
  position: IndicatorPosition;
  defaultParams: Record<string, number>;
  defaultColors: string[];
  paramLabels: Record<string, string>;
}