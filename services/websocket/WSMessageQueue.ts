import { WSMessage } from '@/types/market';

/**
 * 消息处理器类型
 */
export type MessageHandler = (message: WSMessage) => void;

/**
 * WebSocket 消息队列
 * 职责：队列管理、背压处理、让出主线程
 */
export class WSMessageQueue {
  private queue: WSMessage[] = [];
  private isProcessing = false;
  private maxQueueSize = 100;

  constructor(private handleMessage: MessageHandler) {}

  /**
   * 消息入队
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
    this.processQueue();
  }

  /**
   * 处理队列
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
   */
  clear(): void {
    this.queue = [];
  }
}
