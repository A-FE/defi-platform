import { IndicatorConfig, IndicatorMeta, IndicatorType } from '@/types/indicator';

/**
 * 指标元信息
 */
export const INDICATOR_META: Record<IndicatorType, IndicatorMeta> = {
  MA: {
    type: 'MA',
    name: '移动平均线',
    description: '简单移动平均线，平滑价格波动，识别趋势方向',
    position: 'main',
    defaultParams: {
      period1: 5,
      period2: 10,
      period3: 20,
      period4: 30,
    },
    defaultColors: ['#00bcd4', '#ff9800', '#e91e63', '#9c27b0'],
    paramLabels: {
      period1: '周期1',
      period2: '周期2',
      period3: '周期3',
      period4: '周期4',
    },
  },

  EMA: {
    type: 'EMA',
    name: '指数移动平均线',
    description: '指数加权移动平均线，对近期价格更敏感',
    position: 'main',
    defaultParams: {
      period1: 7,
      period2: 25,
      period3: 99,
    },
    defaultColors: ['#00bcd4', '#ff9800', '#e91e63'],
    paramLabels: {
      period1: '短期',
      period2: '中期',
      period3: '长期',
    },
  },

  BOLL: {
    type: 'BOLL',
    name: '布林带',
    description: '价格通道指标，上下轨表示超买超卖区域',
    position: 'main',
    defaultParams: {
      period: 20,
      stdDev: 2,
    },
    defaultColors: ['#9c27b0', '#2196f3', '#9c27b0'],
    paramLabels: {
      period: '周期',
      stdDev: '标准差倍数',
    },
  },

  RSI: {
    type: 'RSI',
    name: '相对强弱指标',
    description: '衡量价格变动速度和幅度，识别超买超卖',
    position: 'sub',
    defaultParams: {
      period: 14,
    },
    defaultColors: ['#2196f3'],
    paramLabels: {
      period: '周期',
    },
  },

  MACD: {
    type: 'MACD',
    name: 'MACD',
    description: '趋势和动量指标，DIF、DEA交叉判断买卖时机',
    position: 'sub',
    defaultParams: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    },
    defaultColors: ['#00bcd4', '#ff9800', '#4caf50'],
    paramLabels: {
      fastPeriod: '快线周期',
      slowPeriod: '慢线周期',
      signalPeriod: '信号线周期',
    },
  },

  KDJ: {
    type: 'KDJ',
    name: 'KDJ',
    description: '随机指标，结合动量和超买超卖概念',
    position: 'sub',
    defaultParams: {
      period: 9,
      kPeriod: 3,
      dPeriod: 3,
    },
    defaultColors: ['#2196f3', '#ff9800', '#9c27b0'],
    paramLabels: {
      period: 'RSV周期',
      kPeriod: 'K值平滑',
      dPeriod: 'D值平滑',
    },
  },

  VOL: {
    type: 'VOL',
    name: '成交量',
    description: '显示交易活跃度，配合价格分析市场强弱',
    position: 'sub',
    defaultParams: {},
    defaultColors: ['#4caf50', '#ef4444'],
    paramLabels: {},
  },
};

/**
 * 指标默认配置
 */
export const DEFAULT_INDICATOR_CONFIGS: Record<IndicatorType, IndicatorConfig> = {
  MA: {
    type: 'MA',
    enabled: false,
    position: 'main',
    params: { ...INDICATOR_META.MA.defaultParams },
    colors: [...INDICATOR_META.MA.defaultColors],
    visible: true,
  },

  EMA: {
    type: 'EMA',
    enabled: false,
    position: 'main',
    params: { ...INDICATOR_META.EMA.defaultParams },
    colors: [...INDICATOR_META.EMA.defaultColors],
    visible: true,
  },

  BOLL: {
    type: 'BOLL',
    enabled: false,
    position: 'main',
    params: { ...INDICATOR_META.BOLL.defaultParams },
    colors: [...INDICATOR_META.BOLL.defaultColors],
    visible: true,
  },

  RSI: {
    type: 'RSI',
    enabled: false,
    position: 'sub',
    params: { ...INDICATOR_META.RSI.defaultParams },
    colors: [...INDICATOR_META.RSI.defaultColors],
    visible: true,
  },

  MACD: {
    type: 'MACD',
    enabled: false,
    position: 'sub',
    params: { ...INDICATOR_META.MACD.defaultParams },
    colors: [...INDICATOR_META.MACD.defaultColors],
    visible: true,
  },

  KDJ: {
    type: 'KDJ',
    enabled: false,
    position: 'sub',
    params: { ...INDICATOR_META.KDJ.defaultParams },
    colors: [...INDICATOR_META.KDJ.defaultColors],
    visible: true,
  },

  VOL: {
    type: 'VOL',
    enabled: false,
    position: 'sub',
    params: {},
    colors: [...INDICATOR_META.VOL.defaultColors],
    visible: true,
  },
};

/**
 * 指标组合模板
 */
export const INDICATOR_TEMPLATES = {
  trend: {
    name: '趋势分析',
    indicators: ['MA', 'BOLL', 'VOL'] as IndicatorType[],
  },
  momentum: {
    name: '动量分析',
    indicators: ['RSI', 'MACD', 'KDJ'] as IndicatorType[],
  },
  full: {
    name: '全面分析',
    indicators: ['MA', 'BOLL', 'RSI', 'MACD', 'VOL'] as IndicatorType[],
  },
  simple: {
    name: '简洁模式',
    indicators: ['MA', 'VOL'] as IndicatorType[],
  },
};

/**
 * RSI 参考线
 */
export const RSI_LEVELS = {
  overbought: 70,  // 超买
  oversold: 30,    // 超卖
};

/**
 * KDJ 参考线
 */
export const KDJ_LEVELS = {
  overbought: 80,  // 超买
  oversold: 20,    // 超卖
};
