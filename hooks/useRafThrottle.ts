/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useCallback, useEffect } from 'react';

/**
 * ✅ 阶段 4 优化：RAF 节流 Hook
 * 使用 requestAnimationFrame 限制回调执行频率到 60 FPS
 */
export function useRafThrottle<T extends (...args: any[]) => void>(
  callback: T,
  dependencies: React.DependencyList = [],
): T {
  const rafIdRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);
  const lastArgsRef = useRef<any[] | null>(null);

  // 保持 callback 最新
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const throttledCallback = useCallback(
    ((...args: any[]) => {
      lastArgsRef.current = args;

      // 如果已经有待处理的 RAF，不需要再次调度
      if (rafIdRef.current !== null) {
        return;
      }

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (lastArgsRef.current !== null) {
          callbackRef.current(...lastArgsRef.current);
          lastArgsRef.current = null;
        }
      });
    }) as T,
    // eslint-disable-next-line react-hooks/use-memo
    dependencies, // eslint-disable-line react-hooks/exhaustive-deps
  );

  return throttledCallback;
}

/**
 * ✅ 阶段 4 优化：debounce Hook（使用 RAF）
 */
export function useRafDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 100,
): T {
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  // 保持 callback 最新
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback(
    // eslint-disable-next-line react-hooks/use-memo
    ((...args: any[]) => {
      // 清除之前的 timeout
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      timeoutIdRef.current = setTimeout(() => {
        // 在 RAF 中执行，确保在渲染帧中执行
        rafIdRef.current = requestAnimationFrame(() => {
          callbackRef.current(...args);
          rafIdRef.current = null;
        });
      }, delay);
    }) as T,
    [delay],
  );

  return debouncedCallback;
}

/**
 * ✅ 阶段 4 优化：批量更新 Hook
 * 收集多次调用，在下一帧中批量执行
 */
export function useBatchUpdate<T>(
  callback: (batch: T[]) => void,
  options: {
    maxBatchSize?: number;
    maxWaitTime?: number;
  } = {},
): (item: T) => void {
  const { maxBatchSize = 10, maxWaitTime = 100 } = options;

  const batchRef = useRef<T[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // 保持 callback 最新
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const flush = useCallback(() => {
    if (batchRef.current.length === 0) {
      return;
    }

    const batch = [...batchRef.current];
    batchRef.current = [];

    // 清理定时器
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // 在 RAF 中执行批量更新
    rafIdRef.current = requestAnimationFrame(() => {
      callbackRef.current(batch);
      rafIdRef.current = null;
    });
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const addItem = useCallback(
    (item: T) => {
      batchRef.current.push(item);

      // 达到批量大小，立即 flush
      if (batchRef.current.length >= maxBatchSize) {
        flush();
        return;
      }

      // 设置最大等待时间
      if (!timeoutIdRef.current) {
        timeoutIdRef.current = setTimeout(() => {
          flush();
        }, maxWaitTime);
      }
    },
    [flush, maxBatchSize, maxWaitTime],
  );

  return addItem;
}

/**
 * ✅ 阶段 4 优化：监听滚动并节流
 */
export function useScrollThrottle(
  callback: (event: Event) => void,
  target?: HTMLElement | Window | null,
): void {
  const throttledCallback = useRafThrottle(callback);

  useEffect(() => {
    const element = target || window;
    if (!element) { return; }

    element.addEventListener('scroll', throttledCallback as EventListener);

    return () => {
      element.removeEventListener('scroll', throttledCallback as EventListener);
    };
  }, [throttledCallback, target]);
}

/**
 * ✅ 阶段 4 优化：监听 resize 并节流
 */
export function useResizeThrottle(
  callback: (event: Event) => void,
  target?: HTMLElement | Window | null,
): void {
  const throttledCallback = useRafThrottle(callback);

  useEffect(() => {
    const element = target || window;
    if (!element) { return; }

    element.addEventListener('resize', throttledCallback as EventListener);

    return () => {
      element.removeEventListener('resize', throttledCallback as EventListener);
    };
  }, [throttledCallback, target]);
}
