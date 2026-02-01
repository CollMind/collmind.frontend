import React from 'react';
import { Notification, NotificationType, NotificationPriority } from '@/types/notification.types';
import { CheckCircle2, XCircle, AlertTriangle, Clock, Bell } from 'lucide-react';

// Dynamic import for date-fns to handle cases where it's not installed
let formatDistanceToNow: any;
let tr: any;
try {
  const dateFns = require('date-fns');
  formatDistanceToNow = dateFns.formatDistanceToNow;
  tr = require('date-fns/locale').tr;
} catch (e) {
  console.warn('date-fns package not installed. Date formatting will use fallback.');
  formatDistanceToNow = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} saniye önce`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} dakika önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    return `${days} gün önce`;
  };
}

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.APPROVAL_REQUESTED:
      return <Clock className="h-4 w-4 text-blue-500" />;
    case NotificationType.APPROVAL_GRANTED:
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case NotificationType.APPROVAL_REJECTED:
      return <XCircle className="h-4 w-4 text-red-500" />;
    case NotificationType.BUDGET_ALERT_80:
    case NotificationType.BUDGET_ALERT_100:
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case NotificationType.AGREEMENT_EXPIRING:
      return <Clock className="h-4 w-4 text-orange-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
};

const getPriorityColor = (priority: NotificationPriority): string => {
  const colors: Record<NotificationPriority, string> = {
    LOW: 'border-gray-200',
    MEDIUM: 'border-blue-200',
    HIGH: 'border-red-200',
  };
  return colors[priority] || 'border-gray-200';
};

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const isUnread = !notification.readAt;

  return (
    <div
      className={`p-3 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${
        isUnread ? 'bg-blue-50' : ''
      } ${getPriorityColor(notification.priority)}`}
      onClick={onClick}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isUnread ? 'font-semibold' : ''}`}>
            {notification.subject}
          </p>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {notification.body}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {tr
              ? formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                  locale: tr,
                })
              : formatDistanceToNow(new Date(notification.createdAt))}
          </p>
        </div>
        {isUnread && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
}

