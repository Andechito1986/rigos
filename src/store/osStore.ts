import { create } from 'zustand';
import type {
  OSWindow,
  AppDefinition,
  DesktopIconItem,
  NotificationItem,
  ContextMenuState,
} from '@/types/os';

let nextZIndex = 100;
let nextWindowId = 1;

function getNextZIndex(): number {
  return nextZIndex++;
}

interface OSState {
  // Windows
  windows: OSWindow[];
  activeWindowId: string | null;

  // Apps
  apps: AppDefinition[];

  // Desktop icons
  desktopIcons: DesktopIconItem[];

  // Notifications
  notifications: NotificationItem[];

  // UI State
  isStartMenuOpen: boolean;
  isBooting: boolean;
  isNotificationsPanelOpen: boolean;
  isQuickSettingsOpen: boolean;
  contextMenu: ContextMenuState;

  // Wallpaper
  currentWallpaper: string;

  // Actions
  openWindow: (appId: string) => void;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  restoreWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  setWindowPosition: (windowId: string, position: { x: number; y: number }) => void;
  setWindowSize: (windowId: string, size: { width: number; height: number }) => void;
  toggleStartMenu: () => void;
  openStartMenu: () => void;
  closeStartMenu: () => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  showContextMenu: (x: number, y: number, items?: ContextMenuState['items']) => void;
  hideContextMenu: () => void;
  setBooting: (value: boolean) => void;
  setWallpaper: (wallpaper: string) => void;
  toggleNotificationsPanel: () => void;
  toggleQuickSettings: () => void;
  closeNotificationsPanel: () => void;
  closeQuickSettings: () => void;
  minimizeAllWindows: () => void;
}

const DEFAULT_CONTEXT_MENU: ContextMenuState['items'] = [
  { id: 'new-folder', label: 'New Folder', icon: 'FolderPlus', action: 'new-folder' },
  { id: 'new-document', label: 'New Document', icon: 'FilePlus', action: 'new-document' },
  { id: 'divider-1', label: '', action: '', divider: true },
  { id: 'open-terminal', label: 'Open Terminal', icon: 'Terminal', action: 'open-terminal' },
  { id: 'divider-2', label: '', action: '', divider: true },
  { id: 'change-background', label: 'Change Background', icon: 'Image', action: 'change-background' },
  { id: 'divider-3', label: '', action: '', divider: true },
  { id: 'properties', label: 'Properties', icon: 'Settings', action: 'properties' },
];

const DEFAULT_APPS: AppDefinition[] = [
  {
    id: 'gpu-rental',
    name: 'GPU Rental',
    icon: 'GpuIcon',
    iconType: 'svg',
    component: 'GPURental',
    defaultSize: { width: 1100, height: 720 },
    minSize: { width: 600, height: 400 },
    category: 'System',
    pinned: true,
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: 'TerminalIcon',
    iconType: 'svg',
    component: 'Terminal',
    defaultSize: { width: 700, height: 480 },
    minSize: { width: 400, height: 300 },
    category: 'System',
    pinned: true,
  },
  {
    id: 'file-manager',
    name: 'Files',
    icon: 'FileManagerIcon',
    iconType: 'svg',
    component: 'FileManager',
    defaultSize: { width: 800, height: 560 },
    minSize: { width: 400, height: 300 },
    category: 'System',
    pinned: true,
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: 'DashboardIcon',
    iconType: 'svg',
    component: 'Dashboard',
    defaultSize: { width: 1000, height: 640 },
    minSize: { width: 600, height: 400 },
    category: 'System',
    pinned: true,
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: 'SettingsIcon',
    iconType: 'svg',
    component: 'Settings',
    defaultSize: { width: 640, height: 520 },
    minSize: { width: 400, height: 320 },
    category: 'System',
    pinned: false,
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: 'Calculator',
    iconType: 'lucide',
    component: 'Placeholder',
    defaultSize: { width: 320, height: 480 },
    minSize: { width: 320, height: 480 },
    category: 'Utilities',
    pinned: false,
  },
  {
    id: 'text-editor',
    name: 'Text Editor',
    icon: 'FileText',
    iconType: 'lucide',
    component: 'Placeholder',
    defaultSize: { width: 600, height: 480 },
    minSize: { width: 400, height: 300 },
    category: 'Utilities',
    pinned: false,
  },
  {
    id: 'browser',
    name: 'Browser',
    icon: 'Globe',
    iconType: 'lucide',
    component: 'Placeholder',
    defaultSize: { width: 960, height: 640 },
    minSize: { width: 600, height: 400 },
    category: 'Internet',
    pinned: false,
  },
  {
    id: 'system-monitor',
    name: 'System Monitor',
    icon: 'Activity',
    iconType: 'lucide',
    component: 'Placeholder',
    defaultSize: { width: 640, height: 480 },
    minSize: { width: 400, height: 300 },
    category: 'System',
    pinned: false,
  },
  {
    id: 'readme',
    name: 'README',
    icon: 'BookOpen',
    iconType: 'lucide',
    component: 'Placeholder',
    defaultSize: { width: 560, height: 480 },
    minSize: { width: 400, height: 300 },
    category: 'Documentation',
    pinned: false,
  },
];

const DEFAULT_DESKTOP_ICONS: DesktopIconItem[] = [
  {
    id: 'icon-home',
    appId: 'file-manager',
    label: 'Home',
    icon: 'HomeIcon',
    iconType: 'svg',
    position: { x: 24, y: 24 },
  },
  {
    id: 'icon-gpu-rental',
    appId: 'gpu-rental',
    label: 'GPU Rental',
    icon: 'GpuIcon',
    iconType: 'svg',
    position: { x: 24, y: 120 },
  },
  {
    id: 'icon-terminal',
    appId: 'terminal',
    label: 'Terminal',
    icon: 'TerminalIcon',
    iconType: 'svg',
    position: { x: 24, y: 216 },
  },
  {
    id: 'icon-trash',
    appId: 'file-manager',
    label: 'Trash',
    icon: 'TrashIcon',
    iconType: 'svg',
    position: { x: 24, y: 312 },
  },
];

export const useOSStore = create<OSState>((set, get) => ({
  windows: [],
  activeWindowId: null,
  apps: DEFAULT_APPS,
  desktopIcons: DEFAULT_DESKTOP_ICONS,
  notifications: [],
  isStartMenuOpen: false,
  isBooting: true,
  isNotificationsPanelOpen: false,
  isQuickSettingsOpen: false,
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    items: DEFAULT_CONTEXT_MENU,
  },
  currentWallpaper: '/wallpaper-default.jpg',

  openWindow: (appId: string) => {
    const state = get();
    const app = state.apps.find((a) => a.id === appId);
    if (!app) return;

    // Check if app is already open and not minimized
    const existing = state.windows.find((w) => w.appId === appId && !w.isMinimized);
    if (existing) {
      get().focusWindow(existing.id);
      return;
    }

    const id = `win-${nextWindowId++}`;

    // Cascade position: center with offset based on open window count
    const offsetX = (state.windows.length * 30) % 150;
    const offsetY = (state.windows.length * 30) % 150;
    const defaultX = Math.max(0, Math.round((window.innerWidth - app.defaultSize.width) / 2) + offsetX);
    const defaultY = Math.max(0, Math.round((window.innerHeight - 44 - app.defaultSize.height) / 2) + offsetY);

    const newWindow: OSWindow = {
      id,
      appId,
      title: app.name,
      position: { x: defaultX, y: defaultY },
      size: { ...app.defaultSize },
      isMinimized: false,
      isMaximized: false,
      zIndex: getNextZIndex(),
    };

    set({
      windows: [...state.windows, newWindow],
      activeWindowId: id,
    });
  },

  closeWindow: (windowId: string) => {
    const state = get();
    const newWindows = state.windows.filter((w) => w.id !== windowId);
    set({
      windows: newWindows,
      activeWindowId: state.activeWindowId === windowId
        ? (newWindows.length > 0 ? newWindows[newWindows.length - 1].id : null)
        : state.activeWindowId,
    });
  },

  minimizeWindow: (windowId: string) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === windowId ? { ...w, isMinimized: true } : w
      ),
      activeWindowId: s.activeWindowId === windowId ? null : s.activeWindowId,
    }));
  },

  maximizeWindow: (windowId: string) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === windowId ? { ...w, isMaximized: true, zIndex: getNextZIndex() } : w
      ),
      activeWindowId: windowId,
    }));
  },

  restoreWindow: (windowId: string) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === windowId ? { ...w, isMinimized: false, isMaximized: false, zIndex: getNextZIndex() } : w
      ),
      activeWindowId: windowId,
    }));
  },

  focusWindow: (windowId: string) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === windowId ? { ...w, zIndex: getNextZIndex(), isMinimized: false } : w
      ),
      activeWindowId: windowId,
    }));
  },

  setWindowPosition: (windowId: string, position: { x: number; y: number }) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === windowId ? { ...w, position } : w
      ),
    }));
  },

  setWindowSize: (windowId: string, size: { width: number; height: number }) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === windowId ? { ...w, size } : w
      ),
    }));
  },

  toggleStartMenu: () => set((s) => ({ isStartMenuOpen: !s.isStartMenuOpen })),
  openStartMenu: () => set({ isStartMenuOpen: true }),
  closeStartMenu: () => set({ isStartMenuOpen: false }),

  addNotification: (notification) => {
    const item: NotificationItem = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: Date.now(),
      read: false,
    };
    set((s) => ({ notifications: [item, ...s.notifications] }));
  },

  dismissNotification: (id: string) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },

  showContextMenu: (x: number, y: number, items?: ContextMenuState['items']) => {
    set({
      contextMenu: {
        visible: true,
        x,
        y,
        items: items || DEFAULT_CONTEXT_MENU,
      },
    });
  },

  hideContextMenu: () => {
    set((s) => ({ contextMenu: { ...s.contextMenu, visible: false } }));
  },

  setBooting: (value: boolean) => set({ isBooting: value }),
  setWallpaper: (wallpaper: string) => set({ currentWallpaper: wallpaper }),

  toggleNotificationsPanel: () =>
    set((s) => ({ isNotificationsPanelOpen: !s.isNotificationsPanelOpen, isQuickSettingsOpen: false })),
  toggleQuickSettings: () =>
    set((s) => ({ isQuickSettingsOpen: !s.isQuickSettingsOpen, isNotificationsPanelOpen: false })),
  closeNotificationsPanel: () => set({ isNotificationsPanelOpen: false }),
  closeQuickSettings: () => set({ isQuickSettingsOpen: false }),

  minimizeAllWindows: () => {
    set((s) => ({
      windows: s.windows.map((w) => ({ ...w, isMinimized: true })),
      activeWindowId: null,
    }));
  },
}));
