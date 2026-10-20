import { KlineInterval } from '@/types/market';
import { KlineSession } from './KlineSession';

/**
 * K线会话管理器
 * 职责：管理所有活跃的 K线会话，按 symbol + interval 隔离
 */
export class KlineSessionManager {
  private sessions: Map<string, KlineSession> = new Map();

  /**
   * 生成会话 ID
   */
  private getSessionId(symbol: string, interval: KlineInterval): string {
    return `${symbol}_${interval}`;
  }

  /**
   * 获取或创建会话
   */
  getOrCreateSession(symbol: string, interval: KlineInterval): KlineSession {
    const sessionId = this.getSessionId(symbol, interval);

    let session = this.sessions.get(sessionId);

    if (!session) {
      session = new KlineSession(symbol, interval);
      this.sessions.set(sessionId, session);
    }

    return session;
  }

  /**
   * 获取现有会话（不创建）
   */
  getSession(symbol: string, interval: KlineInterval): KlineSession | undefined {
    const sessionId = this.getSessionId(symbol, interval);
    return this.sessions.get(sessionId);
  }

  /**
   * 销毁指定会话
   */
  destroySession(symbol: string, interval: KlineInterval): boolean {
    const sessionId = this.getSessionId(symbol, interval);
    return this.sessions.delete(sessionId);
  }

  /**
   * 重置指定会话的状态
   */
  resetSession(symbol: string, interval: KlineInterval): void {
    const session = this.getSession(symbol, interval);
    if (session) {
      session.reset();
    }
  }

  /**
   * 清空所有会话
   */
  clearAll(): void {
    this.sessions.clear();
  }

  /**
   * 获取活跃会话数量
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * 获取所有会话信息（用于调试）
   */
  getAllSessionInfo() {
    const info: Record<string, any> = {};
    this.sessions.forEach((session, sessionId) => {
      info[sessionId] = session.getInfo();
    });
    return info;
  }
}

// 导出单例
export const klineSessionManager = new KlineSessionManager();
