import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { X, Bell } from 'lucide-react';
import { renderAppIcon } from './AppIcons';
import { getAppById } from '@/apps/registry';

// Toast notification component
function ToastNotification({
  id,
  title,
  body,
  appId,
  onDismiss,
}: {
  id: string;
  title: string;
  body: string;
  appId: string;
  onDismiss: (id: string) => void;
}) {
  const apps = useOSStore((s) => s.apps);
  const app = getAppById(apps, appId);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 5000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <motion.div
      className="flex gap-3 p-4 rounded-[10px]"
      style={{
        backgroundColor: 'rgba(19, 19, 26, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid #2A2A3A',
        width: 320,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      layout
    >
      {/* App icon */}
      <div className="shrink-0 mt-0.5">
        {app ? (
          renderAppIcon(app.icon, app.iconType, 20, '')
        ) : (
          <Bell size={20} color="#8A8AA3" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4
            className="text-[13px] font-medium truncate"
            style={{
              color: '#E8E8F0',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {title}
          </h4>
          <button
            className="shrink-0 p-0.5 rounded transition-colors duration-100"
            onClick={() => onDismiss(id)}
            style={{ color: '#555570' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#E8E8F0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#555570';
            }}
          >
            <X size={12} />
          </button>
        </div>
        <p
          className="text-xs mt-1 leading-relaxed"
          style={{
            color: '#8A8AA3',
            fontFamily: "'Inter', system-ui, sans-serif",
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {body}
        </p>
      </div>
    </motion.div>
  );
}

export default function NotificationStack() {
  const notifications = useOSStore((s) => s.notifications);
  const dismissNotification = useOSStore((s) => s.dismissNotification);

  return (
    <div
      className="fixed top-4 right-4 flex flex-col gap-2"
      style={{ zIndex: 1400 }}
    >
      <AnimatePresence>
        {notifications.slice(0, 5).map((notif) => (
          <ToastNotification
            key={notif.id}
            id={notif.id}
            title={notif.title}
            body={notif.body}
            appId={notif.appId}
            onDismiss={dismissNotification}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
