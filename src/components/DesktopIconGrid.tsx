import { useCallback, useEffect, useState } from 'react';
import { useOSStore } from '@/store/osStore';
import DesktopIcon from './DesktopIcon';
import { motion } from 'framer-motion';

export default function DesktopIconGrid() {
  const desktopIcons = useOSStore((s) => s.desktopIcons);
  const showContextMenu = useOSStore((s) => s.showContextMenu);
  const hideContextMenu = useOSStore((s) => s.hideContextMenu);
  const [_selectedId, setSelectedId] = useState<string | null>(null);

  const handleDesktopClick = useCallback(() => {
    setSelectedId(null);
    hideContextMenu();
  }, [hideContextMenu]);

  const handleDesktopRightClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // Only show if clicking on empty desktop (not on an icon)
      if ((e.target as HTMLElement).closest('[data-desktop-icon]')) return;
      showContextMenu(e.clientX, e.clientY);
    },
    [showContextMenu]
  );

  // Handle keyboard events for deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        hideContextMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hideContextMenu]);

  return (
    <motion.div
      className="fixed top-0 left-0 h-full"
      style={{
        zIndex: 10,
        padding: '24px 0 0 24px',
        width: 104,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      onClick={handleDesktopClick}
      onContextMenu={handleDesktopRightClick}
    >
      <div
        className="flex flex-col"
        style={{ gap: 0 }}
      >
        {desktopIcons.map((icon) => (
          <div key={icon.id} data-desktop-icon="true">
            <DesktopIcon
              icon={icon}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
