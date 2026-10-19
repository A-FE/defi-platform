'use client';

import { useNotificationStore, NotificationType } from '@/stores/notification/useNotificationStore';

/**
 * 通知容器组件
 */
export function NotificationContainer() {
  const { notifications, removeNotification } = useNotificationStore();

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getBgColor = (type: NotificationType) => {
    const colors = {
      success: 'bg-green-500/10 border-green-500/20',
      error: 'bg-red-500/10 border-red-500/20',
      warning: 'bg-yellow-500/10 border-yellow-500/20',
      info: 'bg-blue-500/10 border-blue-500/20',
    };
    return colors[type];
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getBgColor(notification.type)} border rounded-lg p-4 shadow-lg backdrop-blur-sm animate-slide-in-right`}
        >
          <div className="flex items-start gap-3">
            {/* 图标 */}
            <div className="flex-shrink-0">{getIcon(notification.type)}</div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium mb-1">{notification.title}</h4>
              <p className="text-gray-300 text-sm">{notification.message}</p>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default NotificationContainer;
