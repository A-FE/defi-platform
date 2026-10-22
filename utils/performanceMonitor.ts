/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/**
 * 性能监控工具
 * ✅ 阶段 4 优化：添加性能监控和分析
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  category: 'render' | 'update' | 'calculation' | 'network';
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    totalDuration: number;
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
    count: number;
  };
}

/**
 * 性能监控类
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // 最多保留 1000 条记录
  private enabled = process.env.NODE_ENV === 'development';

  /**
   * 启用/禁用监控
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 测量函数执行时间
   */
  measure<T>(
    name: string,
    category: PerformanceMetric['category'],
    fn: () => T,
  ): T {
    if (!this.enabled) {
      return fn();
    }

    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.addMetric({
        name,
        duration,
        timestamp: Date.now(),
        category,
      });
    }
  }

  /**
   * 异步测量
   */
  async measureAsync<T>(
    name: string,
    category: PerformanceMetric['category'],
    fn: () => Promise<T>,
  ): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.addMetric({
        name,
        duration,
        timestamp: Date.now(),
        category,
      });
    }
  }

  /**
   * 手动记录指标
   */
  record(
    name: string,
    duration: number,
    category: PerformanceMetric['category'],
  ): void {
    if (!this.enabled) {
      return;
    }

    this.addMetric({
      name,
      duration,
      timestamp: Date.now(),
      category,
    });
  }

  /**
   * 添加指标
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // 超过限制时移除最旧的记录
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // 如果耗时超过 50ms，打印警告
    if (metric.duration > 50) {
      console.warn(
        `[Performance] Slow operation detected: ${metric.name} took ${metric.duration.toFixed(2)}ms`,
      );
    }
  }

  /**
   * 获取报告
   */
  getReport(filterCategory?: PerformanceMetric['category']): PerformanceReport {
    let metrics = this.metrics;

    if (filterCategory) {
      metrics = metrics.filter((m) => m.category === filterCategory);
    }

    if (metrics.length === 0) {
      return {
        metrics: [],
        summary: {
          totalDuration: 0,
          avgDuration: 0,
          maxDuration: 0,
          minDuration: 0,
          count: 0,
        },
      };
    }

    const durations = metrics.map((m) => m.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      metrics,
      summary: {
        totalDuration,
        avgDuration: totalDuration / metrics.length,
        maxDuration: Math.max(...durations),
        minDuration: Math.min(...durations),
        count: metrics.length,
      },
    };
  }

  /**
   * 获取最近的 N 条记录
   */
  getRecent(count = 10): PerformanceMetric[] {
    return this.metrics.slice(-count);
  }

  /**
   * 按名称分组统计
   */
  getGroupedReport(): Record<string, PerformanceReport> {
    const grouped: Record<string, PerformanceMetric[]> = {};

    this.metrics.forEach((metric) => {
      if (!grouped[metric.name]) {
        grouped[metric.name] = [];
      }
      grouped[metric.name].push(metric);
    });

    const result: Record<string, PerformanceReport> = {};

    Object.keys(grouped).forEach((name) => {
      const metrics = grouped[name];
      const durations = metrics.map((m) => m.duration);
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);

      result[name] = {
        metrics,
        summary: {
          totalDuration,
          avgDuration: totalDuration / metrics.length,
          maxDuration: Math.max(...durations),
          minDuration: Math.min(...durations),
          count: metrics.length,
        },
      };
    });

    return result;
  }

  /**
   * 打印报告到控制台
   */
  printReport(category?: PerformanceMetric['category']): void {
    const report = this.getReport(category);

    console.group('📊 Performance Report');
    console.log('Summary:', {
      count: report.summary.count,
      total: `${report.summary.totalDuration.toFixed(2)}ms`,
      avg: `${report.summary.avgDuration.toFixed(2)}ms`,
      max: `${report.summary.maxDuration.toFixed(2)}ms`,
      min: `${report.summary.minDuration.toFixed(2)}ms`,
    });

    // 打印分组统计
    const grouped = this.getGroupedReport();
    console.table(
      Object.entries(grouped).map(([name, data]) => ({
        name,
        count: data.summary.count,
        avg: `${data.summary.avgDuration.toFixed(2)}ms`,
        max: `${data.summary.maxDuration.toFixed(2)}ms`,
        total: `${data.summary.totalDuration.toFixed(2)}ms`,
      })),
    );

    console.groupEnd();
  }

  /**
   * 清空所有记录
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * 导出数据（用于外部分析）
   */
  export(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor();

// 在浏览器控制台中暴露工具
if (typeof window !== 'undefined') {
  (window as any).__performanceMonitor = performanceMonitor;
}

/**
 * React Hook 形式的性能测量
 */
export function usePerformanceMeasure(
  name: string,
  category: PerformanceMetric['category'] = 'render',
) {
  const startTimeRef = { current: performance.now() };

  return () => {
    const duration = performance.now() - startTimeRef.current;
    performanceMonitor.record(name, duration, category);
    startTimeRef.current = performance.now();
  };
}

/**
 * 装饰器形式的性能测量（用于类方法）
 */
export function measurePerformance(
  category: PerformanceMetric['category'] = 'calculation',
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measure(
        `${target.constructor.name}.${propertyKey}`,
        category,
        () => originalMethod.apply(this, args),
      );
    };

    return descriptor;
  };
}
