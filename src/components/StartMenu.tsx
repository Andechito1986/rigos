import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { renderAppIcon } from './AppIcons';
import { Search } from 'lucide-react';

export default function StartMenu() {
  const { isStartMenuOpen, closeStartMenu, apps, openWindow } = useOSStore();
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto-focus search when opening
  useEffect(() => {
    if (isStartMenuOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
    if (!isStartMenuOpen) {
      setSearchQuery('');
    }
  }, [isStartMenuOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isStartMenuOpen) {
        closeStartMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStartMenuOpen, closeStartMenu]);

  const filteredApps = searchQuery.trim()
    ? apps.filter((app) =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : apps;

  const handleAppClick = (appId: string) => {
    openWindow(appId);
    closeStartMenu();
  };

  return (
    <AnimatePresence>
      {isStartMenuOpen && (
        <motion.div
          className="fixed inset-0 flex flex-col items-center"
          style={{
            zIndex: 1100,
            backgroundColor: 'rgba(10, 10, 15, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '32px 48px 0',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeStartMenu();
          }}
        >
          {/* Search Bar */}
          <motion.div
            className="relative flex items-center"
            style={{ width: 480, height: 44, marginBottom: 32 }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.25,
              delay: 0.05,
              ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
            }}
          >
            <Search
              size={16}
              className="absolute left-5 pointer-events-none"
              color="#555570"
            />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type to search..."
              className="w-full h-full rounded-[22px] outline-none transition-colors duration-200"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid #2A2A3A',
                padding: '0 20px 0 44px',
                color: '#E8E8F0',
                fontSize: 13,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = '#00E5A0';
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = '#2A2A3A';
              }}
            />
          </motion.div>

          {/* App Grid */}
          <motion.div
            className="grid gap-4"
            style={{
              gridTemplateColumns: 'repeat(6, 96px)',
              maxWidth: 720,
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.25,
              delay: 0.05,
              ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
            }}
          >
            <AnimatePresence>
              {filteredApps.map((app) => (
                <motion.button
                  key={app.id}
                  className="flex flex-col items-center gap-[6px] group"
                  style={{ width: 96 }}
                  onClick={() => handleAppClick(app.id)}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: searchQuery && !app.name.toLowerCase().includes(searchQuery.toLowerCase())
                      ? 0.2
                      : 1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* App tile */}
                  <div
                    className="flex items-center justify-center rounded-[16px] transition-colors duration-150"
                    style={{
                      width: 96,
                      height: 96,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)';
                    }}
                  >
                    {renderAppIcon(app.icon, app.iconType, 48, '')}
                  </div>

                  {/* Label */}
                  <span
                    className="text-center"
                    style={{
                      fontSize: 11,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      color: '#8A8AA3',
                      maxWidth: 88,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {app.name}
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* No results message */}
          {filteredApps.length === 0 && (
            <div
              className="mt-8 text-center"
              style={{
                color: '#8A8AA3',
                fontSize: 13,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              No applications found
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
