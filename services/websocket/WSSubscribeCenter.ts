import { WSMessage, WSMessageType } from '@/types/market';
import { WSMessageQueue, MessageHandler } from './WSMessageQueue';
import { WSReconnector } from './WSReconnector';
import { API_ENDPOINTS } from '@/constants/api';

/**
 * WebSocket 订阅中心
 * 职责：
 * 1. 单连接管理（全局共用一个 WebSocket）
 * 2. 消息分发（根据 type 分发到不同 Handler）
 * 3. 订阅管理（组件 mount/unmount 时订阅/取消）
 * 4. 断线重连（指数退避）
 * 5. 消息队列 & 背压处理
 */
export class WSSubscribeCenter {
  private ws: WebSocket | null = null;
  private messageQueue: WSMessageQueue;
  private reconnector: WSReconnector;
  private handlers = new Map<WSMessageType, Set<MessageHandler>>();
  private subscriptions = new Map<string, Set<WSMessageType>>();
  private isConnecting = false;

  constructor(private url: string) {
    this.messageQueue = new WSMessageQueue(this.handleMessage.bind(this));
    this.reconnector = new WSReconnector(this.connect.bind(this));
  }

  /**
   * 连接 WebSocket
   */
  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.warn('[WS] Connected');
          this.isConnecting = false;
          this.reconnector.reset();
          this.resubscribeAll();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            this.messageQueue.enqueue(message);
          } catch (error) {
            console.error('[WS] Parse error:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WS] Error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.warn('[WS] Disconnected');
          this.ws = null;
          this.isConnecting = false;
          // 触发重连
          this.reconnector.schedule();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.reconnector.cancel();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.messageQueue.clear();
  }

  /**
   * 订阅消息类型
   */
  subscribe(type: WSMessageType, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // 返回取消订阅函数
    return () => this.unsubscribe(type, handler);
  }

  /**
   * 取消订阅
   */
  unsubscribe(type: WSMessageType, handler: MessageHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(type);
      }
    }
  }

  /**
   * 订阅标的数据流
   */
  subscribeSymbol(symbol: string, types: WSMessageType[]): void {
    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, new Set());
    }

    const symbolSubs = this.subscriptions.get(symbol)!;
    types.forEach((type) => symbolSubs.add(type));

    // 发送订阅消息到服务器
    this.sendSubscribeMessage(symbol, types);
  }

  /**
   * 取消订阅标的
   */
  unsubscribeSymbol(symbol: string, types?: WSMessageType[]): void {
    const symbolSubs = this.subscriptions.get(symbol);
    if (!symbolSubs) return;

    if (types && types.length > 0) {
      types.forEach((type) => symbolSubs.delete(type));
      if (symbolSubs.size === 0) {
        this.subscriptions.delete(symbol);
      }
    } else {
      this.subscriptions.delete(symbol);
    }

    // 发送取消订阅消息到服务器
    this.sendUnsubscribeMessage(symbol, types);
  }

  /**
   * 处理消息（分发到对应 Handler）
   */
  private handleMessage(message: WSMessage): void {
    const handlers = this.handlers.get(message.type);
    if (handlers && handlers.size > 0) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`[WS] Handler error for ${message.type}:`, error);
        }
      });
    }
  }

  /**
   * 重连后重新订阅所有标的
   */
  private resubscribeAll(): void {
    this.subscriptions.forEach((types, symbol) => {
      this.sendSubscribeMessage(symbol, Array.from(types));
    });
  }

  /**
   * 发送订阅消息到服务器
   */
  private sendSubscribeMessage(symbol: string, types: WSMessageType[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot send subscribe message, not connected');
      return;
    }

    const message = {
      action: 'subscribe',
      symbol,
      types,
    };

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[WS] Send error:', error);
    }
  }

  /**
   * 发送取消订阅消息到服务器
   */
  private sendUnsubscribeMessage(symbol: string, types?: WSMessageType[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      action: 'unsubscribe',
      symbol,
      types: types || [],
    };

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[WS] Send error:', error);
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.messageQueue.getQueueLength();
  }
}

// 导出单例（在开发阶段使用 Mock，暂不连接真实 WebSocket）
export const wsCenter = new WSSubscribeCenter(API_ENDPOINTS.WS_URL);

// 自动连接（可选）
// if (typeof window !== 'undefined') {
//   wsCenter.connect().catch(console.error);
// }
