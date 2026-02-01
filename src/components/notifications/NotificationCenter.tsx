import React from 'react';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUnreadNotifications, useMarkNotificationAsRead } from '@/services/notifications.service';
import { NotificationItem } from './NotificationItem';

export function NotificationCenter() {
  const { data: unreadNotifications, isLoading } = useUnreadNotifications();
  const markAsRead = useMarkNotificationAsRead();

  const unreadCount = unreadNotifications?.length || 0;

  const handleNotificationClick = (notification: any) => {
    if (!notification.readAt) {
      markAsRead.mutate(notification.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-gray-300 hover:text-white hover:bg-gray-800"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary-500 border-2 border-gray-900"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-white">
        <div className="p-2 border-b">
          <h3 className="font-semibold">Bildirimler</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">Yükleniyor...</div>
          ) : unreadNotifications && unreadNotifications.length > 0 ? (
            unreadNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              Yeni bildirim yok
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

