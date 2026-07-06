import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { getAppById } from '@/apps/registry';
import { renderAppIcon } from './AppIcons';
import {
  Wifi,
  Volume2,
  BatteryMedium,
  Bell,
} from 'lucide-react';

export default function Taskbar() {
  const {
    apps,
    windows,
    activeWindowId,
    openWindow,
    focusWindow,
    minimizeWindow,
    toggleStartMenu,
    isStartMenuOpen,
    toggleNotificationsPanel,
    toggleQuickSettings,
  } = useOSStore();

  const [time, setTime] = useState(new Date());
  const [clockTooltip, setClockTooltip] = useState(false);

  // Clock update
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Pinned apps (first 4)
  const pinnedApps = apps.filter((a) => a.pinned);

  // Handle app icon click
  const handleAppClick = useCallback(
    (appId: string) => {
      // Check if app has open windows
      const appWindows = windows.filter((w) => w.appId === appId && !w.isMinimized);
      if (appWindows.length > 0) {
        // If app has focused window, minimize it; otherwise focus first window
        const focused = appWindows.find((w) => w.id === activeWindowId);
        if (focused) {
          minimizeWindow(focused.id);
        } else {
          focusWindow(appWindows[0].id);
        }
      } else {
        // Check for minimized windows
        const minimized = windows.filter((w) => w.appId === appId && w.isMinimized);
        if (minimized.length > 0) {
          focusWindow(minimized[0].id);
        } else {
          openWindow(appId);
        }
      }
    },
    [windows, activeWindowId, focusWindow, minimizeWindow, openWindow]
  );

  // Handle window pill click
  const handleWindowPillClick = useCallback(
    (windowId: string) => {
      if (activeWindowId === windowId) {
        minimizeWindow(windowId);
      } else {
        focusWindow(windowId);
      }
    },
    [activeWindowId, focusWindow, minimizeWindow]
  );

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-between select-none"
      style={{
        height: 44,
        background: 'linear-gradient(180deg, rgba(28,28,38,0.95) 0%, rgba(19,19,26,0.98) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid #2A2A3A',
        padding: '0 12px',
        zIndex: 1000,
      }}
      initial={{ y: 44 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
    >
      {/* Left: Activities button + pinned apps */}
      <div className="flex items-center gap-1">
        {/* Activities button */}
        <button
          className="flex items-center gap-2 h-[36px] px-[14px] rounded-[8px] transition-colors duration-150"
          style={{
            backgroundColor: isStartMenuOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
          }}
          onClick={toggleStartMenu}
          onMouseEnter={(e) => {
            if (!isStartMenuOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={(e) => {
            if (!isStartMenuOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="14" width="40" height="20" rx="3" fill="#1C1C26" stroke="#00E5A0" strokeWidth="2" />
            <circle cx="14" cy="24" r="5" fill="#13131A" stroke="#00E5A0" strokeWidth="1.5" />
            <circle cx="14" cy="24" r="2" fill="#00E5A0" opacity="0.6" />
            <circle cx="34" cy="24" r="5" fill="#13131A" stroke="#00E5A0" strokeWidth="1.5" />
            <circle cx="34" cy="24" r="2" fill="#00E5A0" opacity="0.6" />
          </svg>
          <span
            className="text-xs font-medium"
            style={{
              color: isStartMenuOpen ? '#E8E8F0' : '#8A8AA3',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Activities
          </span>
        </button>

        {/* Pinned app icons */}
        <div className="flex items-center gap-[4px] ml-2">
          {pinnedApps.map((app) => {
            const hasWindow = windows.some((w) => w.appId === app.id);
            const isActive = windows.some((w) => w.appId === app.id && w.id === activeWindowId && !w.isMinimized);

            return (
              <button
                key={app.id}
                className="relative flex items-center justify-center rounded-[8px] transition-colors duration-150"
                style={{
                  width: 36,
                  height: 36,
                  padding: 6,
                  backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                }}
                onClick={() => handleAppClick(app.id)}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
                title={app.name}
              >
                {renderAppIcon(app.icon, app.iconType, 24, '')}

                {/* Active indicator */}
                {hasWindow && (
                  <motion.div
                    className="absolute bottom-[2px] left-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      width: '60%',
                      height: 3,
                      backgroundColor: isActive ? '#00E5A0' : '#8A8AA3',
                    }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center: Open window pills */}
      <div className="flex items-center gap-1">
        <AnimatePresence>
          {windows.filter((w) => !w.isMinimized).map((win) => {
            const app = getAppById(apps, win.appId);
            const isWindowActive = win.id === activeWindowId;

            return (
              <motion.button
                key={win.id}
                className="flex items-center gap-2 h-[32px] px-3 rounded-[6px] transition-colors duration-150 min-w-[120px] max-w-[200px]"
                style={{
                  backgroundColor: isWindowActive
                    ? 'rgba(255,255,255,0.1)'
                    : 'transparent',
                  border: isWindowActive
                    ? '1px solid #3D3D55'
                    : '1px solid transparent',
                }}
                onClick={() => handleWindowPillClick(win.id)}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                title={win.title}
              >
                {app && renderAppIcon(app.icon, app.iconType, 14, 'shrink-0')}
                <span
                  className="text-xs truncate"
                  style={{
                    color: isWindowActive ? '#E8E8F0' : '#8A8AA3',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {win.title}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Right: System tray + clock */}
      <div className="flex items-center gap-[10px]">
        {/* Notification bell */}
        <button
          className="flex items-center justify-center transition-colors duration-150"
          style={{ color: '#8A8AA3' }}
          onClick={toggleNotificationsPanel}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#E8E8F0'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8A8AA3'; }}
        >
          <Bell size={18} />
        </button>

        {/* Volume */}
        <button
          className="flex items-center justify-center transition-colors duration-150"
          style={{ color: '#8A8AA3' }}
          onClick={toggleQuickSettings}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#E8E8F0'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8A8AA3'; }}
        >
          <Volume2 size={18} />
        </button>

        {/* WiFi */}
        <button
          className="flex items-center justify-center transition-colors duration-150"
          style={{ color: '#8A8AA3' }}
          onClick={toggleQuickSettings}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#E8E8F0'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8A8AA3'; }}
        >
          <Wifi size={18} />
        </button>

        {/* Battery */}
        <button
          className="flex items-center justify-center transition-colors duration-150"
          style={{ color: '#8A8AA3' }}
          onClick={toggleQuickSettings}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#E8E8F0'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8A8AA3'; }}
        >
          <BatteryMedium size={18} />
        </button>

        {/* Clock */}
        <div
          className="relative flex items-center"
          onMouseEnter={() => setClockTooltip(true)}
          onMouseLeave={() => setClockTooltip(false)}
        >
          <span
            className="text-[13px] font-medium"
            style={{
              color: '#8A8AA3',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {formatTime(time)}
          </span>

          {/* Clock tooltip */}
          <AnimatePresence>
            {clockTooltip && (
              <motion.div
                className="absolute bottom-full right-0 mb-2 px-3 py-2 rounded-[6px] whitespace-nowrap"
                style={{
                  backgroundColor: '#1C1C26',
                  border: '1px solid #2A2A3A',
                  color: '#E8E8F0',
                  fontSize: 12,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
              >
                {formatDate(time)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
