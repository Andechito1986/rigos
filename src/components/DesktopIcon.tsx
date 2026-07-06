import { useState, useCallback } from 'react';
import type { DesktopIconItem } from '@/types/os';
import { useOSStore } from '@/store/osStore';
import { renderAppIcon } from './AppIcons';
import { motion } from 'framer-motion';

interface DesktopIconProps {
  icon: DesktopIconItem;
}

export default function DesktopIcon({ icon }: DesktopIconProps) {
  const [selected, setSelected] = useState(false);
  const openWindow = useOSStore((s) => s.openWindow);
  const showContextMenu = useOSStore((s) => s.showContextMenu);

  const handleClick = useCallback(() => {
    setSelected(true);
  }, []);

  const handleDoubleClick = useCallback(() => {
    openWindow(icon.appId);
    setSelected(false);
  }, [icon.appId, openWindow]);

  const handleRightClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu(e.clientX, e.clientY);
    },
    [showContextMenu]
  );

  // Deselect when clicking elsewhere - handled by parent

  return (
    <motion.div
      className="flex flex-col items-center justify-start cursor-pointer select-none"
      style={{
        width: 80,
        height: 96,
        padding: '4px 2px',
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
    >
      {/* Icon background */}
      <div
        className="flex items-center justify-center rounded-[6px] transition-colors duration-100"
        style={{
          width: 72,
          height: 64,
          backgroundColor: selected ? 'rgba(0, 229, 160, 0.12)' : 'transparent',
          border: selected ? '1px solid #00E5A0' : '1px solid transparent',
        }}
      >
        {/* Icon graphic */}
        <div className="flex flex-col items-center">
          {renderAppIcon(icon.icon, icon.iconType, 48, '')}
        </div>
      </div>

      {/* Label */}
      <span
        className="mt-1 text-center leading-tight px-1 rounded-sm"
        style={{
          fontSize: 11,
          fontFamily: "'Inter', system-ui, sans-serif",
          color: '#E8E8F0',
          maxWidth: 72,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          backgroundColor: selected ? 'rgba(0, 229, 160, 0.12)' : 'transparent',
          border: selected ? '1px solid #00E5A0' : '1px solid transparent',
          borderRadius: 3,
          wordBreak: 'break-word',
        }}
      >
        {icon.label}
      </span>
    </motion.div>
  );
}
