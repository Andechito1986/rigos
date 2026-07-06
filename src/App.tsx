import { useEffect, useCallback } from 'react';
import { useOSStore } from '@/store/osStore';
import DesktopWallpaper from '@/components/DesktopWallpaper';
import DesktopIconGrid from '@/components/DesktopIconGrid';
import WindowFrame from '@/components/WindowFrame';
import Taskbar from '@/components/Taskbar';
import StartMenu from '@/components/StartMenu';
import ContextMenu from '@/components/ContextMenu';
import NotificationStack from '@/components/NotificationStack';
import NotificationsPanel from '@/components/NotificationsPanel';
import QuickSettings from '@/components/QuickSettings';

export default function App() {
  const {
    windows,
    isBooting,
    closeStartMenu,
    hideContextMenu,
    closeQuickSettings,
    closeNotificationsPanel,
    openWindow,
  } = useOSStore();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const meta = e.metaKey || e.ctrlKey;

      // Super/Meta key opens start menu (just the key alone)
      if (e.key === 'Meta') {
        // Handled by keyup to avoid repeat
      }

      // Super + T -> Terminal
      if (meta && e.key === 't') {
        e.preventDefault();
        openWindow('terminal');
      }

      // Super + F -> File Manager
      if (meta && e.key === 'f') {
        e.preventDefault();
        openWindow('file-manager');
      }

      // Super + G -> GPU Rental
      if (meta && e.key === 'g') {
        e.preventDefault();
        openWindow('gpu-rental');
      }

      // Super + D -> Dashboard
      if (meta && e.key === 'd') {
        e.preventDefault();
        openWindow('dashboard');
      }

      // Escape closes overlays
      if (e.key === 'Escape') {
        closeStartMenu();
        hideContextMenu();
        closeQuickSettings();
        closeNotificationsPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openWindow, closeStartMenu, hideContextMenu, closeQuickSettings, closeNotificationsPanel]);

  // Close menus on any click
  const handleGlobalClick = useCallback(() => {
    hideContextMenu();
  }, [hideContextMenu]);

  // Add some sample notifications after boot
  useEffect(() => {
    if (isBooting) return;

    const timer = setTimeout(() => {
      const { addNotification } = useOSStore.getState();
      addNotification({
        title: 'GPU Instance Started',
        body: 'Your RTX 4090 instance #2847 is now running. SSH: 192.168.1.47',
        appId: 'gpu-rental',
        read: false,
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [isBooting]);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundColor: '#0A0A0F' }}
      onClick={handleGlobalClick}
    >
      {/* Layer 0: Desktop Wallpaper */}
      <DesktopWallpaper />

      {/* Layer 10: Desktop Icons */}
      <DesktopIconGrid />

      {/* Layer 100+: Windows */}
      <div className="absolute inset-0" style={{ top: 0, bottom: 44, zIndex: 100 }}>
        {windows.map((win) => (
          <WindowFrame key={win.id} window={win} />
        ))}
      </div>

      {/* Layer 1000: Taskbar */}
      <Taskbar />

      {/* Layer 1050: Quick Settings */}
      <QuickSettings />

      {/* Layer 1100: Start Menu */}
      <StartMenu />

      {/* Layer 1200: Context Menu */}
      <ContextMenu />

      {/* Layer 1300: Tooltips (handled inline) */}

      {/* Layer 1400: Notifications Panel */}
      <NotificationsPanel />

      {/* Layer 1400: Toast Notifications */}
      <NotificationStack />
    </div>
  );
}
