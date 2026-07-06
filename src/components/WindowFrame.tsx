import { useRef, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OSWindow } from '@/types/os';
import { useOSStore } from '@/store/osStore';
import { getAppById, getAppComponent } from '@/apps/registry';
import { renderAppIcon } from './AppIcons';
import {
  Minus,
  Square,
  Copy,
  X,
} from 'lucide-react';

interface WindowFrameProps {
  window: OSWindow;
}

// Resize handle positions
const resizeHandles = [
  { pos: 'n', cursor: 'ns-resize', style: { top: -4, left: 8, right: 8, height: 8 } },
  { pos: 's', cursor: 'ns-resize', style: { bottom: -4, left: 8, right: 8, height: 8 } },
  { pos: 'e', cursor: 'ew-resize', style: { top: 8, bottom: 8, right: -4, width: 8 } },
  { pos: 'w', cursor: 'ew-resize', style: { top: 8, bottom: 8, left: -4, width: 8 } },
  { pos: 'ne', cursor: 'nesw-resize', style: { top: -4, right: -4, width: 12, height: 12 } },
  { pos: 'nw', cursor: 'nwse-resize', style: { top: -4, left: -4, width: 12, height: 12 } },
  { pos: 'se', cursor: 'nwse-resize', style: { bottom: -4, right: -4, width: 12, height: 12 } },
  { pos: 'sw', cursor: 'nesw-resize', style: { bottom: -4, left: -4, width: 12, height: 12 } },
];

export default function WindowFrame({ window: win }: WindowFrameProps) {
  const {
    activeWindowId,
    focusWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    setWindowPosition,
    setWindowSize,
    apps,
  } = useOSStore();

  const isActive = activeWindowId === win.id;
  const app = getAppById(apps, win.appId);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, winX: 0, winY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0, direction: '' });

  // Drag handlers
  const handleTitleBarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-window-control]')) return;
      if (win.isMaximized) return;

      e.preventDefault();
      focusWindow(win.id);
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        winX: win.position.x,
        winY: win.position.y,
      };
    },
    [win.id, win.position.x, win.position.y, win.isMaximized, focusWindow]
  );

  // Resize handlers
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, direction: string) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: win.size.width,
        height: win.size.height,
        direction,
      };
    },
    [win.size.width, win.size.height]
  );

  // Global mouse events for drag and resize
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setWindowPosition(win.id, {
          x: Math.max(0, dragStart.current.winX + dx),
          y: Math.max(0, dragStart.current.winY + dy),
        });
      }

      if (isResizing) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        const dir = resizeStart.current.direction;

        let newWidth = resizeStart.current.width;
        let newHeight = resizeStart.current.height;

        if (dir.includes('e')) newWidth = resizeStart.current.width + dx;
        if (dir.includes('w')) newWidth = resizeStart.current.width - dx;
        if (dir.includes('s')) newHeight = resizeStart.current.height + dy;
        if (dir.includes('n')) newHeight = resizeStart.current.height - dy;

        const minW = app?.minSize.width || 300;
        const minH = app?.minSize.height || 200;

        setWindowSize(win.id, {
          width: Math.max(minW, newWidth),
          height: Math.max(minH, newHeight),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, win.id, setWindowPosition, setWindowSize, app]);

  const handleWindowClick = useCallback(() => {
    if (!isActive) focusWindow(win.id);
  }, [isActive, focusWindow, win.id]);

  // Window controls
  const onMinimize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      minimizeWindow(win.id);
    },
    [minimizeWindow, win.id]
  );

  const onMaximize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (win.isMaximized) {
        restoreWindow(win.id);
      } else {
        maximizeWindow(win.id);
      }
    },
    [win.isMaximized, maximizeWindow, restoreWindow, win.id]
  );

  const onClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      closeWindow(win.id);
    },
    [closeWindow, win.id]
  );

  if (!app) return null;

  const AppComponent = getAppComponent(app);

  // Compute window style
  const windowStyle: React.CSSProperties = win.isMaximized
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: 'calc(100vh - 44px)',
        zIndex: win.zIndex,
      }
    : {
        position: 'absolute',
        left: win.position.x,
        top: win.position.y,
        width: win.size.width,
        height: win.size.height,
        zIndex: win.zIndex,
      };

  return (
    <AnimatePresence>
      {!win.isMinimized && (
        <motion.div
          className="flex flex-col overflow-hidden"
          style={{
            ...windowStyle,
            borderRadius: 8,
            border: `1px solid ${isActive ? '#3D3D55' : '#2A2A3A'}`,
            backgroundColor: 'rgba(19, 19, 26, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isActive
              ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(0,229,160,0.15)'
              : '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
            opacity: isDragging ? 0.95 : isActive ? 1 : 0.85,
          }}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: isDragging ? 0.95 : isActive ? 1 : 0.85 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{
            duration: isDragging ? 0 : 0.25,
            ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
          }}
          onClick={handleWindowClick}
          onMouseDown={handleWindowClick}
        >
          {/* Title Bar */}
          <div
            className="flex items-center justify-between select-none shrink-0"
            style={{
              height: 36,
              padding: '0 12px',
              background: 'linear-gradient(180deg, #1C1C26 0%, #13131A 100%)',
              borderBottom: '1px solid #2A2A3A',
              cursor: win.isMaximized ? 'default' : isDragging ? 'grabbing' : 'grab',
            }}
            onMouseDown={handleTitleBarMouseDown}
          >
            {/* Left: App icon + name */}
            <div className="flex items-center gap-2 min-w-0">
              {renderAppIcon(app.icon, app.iconType, 16, 'shrink-0')}
              <span
                className="text-[13px] font-medium truncate"
                style={{
                  color: isActive ? '#E8E8F0' : '#8A8AA3',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {win.title}
              </span>
            </div>

            {/* Right: Window controls */}
            <div className="flex items-center gap-1" data-window-control="true">
              {/* Minimize */}
              <button
                className="flex items-center justify-center rounded-[6px] transition-colors duration-150"
                style={{ width: 28, height: 28 }}
                onClick={onMinimize}
                onMouseDown={(e) => e.stopPropagation()}
                title="Minimize"
              >
                <Minus size={14} color="#8A8AA3" />
              </button>

              {/* Maximize / Restore */}
              <button
                className="flex items-center justify-center rounded-[6px] transition-colors duration-150"
                style={{ width: 28, height: 28 }}
                onClick={onMaximize}
                onMouseDown={(e) => e.stopPropagation()}
                title={win.isMaximized ? 'Restore' : 'Maximize'}
              >
                {win.isMaximized ? (
                  <Copy size={12} color="#8A8AA3" />
                ) : (
                  <Square size={12} color="#8A8AA3" />
                )}
              </button>

              {/* Close */}
              <button
                className="flex items-center justify-center rounded-[6px] transition-colors duration-150"
                style={{ width: 28, height: 28 }}
                onClick={onClose}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#FF4757';
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) svg.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) svg.style.color = '#8A8AA3';
                }}
                title="Close"
              >
                <X size={14} color="#8A8AA3" />
              </button>
            </div>
          </div>

          {/* Window Content */}
          <div
            className="flex-1 overflow-auto"
            style={{ padding: 0 }}
          >
            <AppComponent />
          </div>

          {/* Resize Handles */}
          {!win.isMaximized && resizeHandles.map((handle) => (
            <div
              key={handle.pos}
              className="absolute"
              style={{
                ...handle.style,
                cursor: handle.cursor,
                zIndex: 2,
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, handle.pos)}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
