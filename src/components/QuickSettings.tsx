import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import {
  Volume2,
  Sun,
  Wifi,
  Settings,
  X,
} from 'lucide-react';

export default function QuickSettings() {
  const { isQuickSettingsOpen, closeQuickSettings, openWindow } = useOSStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!isQuickSettingsOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeQuickSettings();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeQuickSettings();
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
  }, [isQuickSettingsOpen, closeQuickSettings]);

  const handleOpenSettings = () => {
    closeQuickSettings();
    openWindow('settings');
  };

  return (
    <AnimatePresence>
      {isQuickSettingsOpen && (
        <motion.div
          ref={panelRef}
          className="fixed bottom-[52px] right-4 flex flex-col gap-4 p-4 rounded-[10px]"
          style={{
            width: 280,
            backgroundColor: 'rgba(19, 19, 26, 0.9)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid #2A2A3A',
            zIndex: 1050,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-medium"
              style={{
                color: '#E8E8F0',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Quick Settings
            </span>
            <button
              className="p-1 rounded transition-colors duration-100"
              style={{ color: '#555570' }}
              onClick={closeQuickSettings}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#E8E8F0';
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#555570';
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Volume2 size={16} color="#8A8AA3" />
              <span
                className="text-xs"
                style={{
                  color: '#8A8AA3',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                Volume
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              defaultValue={75}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: 'linear-gradient(to right, #00E5A0 75%, #2A2A3A 75%)',
                accentColor: '#00E5A0',
              }}
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                (e.target as HTMLInputElement).style.background = `linear-gradient(to right, #00E5A0 ${val}%, #2A2A3A ${val}%)`;
              }}
            />
          </div>

          {/* Brightness Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Sun size={16} color="#8A8AA3" />
              <span
                className="text-xs"
                style={{
                  color: '#8A8AA3',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                Brightness
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              defaultValue={85}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: 'linear-gradient(to right, #00E5A0 85%, #2A2A3A 85%)',
              }}
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                (e.target as HTMLInputElement).style.background = `linear-gradient(to right, #00E5A0 ${val}%, #2A2A3A ${val}%)`;
              }}
            />
          </div>

          {/* Network Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi size={16} color="#00E5A0" />
              <span
                className="text-xs"
                style={{
                  color: '#E8E8F0',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                Wi-Fi Connected
              </span>
            </div>
            <div
              className="w-8 h-[18px] rounded-full relative cursor-pointer"
              style={{ backgroundColor: '#00E5A0' }}
            >
              <div
                className="absolute top-[2px] right-[2px] w-[14px] h-[14px] rounded-full"
                style={{ backgroundColor: '#fff' }}
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: '#2A2A3A' }} />

          {/* Settings shortcut */}
          <button
            className="flex items-center gap-2 py-2 px-3 rounded-[6px] transition-colors duration-100"
            onClick={handleOpenSettings}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            <Settings size={16} color="#8A8AA3" />
            <span
              className="text-xs"
              style={{
                color: '#E8E8F0',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Open Settings
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
