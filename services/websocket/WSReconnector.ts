import { WS_RECONNECT_CONFIG } from '@/constants/api';

/**
 * WebSocket 重连器
 * 职责：指数退避重连策略
 */
export class WSReconnector {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = WS_RECONNECT_CONFIG.MAX_ATTEMPTS;
  private initialDelay = WS_RECONNECT_CONFIG.INITIAL_DELAY;
  private maxDelay = WS_RECONNECT_CONFIG.MAX_DELAY;
  private isReconnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private reconnectFn: () => Promise<void>) {}

  /**
   * 调度重连
   */
  schedule(): void {
    if (this.isReconnecting) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    // 指数退避：1s, 2s, 4s, 8s（上限 8s）
    const delay = Math.min(
      this.initialDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxDelay
    );

    console.warn(
      `[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectFn()
        .then(() => {
          console.warn('[WS] Reconnected successfully');
          this.isReconnecting = false;
        })
        .catch((error) => {
          console.error('[WS] Reconnect failed:', error);
          this.isReconnecting = false;
          // 继续重试
          this.schedule();
        });
    }, delay);
  }

  /**
   * 重置重连状态
   */
  reset(): void {
    this.reconnectAttempts = 0;
    this.isReconnecting = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 取消重连
   */
  cancel(): void {
    this.reset();
  }

  /**
   * 获取重连次数
   */
  getAttempts(): number {
    return this.reconnectAttempts;
  }
}
