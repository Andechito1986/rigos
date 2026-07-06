import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import {
  FolderPlus,
  FilePlus,
  Terminal,
  Image,
  Settings,
} from 'lucide-react';

const iconMap: Record<string, React.FC<{ size?: number; color?: string }>> = {
  FolderPlus,
  FilePlus,
  Terminal,
  Image,
  Settings,
};

export default function ContextMenu() {
  const { contextMenu, hideContextMenu, openWindow } = useOSStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideContextMenu();
    };

    // Delay to avoid immediate close from the same click that opened it
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.visible, hideContextMenu]);

  const handleItemClick = useCallback(
    (action: string) => {
      hideContextMenu();

      switch (action) {
        case 'new-folder':
          // TODO: Create new folder on desktop
          break;
        case 'new-document':
          // TODO: Create new document on desktop
          break;
        case 'open-terminal':
          openWindow('terminal');
          break;
        case 'change-background':
          openWindow('settings');
          break;
        case 'properties':
          // TODO: Show desktop properties
          break;
        default:
          break;
      }
    },
    [hideContextMenu, openWindow]
  );

  // Adjust position to keep menu on screen
  const adjustedPos = {
    x: Math.min(contextMenu.x, window.innerWidth - 200),
    y: Math.min(contextMenu.y, window.innerHeight - 250),
  };

  return (
    <AnimatePresence>
      {contextMenu.visible && (
        <motion.div
          ref={menuRef}
          className="fixed flex flex-col py-1"
          style={{
            left: adjustedPos.x,
            top: adjustedPos.y,
            minWidth: 180,
            backgroundColor: '#13131A',
            border: '1px solid #2A2A3A',
            borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            zIndex: 1200,
          }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {contextMenu.items.map((item) => {
            if (item.divider) {
              return (
                <div
                  key={item.id}
                  className="my-1"
                  style={{
                    height: 1,
                    backgroundColor: '#2A2A3A',
                    margin: '4px 12px',
                  }}
                />
              );
            }

            const IconComponent = item.icon ? iconMap[item.icon] : null;

            return (
              <button
                key={item.id}
                className="flex items-center gap-2 mx-1 px-3 rounded-[4px] transition-colors duration-100"
                style={{
                  height: 28,
                  color: '#E8E8F0',
                  fontSize: 13,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
                onClick={() => handleItemClick(item.action)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#1C1C26';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                {IconComponent && <IconComponent size={14} color="#8A8AA3" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
