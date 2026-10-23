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

