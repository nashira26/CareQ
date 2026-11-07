import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { InAppNotification } from '../data/mockData';
import { SimTag } from './ui/CareUI';

interface NotificationBellProps {
  notifications: InAppNotification[];
  currentRole: 'parent' | 'centre';
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: (role: 'parent' | 'centre') => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  currentRole,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter notifications for the currently active role
  const roleNotifications = notifications
    .filter((n) => n.recipientRole === currentRole)
    .sort((a, b) => b.createdAt - a.createdAt);

  const unreadCount = roleNotifications.filter((n) => !n.read).length;

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-xl transition-all border ${
          isOpen
            ? 'bg-stone-100 border-stone-300 text-[#0B4A52]'
            : 'bg-white border-stone-200 text-stone-700 hover:text-[#0B4A52] hover:bg-stone-50'
        } shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30`}
        aria-label={`Notifications (${unreadCount} unread)`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[#0B4A52] rounded-full shadow-xs ring-2 ring-white animate-in zoom-in-50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200 z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-[#F7F8F7] border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#0B4A52]">Notifications</span>
              {unreadCount > 0 ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#45B5A5]/20 text-[#0B4A52]">
                  {unreadCount} new
                </span>
              ) : (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                  All caught up
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => onMarkAllAsRead(currentRole)}
                  className="text-xs text-[#0B4A52] hover:text-[#45B5A5] font-semibold flex items-center gap-1 transition-colors"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
                aria-label="Close notifications panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
            {roleNotifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <Bell className="w-8 h-8 text-stone-300 mx-auto mb-2 stroke-1" />
                <p className="text-sm font-medium text-stone-600">No notifications yet</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Updates on application status, queue positions, and offers will appear here.
                </p>
              </div>
            ) : (
              roleNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 transition-colors flex items-start gap-3 ${
                    notif.read ? 'bg-white hover:bg-stone-50' : 'bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]'
                  }`}
                >
                  {/* Read/unread dot or checkmark */}
                  <div className="mt-1 shrink-0">
                    {notif.read ? (
                      <span className="w-2 h-2 rounded-full bg-stone-300 inline-block" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#45B5A5] ring-2 ring-[#45B5A5]/30 inline-block" />
                    )}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs leading-relaxed ${
                        notif.read ? 'text-stone-700 font-normal' : 'text-stone-900 font-semibold'
                      }`}
                    >
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-stone-400">
                      <span className="inline-flex items-center gap-1.5">
                        <SimTag />
                        {notif.timestamp}
                      </span>
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={() => onMarkAsRead(notif.id)}
                          className="text-[11px] text-[#0B4A52] hover:text-[#45B5A5] font-semibold flex items-center gap-1 transition-colors hover:underline"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark read</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-stone-50 border-t border-stone-100 text-[11px] text-stone-500 text-center">
            {currentRole === 'parent' ? 'Parent in-app notifications' : 'Centre in-app notifications'}
          </div>
        </div>
      )}
    </div>
  );
};
