// OS Core Types - RIG.OS

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface OSWindow {
  id: string;
  appId: string;
  title: string;
  position: WindowPosition;
  size: WindowSize;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

export interface AppDefinition {
  id: string;
  name: string;
  icon: string; // lucide icon name or svg component name
  iconType: 'lucide' | 'svg';
  component: string; // component name, resolved by registry
  defaultSize: WindowSize;
  minSize: WindowSize;
  category: string;
  pinned?: boolean;
}

export interface DesktopIconItem {
  id: string;
  appId: string;
  label: string;
  icon: string;
  iconType: 'lucide' | 'svg';
  position: WindowPosition;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  appId: string;
  timestamp: number;
  read?: boolean;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string; // lucide icon name
  action: string;
  shortcut?: string;
  divider?: boolean;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export interface BootLogLine {
  text: string;
  delay: number;
}

export interface FileSystemNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileSystemNode[];
  content?: string;
  size?: number;
  modified?: Date;
}
