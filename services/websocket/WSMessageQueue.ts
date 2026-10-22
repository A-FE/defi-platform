/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { WSMessage } from '@/types/market';

/**
 * 消息处理器类型
 */
export type MessageHandler = (message: WSMessage) => void;

/**
 * 批处理消息处理器类型
 * ✅ 性能优化：支持批量处理消息
 */
export type BatchMessageHandler = (messages: WSMessage[]) => void;

/**
 * WebSocket 消息队列
 * 职责：队列管理、背压处理、让出主线程
 *
 * ✅ 阶段 4 优化：添加批处理 + RAF 节流
 */
export class WSMessageQueue {
  private queue: WSMessage[] = [];
  private isProcessing = false;
  private maxQueueSize = 100;

  // ✅ 性能优化：RAF 节流相关
  private rafId: number | null = null;
  private pendingBatch: WSMessage[] = [];
  private batchSize = 10; // 每批处理的消息数量
  private useBatching = true; // 是否启用批处理

  constructor(
    private handleMessage: MessageHandler,
    private handleBatch?: BatchMessageHandler,
  ) {}

  /**
   * 消息入队
   * ✅ 性能优化：使用 RAF 节流批量处理
   */
  enqueue(message: WSMessage): void {
    // 队列满时，丢弃旧消息
    if (this.queue.length >= this.maxQueueSize) {
      const dropped = this.queue.shift();
      console.warn('[WS] Queue overflow, dropped:', dropped?.type);
    }

    // 深度增量更新：只保留最新一条，丢弃中间积压
    if (message.type === 'depth_update') {
      const existingIndex = this.queue.findIndex(
        (m) => m.type === 'depth_update' && m.symbol === message.symbol,
      );

      if (existingIndex !== -1) {
        // 替换旧消息
        this.queue[existingIndex] = message;
        return;
      }
    }

    this.queue.push(message);

    // ✅ 性能优化：使用 RAF 节流而非立即处理
    if (this.useBatching) {
      this.scheduleProcessing();
    } else {
      this.processQueue();
    }
  }

  /**
   * ✅ 性能优化：使用 RAF 调度处理，限制到 60 FPS
   */
  private scheduleProcessing(): void {
    if (this.rafId !== null) {
      // 已经有待处理的 RAF，无需重复调度
      return;
    }

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.processBatch();
    });
  }

  /**
   * ✅ 性能优化：批量处理消息
   */
  private processBatch(): void {
    if (this.queue.length === 0) {
      return;
    }

    // 取出一批消息（最多 batchSize 条）
    const batch = this.queue.splice(0, this.batchSize);

    try {
      if (this.handleBatch) {
        // 使用批处理回调
        this.handleBatch(batch);
      } else {
        // 降级到逐条处理
        batch.forEach((message) => {
          try {
            this.handleMessage(message);
          } catch (error) {
            console.error('[WS] Message handler error:', error);
          }
        });
      }
    } catch (error) {
      console.error('[WS] Batch handler error:', error);
    }

    // 如果还有消息，继续调度
    if (this.queue.length > 0) {
      this.scheduleProcessing();
    }
  }

  /**
   * 处理队列（保留用于非批处理模式）
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {return;}

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const message = this.queue.shift()!;

      try {
        this.handleMessage(message);
      } catch (error) {
        console.error('[WS] Message handler error:', error);
      }

      // 让出主线程，避免长任务
      if (this.queue.length > 0) {
        await this.yieldToMain();
      }
    }

    this.isProcessing = false;
  }

  /**
   * 让出主线程控制权
   */
  private async yieldToMain(): Promise<void> {
    // 优先使用 Scheduler API
    if ('scheduler' in window && 'yield' in (window as any).scheduler) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).scheduler.yield();
    }
    // 降级到 setTimeout
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 清空队列
   * ✅ 性能优化：同时取消待处理的 RAF
   */
  clear(): void {
    this.queue = [];
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * ✅ 性能优化：配置批处理参数
   */
  setBatchSize(size: number): void {
    this.batchSize = Math.max(1, Math.min(size, 50)); // 限制在 1-50 之间
  }

  /**
   * ✅ 性能优化：启用/禁用批处理
   */
  setUseBatching(enabled: boolean): void {
    this.useBatching = enabled;
  }
}
