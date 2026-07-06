import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Home,
  Monitor,
  FileText,
  Download,
  Image,
  Film,
  Music,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  LayoutGrid,
  List,
  Folder,
  FileCode,
  Terminal,
  Archive,
  Search,
  Plus,
  RefreshCw,
  MoreVertical,
  X,
  Check,
  Settings2,
  Scissors,
  Copy,
  ClipboardPaste,
  Pencil,
  Info,
  HardDrive,
  Clock,
  Lock,
  FileImage,
} from 'lucide-react';
import {
  getFileSystem,
  getNodeAtPath,
  resolvePath,
  getParentPath,
  getBasename,
  formatSize,
  formatDate,
  createNodeAtPath,
  removeNodeAtPath,
  cloneNode,
  getItemCount,
  getDirectorySize,
  getFileType,
  getFileIconColor,
  type FileNode,
} from '@/lib/filesystem';
import { useOSStore } from '@/store/osStore';

const HOME_PATH = '/home/rigos';

const sidebarItems = [
  { label: 'Home', icon: Home, path: HOME_PATH },
  { label: 'Desktop', icon: Monitor, path: `${HOME_PATH}/Desktop` },
  { label: 'Documents', icon: FileText, path: `${HOME_PATH}/Documents` },
  { label: 'Downloads', icon: Download, path: `${HOME_PATH}/Downloads` },
  { label: 'Pictures', icon: Image, path: `${HOME_PATH}/Pictures` },
  { label: 'Videos', icon: Film, path: `${HOME_PATH}/Videos` },
  { label: 'Music', icon: Music, path: `${HOME_PATH}/Music` },
  { label: 'Trash', icon: Trash2, path: `${HOME_PATH}/.trash` },
];

function getFileIcon(node: FileNode, size: number = 48) {
  const color = getFileIconColor(node);
  if (node.type === 'directory') return <Folder size={size} style={{ color }} />;
  const ext = node.name.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg'].includes(ext)) return <FileImage size={size} style={{ color: '#A855F7' }} />;
  if (['py', 'js', 'ts', 'tsx', 'json'].includes(ext)) return <FileCode size={size} style={{ color: '#FFB020' }} />;
  if (['sh', 'run'].includes(ext)) return <Terminal size={size} style={{ color: '#00E5A0' }} />;
  if (['zip', 'tar', 'deb'].includes(ext)) return <Archive size={size} style={{ color: '#FFB020' }} />;
  if (['txt', 'md', 'conf', 'config', 'log'].includes(ext)) return <FileText size={size} style={{ color: '#8A8AA3' }} />;
  return <HardDrive size={size} style={{ color: '#8A8AA3' }} />;
}

export default function FileManager() {
  const [currentPath, setCurrentPath] = useState(HOME_PATH);
  const [viewMode, setViewMode] = useState<'icon' | 'list'>('icon');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<{ items: FileNode[]; operation: 'copy' | 'cut' } | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [navHistory, setNavHistory] = useState<string[]>([HOME_PATH]);
  const [navIndex, setNavIndex] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileNode } | null>(null);
  const [showProperties, setShowProperties] = useState<FileNode | null>(null);
  const [renameItem, setRenameItem] = useState<FileNode | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<FileNode | null>(null);
  const [newFolderActive, setNewFolderActive] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const fileManagerRef = useRef<HTMLDivElement>(null);
  const addNotification = useOSStore((s) => s.addNotification);

  const fs = getFileSystem();
  const currentDir = getNodeAtPath(fs, currentPath);
  const items = currentDir?.type === 'directory' && currentDir.children
    ? currentDir.children.filter((c) => {
        if (!searchQuery) return true;
        return c.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : [];

  // Sort items
  const sortedItems = [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    let cmp = 0;
    switch (sortBy) {
      case 'name':
        cmp = a.name.localeCompare(b.name);
        break;
      case 'size':
        cmp = a.size - b.size;
        break;
      case 'date':
        cmp = a.modified.getTime() - b.modified.getTime();
        break;
    }
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  // Navigate
  const navigate = useCallback(
    (path: string) => {
      setCurrentPath(path);
      setSelectedItems(new Set());
      setRenameItem(null);
      setNewFolderActive(false);
      // Add to history
      const newHistory = navHistory.slice(0, navIndex + 1);
      if (newHistory[newHistory.length - 1] !== path) {
        newHistory.push(path);
        setNavHistory(newHistory);
        setNavIndex(newHistory.length - 1);
      }
    },
    [navHistory, navIndex]
  );

  const goBack = useCallback(() => {
    if (navIndex > 0) {
      const newIndex = navIndex - 1;
      setNavIndex(newIndex);
      setCurrentPath(navHistory[newIndex]);
      setSelectedItems(new Set());
    }
  }, [navIndex, navHistory]);

  const goForward = useCallback(() => {
    if (navIndex < navHistory.length - 1) {
      const newIndex = navIndex + 1;
      setNavIndex(newIndex);
      setCurrentPath(navHistory[newIndex]);
      setSelectedItems(new Set());
    }
  }, [navIndex, navHistory]);

  const goUp = useCallback(() => {
    if (currentPath !== '/') {
      navigate(getParentPath(currentPath));
    }
  }, [currentPath, navigate]);

  // Selection
  const toggleSelect = useCallback(
    (name: string, ctrl: boolean) => {
      if (ctrl) {
        const newSet = new Set(selectedItems);
        if (newSet.has(name)) newSet.delete(name);
        else newSet.add(name);
        setSelectedItems(newSet);
      } else {
        setSelectedItems(new Set([name]));
      }
    },
    [selectedItems]
  );

  // Open item
  const openItem = useCallback(
    (item: FileNode) => {
      if (item.type === 'directory') {
        navigate(currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`);
      } else {
        // For files, show properties
        setShowProperties(item);
      }
    },
    [currentPath, navigate]
  );

  // Create folder
  const createFolder = useCallback(() => {
    if (!newFolderName.trim()) {
      setNewFolderActive(false);
      return;
    }
    const newDir: FileNode = {
      name: newFolderName.trim(),
      type: 'directory',
      permissions: 'drwxr-xr-x',
      owner: 'rigos',
      size: 4096,
      modified: new Date(),
      children: [],
    };
    if (createNodeAtPath(fs, currentPath, newDir)) {
      setNewFolderActive(false);
      setNewFolderName('');
      addNotification({
        title: 'Folder Created',
        body: `Created folder "${newFolderName.trim()}"`,
        appId: 'file-manager',
      });
    } else {
      addNotification({
        title: 'Error',
        body: `Could not create folder "${newFolderName.trim()}"`,
        appId: 'file-manager',
      });
    }
  }, [newFolderName, currentPath, fs, addNotification]);

  // Delete
  const deleteItem = useCallback(
    (item: FileNode) => {
      removeNodeAtPath(fs, currentPath, item.name);
      const trashPath = `${HOME_PATH}/.trash`;
      const trashDir = getNodeAtPath(fs, trashPath);
      if (trashDir && trashDir.type === 'directory') {
        const clone = cloneNode(item);
        trashDir.children = [...(trashDir.children || []), clone];
      }
      setDeleteConfirm(null);
      setSelectedItems(new Set());
      addNotification({
        title: 'Moved to Trash',
        body: `"${item.name}" moved to Trash`,
        appId: 'file-manager',
      });
    },
    [currentPath, fs, addNotification]
  );

  // Rename
  const renameFile = useCallback(
    (item: FileNode, newName: string) => {
      if (newName.trim() && newName.trim() !== item.name) {
        item.name = newName.trim();
        item.modified = new Date();
        addNotification({
          title: 'Renamed',
          body: `Renamed to "${newName.trim()}"`,
          appId: 'file-manager',
        });
      }
      setRenameItem(null);
      setRenameValue('');
    },
    [addNotification]
  );

  // Copy
  const copyItem = useCallback(
    (item: FileNode) => {
      setClipboard({ items: [cloneNode(item)], operation: 'copy' });
      addNotification({
        title: 'Copied',
        body: `"${item.name}" copied to clipboard`,
        appId: 'file-manager',
      });
      setContextMenu(null);
    },
    [addNotification]
  );

  // Cut
  const cutItem = useCallback(
    (item: FileNode) => {
      setClipboard({ items: [cloneNode(item)], operation: 'cut' });
      addNotification({
        title: 'Cut',
        body: `"${item.name}" cut to clipboard`,
        appId: 'file-manager',
      });
      setContextMenu(null);
    },
    [addNotification]
  );

  // Paste
  const pasteItem = useCallback(() => {
    if (!clipboard) return;
    for (const item of clipboard.items) {
      if (clipboard.operation === 'cut') {
        // Remove from original location first
        removeNodeAtPath(fs, currentPath, item.name);
      }
      const clone = cloneNode(item);
      createNodeAtPath(fs, currentPath, clone);
    }
    if (clipboard.operation === 'cut') {
      setClipboard(null);
    }
    addNotification({
      title: 'Pasted',
      body: `Pasted ${clipboard.items.length} item(s)`,
      appId: 'file-manager',
    });
    setContextMenu(null);
  }, [clipboard, currentPath, fs, addNotification]);

  // Breadcrumb
  const getBreadcrumbs = useCallback(() => {
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs: { label: string; path: string }[] = [{ label: '', path: '/' }];
    let path = '';
    for (const part of parts) {
      path += '/' + part;
      crumbs.push({ label: part, path });
    }
    return crumbs;
  }, [currentPath]);

  // Sort toggle
  const toggleSort = useCallback(
    (col: 'name' | 'size' | 'date') => {
      if (sortBy === col) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(col);
        setSortDirection('asc');
      }
    },
    [sortBy]
  );

  // Handle context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: FileNode) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, item });
    },
    []
  );

  // Click outside to close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && selectedItems.size === 1) {
        const name = Array.from(selectedItems)[0];
        const item = items.find((i) => i.name === name);
        if (item) {
          setRenameItem(item);
          setRenameValue(item.name);
        }
      }
      if (e.key === 'Delete' && selectedItems.size > 0) {
        const name = Array.from(selectedItems)[0];
        const item = items.find((i) => i.name === name);
        if (item) setDeleteConfirm(item);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, items]);

  const breadcrumbs = getBreadcrumbs();
  const isTrash = currentPath === `${HOME_PATH}/.trash`;

  return (
    <div ref={fileManagerRef} className="flex flex-col h-full" style={{ backgroundColor: '#13131A' }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 shrink-0"
        style={{ height: 40, borderBottom: '1px solid #2A2A3A', backgroundColor: '#13131A' }}
      >
        {/* Nav buttons */}
        <div className="flex items-center gap-1">
          <button
            className="flex items-center justify-center rounded-[6px] transition-colors duration-150 disabled:opacity-30"
            style={{ width: 28, height: 28 }}
            onClick={goBack}
            disabled={navIndex <= 0}
          >
            <ChevronLeft size={16} color="#8A8AA3" />
          </button>
          <button
            className="flex items-center justify-center rounded-[6px] transition-colors duration-150 disabled:opacity-30"
            style={{ width: 28, height: 28 }}
            onClick={goForward}
            disabled={navIndex >= navHistory.length - 1}
          >
            <ChevronRight size={16} color="#8A8AA3" />
          </button>
          <button
            className="flex items-center justify-center rounded-[6px] transition-colors duration-150 disabled:opacity-30"
            style={{ width: 28, height: 28 }}
            onClick={goUp}
            disabled={currentPath === '/'}
          >
            <ArrowUp size={16} color="#8A8AA3" />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center flex-1 min-w-0 overflow-hidden mx-2">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.path} className="flex items-center shrink-0">
              {i > 0 && <ChevronRight size={12} color="#555570" className="mx-1 shrink-0" />}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-[13px] font-medium truncate" style={{ color: '#E8E8F0' }}>
                  {crumb.label || '/'}
                </span>
              ) : (
                <button
                  className="text-[13px] truncate hover:underline transition-colors duration-150"
                  style={{ color: '#8A8AA3' }}
                  onClick={() => navigate(crumb.path)}
                >
                  {crumb.label || '/'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-1 mr-2">
          <Search size={14} color="#555570" className="absolute ml-2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-[12px] rounded-[6px] pl-7 pr-2 py-1 outline-none"
            style={{
              backgroundColor: '#0A0A0F',
              border: '1px solid #2A2A3A',
              color: '#E8E8F0',
              width: 140,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5">
          <button
            className="flex items-center justify-center rounded-[6px] transition-colors duration-150"
            style={{
              width: 28,
              height: 28,
              backgroundColor: viewMode === 'icon' ? '#1C1C26' : 'transparent',
            }}
            onClick={() => setViewMode('icon')}
          >
            <LayoutGrid size={14} color={viewMode === 'icon' ? '#00E5A0' : '#8A8AA3'} />
          </button>
          <button
            className="flex items-center justify-center rounded-[6px] transition-colors duration-150"
            style={{
              width: 28,
              height: 28,
              backgroundColor: viewMode === 'list' ? '#1C1C26' : 'transparent',
            }}
            onClick={() => setViewMode('list')}
          >
            <List size={14} color={viewMode === 'list' ? '#00E5A0' : '#8A8AA3'} />
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="shrink-0 overflow-y-auto"
          style={{
            width: 160,
            backgroundColor: 'rgba(19, 19, 26, 0.4)',
            borderRight: '1px solid #2A2A3A',
            padding: '8px 4px',
          }}
        >
          {sidebarItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            const dir = getNodeAtPath(fs, item.path);
            const count = dir?.type === 'directory' && dir.children ? dir.children.length : 0;
            return (
              <button
                key={item.path}
                className="w-full flex items-center gap-2 rounded-[6px] transition-colors duration-100 text-left"
                style={{
                  height: 32,
                  padding: '0 12px',
                  backgroundColor: isActive ? 'rgba(0, 229, 160, 0.12)' : 'transparent',
                  color: isActive ? '#00E5A0' : '#8A8AA3',
                }}
                onClick={() => navigate(item.path)}
              >
                <Icon size={16} style={{ color: isActive ? '#00E5A0' : '#8A8AA3', minWidth: 16 }} />
                <span className="text-[12px] truncate flex-1" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {item.label}
                </span>
                <span className="text-[11px]" style={{ color: '#555570' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Action bar */}
          <div
            className="flex items-center gap-2 px-3 shrink-0"
            style={{ height: 36, borderBottom: '1px solid #2A2A3A' }}
          >
            <button
              className="flex items-center gap-1.5 rounded-[6px] px-2 py-1 transition-colors duration-150"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#E8E8F0' }}
              onClick={() => {
                setNewFolderActive(true);
                setNewFolderName('New Folder');
              }}
            >
              <Plus size={14} />
              <span className="text-[11px]">New Folder</span>
            </button>
            {clipboard && (
              <button
                className="flex items-center gap-1.5 rounded-[6px] px-2 py-1 transition-colors duration-150"
                style={{ backgroundColor: 'rgba(0, 229, 160, 0.12)', color: '#00E5A0' }}
                onClick={pasteItem}
              >
                <ClipboardPaste size={14} />
                <span className="text-[11px]">Paste</span>
              </button>
            )}
            {isTrash && items.length > 0 && (
              <button
                className="flex items-center gap-1.5 rounded-[6px] px-2 py-1 transition-colors duration-150"
                style={{ backgroundColor: 'rgba(255, 71, 87, 0.12)', color: '#FF4757' }}
                onClick={() => {
                  if (currentDir) {
                    currentDir.children = [];
                    addNotification({
                      title: 'Trash Emptied',
                      body: 'All items permanently deleted',
                      appId: 'file-manager',
                    });
                  }
                }}
              >
                <Trash2 size={14} />
                <span className="text-[11px]">Empty Trash</span>
              </button>
            )}
            <div className="flex-1" />
            <button
              className="flex items-center gap-1 rounded-[6px] px-2 py-1 transition-colors duration-150 text-[11px]"
              style={{ color: '#8A8AA3' }}
              onClick={() => {
                const dirs: 'name' | 'size' | 'date'[] = ['name', 'size', 'date'];
                const next = dirs[(dirs.indexOf(sortBy) + 1) % dirs.length];
                toggleSort(next);
              }}
            >
              <span>Sort: {sortBy}</span>
              <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
            </button>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto" style={{ padding: viewMode === 'icon' ? 16 : 0 }}>
            {items.length === 0 && !newFolderActive ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Folder size={48} color="#2A2A3A" />
                <p style={{ color: '#555570', fontSize: 13 }}>This folder is empty</p>
              </div>
            ) : viewMode === 'icon' ? (
              /* Icon View */
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}
              >
                {sortedItems.map((item) => (
                  <div
                    key={item.name}
                    className="flex flex-col items-center gap-1.5 rounded-[6px] p-2 cursor-pointer transition-all duration-100 relative group"
                    style={{
                      backgroundColor: selectedItems.has(item.name)
                        ? 'rgba(0, 229, 160, 0.12)'
                        : 'transparent',
                      border: selectedItems.has(item.name) ? '1px solid #00E5A0' : '1px solid transparent',
                    }}
                    onClick={(e) => toggleSelect(item.name, e.ctrlKey || e.metaKey)}
                    onDoubleClick={() => openItem(item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    {renameItem === item ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameFile(item, renameValue);
                          if (e.key === 'Escape') setRenameItem(null);
                        }}
                        onBlur={() => renameFile(item, renameValue)}
                        className="text-[11px] text-center w-full rounded px-1 py-0.5 outline-none"
                        style={{
                          backgroundColor: '#0A0A0F',
                          border: '1px solid #00E5A0',
                          color: '#E8E8F0',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        {getFileIcon(item, 48)}
                        <span
                          className="text-[11px] text-center line-clamp-2 break-all leading-tight"
                          style={{ color: '#E8E8F0', maxWidth: '100%' }}
                        >
                          {item.name}
                        </span>
                        <span className="text-[10px]" style={{ color: '#555570' }}>
                          {item.type === 'directory' ? `${getItemCount(item)} items` : formatSize(item.size)}
                        </span>
                      </>
                    )}
                  </div>
                ))}
                {newFolderActive && (
                  <div
                    className="flex flex-col items-center gap-1.5 rounded-[6px] p-2"
                    style={{ border: '1px solid #00E5A0', backgroundColor: 'rgba(0, 229, 160, 0.12)' }}
                  >
                    <Folder size={48} style={{ color: '#4A9EFF' }} />
                    <input
                      autoFocus
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createFolder();
                        if (e.key === 'Escape') setNewFolderActive(false);
                      }}
                      onBlur={createFolder}
                      className="text-[11px] text-center w-full rounded px-1 py-0.5 outline-none"
                      style={{
                        backgroundColor: '#0A0A0F',
                        border: '1px solid #00E5A0',
                        color: '#E8E8F0',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* List View */
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #2A2A3A', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    {[
                      { key: 'name' as const, label: 'Name', flex: 3 },
                      { key: 'size' as const, label: 'Size', flex: 1 },
                      { key: 'type' as const, label: 'Type', flex: 1 },
                      { key: 'date' as const, label: 'Modified', flex: 1.5 },
                      { key: 'perm' as const, label: 'Permissions', flex: 1 },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none"
                        style={{ color: '#555570', flex: col.flex }}
                        onClick={() => col.key !== 'perm' && col.key !== 'type' && toggleSort(col.key)}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortBy === col.key && (
                            <span style={{ color: '#00E5A0' }}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr
                      key={item.name}
                      className="cursor-pointer transition-colors duration-100"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.02)',
                        backgroundColor: selectedItems.has(item.name) ? 'rgba(0, 229, 160, 0.12)' : 'transparent',
                      }}
                      onClick={(e) => toggleSelect(item.name, e.ctrlKey || e.metaKey)}
                      onDoubleClick={() => openItem(item)}
                      onContextMenu={(e) => handleContextMenu(e, item)}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {getFileIcon(item, 16)}
                          {renameItem === item ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') renameFile(item, renameValue);
                                if (e.key === 'Escape') setRenameItem(null);
                              }}
                              onBlur={() => renameFile(item, renameValue)}
                              className="text-[12px] rounded px-1 py-0.5 outline-none"
                              style={{
                                backgroundColor: '#0A0A0F',
                                border: '1px solid #00E5A0',
                                color: '#E8E8F0',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="text-[12px]" style={{ color: '#E8E8F0' }}>
                              {item.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-[11px]" style={{ color: '#8A8AA3' }}>
                        {item.type === 'directory' ? `${getItemCount(item)} items` : formatSize(item.size)}
                      </td>
                      <td className="px-4 py-2 text-[11px]" style={{ color: '#8A8AA3' }}>
                        {getFileType(item)}
                      </td>
                      <td className="px-4 py-2 text-[11px]" style={{ color: '#555570' }}>
                        {formatDate(item.modified)}
                      </td>
                      <td className="px-4 py-2 text-[11px] font-mono" style={{ color: '#555570' }}>
                        {item.permissions}
                      </td>
                    </tr>
                  ))}
                  {newFolderActive && (
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Folder size={16} style={{ color: '#4A9EFF' }} />
                          <input
                            autoFocus
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') createFolder();
                              if (e.key === 'Escape') setNewFolderActive(false);
                            }}
                            onBlur={createFolder}
                            className="text-[12px] rounded px-1 py-0.5 outline-none"
                            style={{
                              backgroundColor: '#0A0A0F',
                              border: '1px solid #00E5A0',
                              color: '#E8E8F0',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </td>
                      <td colSpan={4} />
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Status bar */}
          <div
            className="flex items-center justify-between px-3 shrink-0"
            style={{ height: 28, borderTop: '1px solid #2A2A3A', backgroundColor: '#13131A' }}
          >
            <span className="text-[11px]" style={{ color: '#555570' }}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
              {currentDir && currentDir.type === 'directory' && currentDir.children
                ? `, ${formatSize(getDirectorySize(currentDir))} total`
                : ''}
            </span>
            <span className="text-[11px]" style={{ color: '#555570' }}>
              {selectedItems.size > 0 ? `${selectedItems.size} selected` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed rounded-[6px] overflow-hidden shadow-lg"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: '#13131A',
            border: '1px solid #2A2A3A',
            zIndex: 9999,
            minWidth: 160,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuItem icon={<Folder size={14} />} label="Open" onClick={() => openItem(contextMenu.item)} />
          <div style={{ height: 1, backgroundColor: '#2A2A3A', margin: '4px 0' }} />
          <ContextMenuItem icon={<Scissors size={14} />} label="Cut" onClick={() => cutItem(contextMenu.item)} />
          <ContextMenuItem icon={<Copy size={14} />} label="Copy" onClick={() => copyItem(contextMenu.item)} />
          {clipboard && (
            <ContextMenuItem
              icon={<ClipboardPaste size={14} />}
              label="Paste"
              onClick={pasteItem}
            />
          )}
          <div style={{ height: 1, backgroundColor: '#2A2A3A', margin: '4px 0' }} />
          <ContextMenuItem
            icon={<Pencil size={14} />}
            label="Rename"
            onClick={() => {
              setRenameItem(contextMenu.item);
              setRenameValue(contextMenu.item.name);
              setContextMenu(null);
            }}
          />
          <ContextMenuItem
            icon={<Trash2 size={14} />}
            label={isTrash ? 'Delete Permanently' : 'Move to Trash'}
            danger
            onClick={() => {
              if (isTrash) {
                removeNodeAtPath(fs, currentPath, contextMenu.item.name);
                addNotification({
                  title: 'Deleted',
                  body: `"${contextMenu.item.name}" permanently deleted`,
                  appId: 'file-manager',
                });
              } else {
                setDeleteConfirm(contextMenu.item);
              }
              setContextMenu(null);
            }}
          />
          <div style={{ height: 1, backgroundColor: '#2A2A3A', margin: '4px 0' }} />
          <ContextMenuItem
            icon={<Info size={14} />}
            label="Properties"
            onClick={() => {
              setShowProperties(contextMenu.item);
              setContextMenu(null);
            }}
          />
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="rounded-[12px] p-6"
            style={{
              backgroundColor: '#1C1C26',
              border: '1px solid #2A2A3A',
              width: 360,
            }}
          >
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: '#E8E8F0' }}>
              Move to Trash?
            </h3>
            <p className="text-[13px] mb-6" style={{ color: '#8A8AA3' }}>
              Are you sure you want to move &quot;{deleteConfirm.name}&quot; to Trash?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-[6px] px-4 py-2 text-[13px] transition-colors duration-150"
                style={{ backgroundColor: '#2A2A3A', color: '#E8E8F0' }}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-[6px] px-4 py-2 text-[13px] transition-colors duration-150"
                style={{ backgroundColor: '#FF4757', color: '#fff' }}
                onClick={() => deleteItem(deleteConfirm)}
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Properties Dialog */}
      {showProperties && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="rounded-[12px] overflow-hidden"
            style={{
              backgroundColor: '#1C1C26',
              border: '1px solid #2A2A3A',
              width: 400,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2A2A3A' }}>
              <h3 className="text-[15px] font-semibold" style={{ color: '#E8E8F0' }}>
                Properties
              </h3>
              <button
                className="flex items-center justify-center rounded-[6px] transition-colors duration-150"
                style={{ width: 28, height: 28 }}
                onClick={() => setShowProperties(null)}
              >
                <X size={14} color="#8A8AA3" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                {getFileIcon(showProperties, 48)}
                <div>
                  <p className="text-[14px] font-medium" style={{ color: '#E8E8F0' }}>
                    {showProperties.name}
                  </p>
                  <p className="text-[12px]" style={{ color: '#8A8AA3' }}>
                    {getFileType(showProperties)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <PropRow label="Name" value={showProperties.name} />
                <PropRow label="Type" value={getFileType(showProperties)} />
                <PropRow
                  label="Size"
                  value={
                    showProperties.type === 'directory'
                      ? `${getItemCount(showProperties)} items (${formatSize(getDirectorySize(showProperties))})`
                      : formatSize(showProperties.size)
                  }
                />
                <PropRow label="Location" value={currentPath} />
                <PropRow label="Modified" value={showProperties.modified.toLocaleString()} />
                <PropRow label="Permissions" value={showProperties.permissions} />
                <PropRow label="Owner" value={showProperties.owner} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-4 py-3" style={{ borderTop: '1px solid #2A2A3A' }}>
              <button
                className="rounded-[6px] px-4 py-2 text-[13px] font-medium transition-colors duration-150"
                style={{ backgroundColor: '#00E5A0', color: '#0A0A0F' }}
                onClick={() => setShowProperties(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components

function ContextMenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors duration-100"
      style={{ color: danger ? '#FF4757' : '#E8E8F0' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[12px]" style={{ color: '#8A8AA3' }}>
        {label}
      </span>
      <span className="text-[12px] font-medium max-w-[250px] truncate" style={{ color: '#E8E8F0' }}>
        {value}
      </span>
    </div>
  );
}
