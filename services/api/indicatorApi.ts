import { IndicatorQueryParams, IndicatorKlineResponse, ApiResponse } from '@/types/api';
import { mockCalculateIndicators } from '../mock/indicatorMock';

/**
 * 查询 K 线 + 指标数据
 *
 * 开发模式：使用 mock 数据（在 mockCalculateIndicators 中实现）
 * 生产模式：调用真实后端接口 /api/v1/klines/indicator
 */
export async function fetchKlineWithIndicators(
  params: IndicatorQueryParams
): Promise<IndicatorKlineResponse> {
  // 🔧 开发阶段：检查是否需要使用 mock
  const useMock = process.env.NODE_ENV === 'development' ||
                  !process.env.NEXT_PUBLIC_INDICATOR_API_ENABLED;

  if (useMock) {
    console.warn('[DEV MODE] Using mock indicator calculation - will be replaced with real API');

    // 使用 mock：需要从缓存或其他地方获取 K 线数据
    // 这里我们需要一个方法来获取对应时间范围的 K 线数据
    // 暂时先抛出错误，在实际使用时会通过传入 bars 的方式解决
    throw new Error('Mock implementation requires bars data - see mockCalculateIndicatorsWithBars');
  }

  // 🚀 生产环境：调用真实后端接口
  const queryParams = new URLSearchParams({
    symbol: params.symbol,
    resolution: params.resolution,
    from: params.from.toString(),
    to: params.to.toString(),
    indicators: JSON.stringify(params.indicators),
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const response = await fetch(`${apiUrl}/api/v1/klines/indicator?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch indicators: ${response.statusText}`);
  }

  const result: ApiResponse<IndicatorKlineResponse> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch indicators');
  }

  return result.data;
}

/**
 * 辅助函数：将指标配置转换为 API 参数格式
 */
export function convertIndicatorConfigsToParams(configs: Array<{
  type: string;
  params: Record<string, number>;
}>): IndicatorQueryParams['indicators'] {
  return configs.map(config => {
    const paramValues = Object.values(config.params);

    // 转换指标类型为后端接受的小写格式
    const name = config.type.toLowerCase();

    return {
      name,
      params: paramValues,
    };
  });
}
