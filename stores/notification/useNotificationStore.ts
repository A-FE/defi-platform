import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  duration?: number; // 自动关闭时间（毫秒）
}

interface NotificationState {
  notifications: Notification[];

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

/**
 * 通知 Store
 * 职责：管理全局通知、自动关闭
 */
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  /**
   * 添加通知
   */
  addNotification: (notification) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // 自动关闭
    if (notification.duration !== 0) {
      const duration = notification.duration || 5000;
      setTimeout(() => {
        get().removeNotification(id);
      }, duration);
    }
  },

  /**
   * 移除通知
   */
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  /**
   * 清空所有通知
   */
  clearAll: () => {
    set({ notifications: [] });
  },
}));

// 便捷方法
export const notify = {
  success: (title: string, message: string, duration?: number) => {
    useNotificationStore.getState().addNotification({ type: 'success', title, message, duration });
  },
  error: (title: string, message: string, duration?: number) => {
    useNotificationStore.getState().addNotification({ type: 'error', title, message, duration });
  },
  warning: (title: string, message: string, duration?: number) => {
    useNotificationStore.getState().addNotification({ type: 'warning', title, message, duration });
  },
  info: (title: string, message: string, duration?: number) => {
    useNotificationStore.getState().addNotification({ type: 'info', title, message, duration });
  },
};
