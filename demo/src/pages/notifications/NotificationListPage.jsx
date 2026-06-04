import { useEffect, useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from "../../stores/notificationStore";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Spinner } from "../../components/ui/spinner";
import { formatRelativeTime } from "../../lib/utils";
import { Bell, CheckCheck } from 'lucide-react';

function usePagination(initialOffset = 0, initialLimit = 20) {
  const [offset, setOffset] = useState(initialOffset);
  const [limit] = useState(initialLimit);
  const reset = useCallback(() => setOffset(0), []);
  const next = useCallback(() => setOffset(prev => prev + limit), [limit]);
  const prev = useCallback(() => setOffset(prev => Math.max(0, prev - limit)), [limit]);
  return { offset, limit, reset, next, prev };
}

export default function NotificationListPage() {
  const { t } = useTranslation();
  const { notifications, unreadCount, isLoading, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const { offset, limit, next, prev } = usePagination();
  const hasNext = offset + limit < notifications.length;
  const hasPrev = offset > 0;

  useEffect(() => { fetchNotifications(); fetchUnreadCount(); }, []);

  const handleMarkAllRead = async () => { await markAllAsRead(); fetchNotifications(); fetchUnreadCount(); };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('notifications.title')}</h1>
          <p className="page-subtitle">{unreadCount > 0 ? t('notifications.unreadCount', { count: unreadCount }) : t('notifications.allCaughtUp')}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            <CheckCheck className="w-4 h-4 mr-2" /> {t('notifications.markAllAsRead')}
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
        ) : !Array.isArray(notifications) || notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-tertiary)] flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-[var(--color-text-muted)]" />
            </div>
            <p className="text-[var(--color-text-secondary)] font-medium">{t('notifications.noNotifications')}</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]/50">
            {notifications.map((notification) => (
              <div key={notification.id} className={`p-4 hover:bg-[var(--color-surface-secondary)] transition-colors ${!notification.is_read ? "bg-[var(--color-primary-50)]" : ""}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!notification.is_read ? "bg-[var(--color-primary-100)] text-[var(--color-primary-600)]" : "bg-[var(--color-surface-tertiary)] text-[var(--color-text-muted)]"}`}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${!notification.is_read ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>{notification.type?.replace(/_/g, " ") || t('notifications.notification')}</p>
                      {!notification.is_read && <span className="w-2 h-2 rounded-full bg-[var(--color-primary-500)]" />}
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">{notification.content || "-"}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">{formatRelativeTime(notification.created_at)}</p>
                  </div>
                  {!notification.is_read && (
                    <Button variant="ghost" size="sm" onClick={() => { markAsRead(notification.id); fetchUnreadCount(); }}>
                      <CheckCheck className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {notifications.length > limit && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">{t('common.showing')} {offset + 1} {t('common.to')} {Math.min(offset + limit, notifications.length)} {t('common.of')} {notifications.length}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!hasPrev} onClick={prev}>{t('common.previous')}</Button>
              <Button variant="outline" size="sm" disabled={!hasNext} onClick={next}>{t('common.next')}</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
