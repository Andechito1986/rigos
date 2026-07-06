import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { X, Bell } from 'lucide-react';
import { renderAppIcon } from './AppIcons';
import { getAppById } from '@/apps/registry';

export default function NotificationsPanel() {
  const { isNotificationsPanelOpen, closeNotificationsPanel, notifications, dismissNotification } = useOSStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!isNotificationsPanelOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeNotificationsPanel();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNotificationsPanel();
    };

    const timer = setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotificationsPanelOpen, closeNotificationsPanel]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const apps = useOSStore((s) => s.apps);

  return (
    <AnimatePresence>
      {isNotificationsPanelOpen && (
        <motion.div
          ref={panelRef}
          className="fixed top-0 right-0 bottom-[44px] flex flex-col"
          style={{
            width: 360,
            backgroundColor: 'rgba(19, 19, 26, 0.9)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderLeft: '1px solid #2A2A3A',
            zIndex: 1400,
          }}
          initial={{ x: 360 }}
          animate={{ x: 0 }}
          exit={{ x: 360 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid #2A2A3A' }}
          >
            <h2
              className="text-[15px] font-semibold"
              style={{
                color: '#E8E8F0',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Notifications
            </h2>
            <button
              className="p-1 rounded transition-colors duration-100"
              style={{ color: '#555570' }}
              onClick={closeNotificationsPanel}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#E8E8F0';
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#555570';
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-auto p-3">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <Bell size={32} color="#2A2A3A" />
                <p
                  className="text-sm"
                  style={{
                    color: '#555570',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  No notifications
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const app = getAppById(apps, notif.appId);
                return (
                  <motion.div
                    key={notif.id}
                    className="flex gap-3 p-3 rounded-[8px] mb-2 transition-colors duration-100 cursor-pointer"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
                    }}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* App icon */}
                    <div className="shrink-0">
                      {app ? (
                        renderAppIcon(app.icon, app.iconType, 16, '')
                      ) : (
                        <Bell size={16} color="#8A8AA3" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs"
                          style={{
                            color: '#8A8AA3',
                            fontFamily: "'Inter', system-ui, sans-serif",
                          }}
                        >
                          {app?.name || 'System'}
                        </span>
                        <span
                          className="text-[11px] ml-auto shrink-0"
                          style={{
                            color: '#555570',
                            fontFamily: "'Inter', system-ui, sans-serif",
                          }}
                        >
                          {formatTime(notif.timestamp)}
                        </span>
                      </div>
                      <h4
                        className="text-[13px] font-medium mt-1"
                        style={{
                          color: '#E8E8F0',
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                      >
                        {notif.title}
                      </h4>
                      <p
                        className="text-xs mt-0.5 leading-relaxed"
                        style={{
                          color: '#8A8AA3',
                          fontFamily: "'Inter', system-ui, sans-serif",
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {notif.body}
                      </p>
                    </div>

                    {/* Dismiss */}
                    <button
                      className="shrink-0 self-start p-0.5 rounded transition-colors duration-100 opacity-0 group-hover:opacity-100"
                      style={{ color: '#555570' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notif.id);
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = '#E8E8F0';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = '#555570';
                      }}
                    >
                      <X size={12} />
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
