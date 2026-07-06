// SVG App Icons for RIG.OS - inline React components

export function GpuIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="4" y="14" width="40" height="20" rx="3" fill="#1C1C26" stroke="#00E5A0" strokeWidth="1.5" />
      <circle cx="14" cy="24" r="5" fill="#13131A" stroke="#00E5A0" strokeWidth="1" />
      <circle cx="14" cy="24" r="2" fill="#00E5A0" opacity="0.6" />
      <circle cx="34" cy="24" r="5" fill="#13131A" stroke="#00E5A0" strokeWidth="1" />
      <circle cx="34" cy="24" r="2" fill="#00E5A0" opacity="0.6" />
      <rect x="20" y="22" width="8" height="4" rx="1" fill="#2A2A3A" />
      <path d="M8 14V10C8 9 9 8 10 8H14" stroke="#00E5A0" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M40 14V10C40 9 39 8 38 8H34" stroke="#00E5A0" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="6" y="30" width="4" height="3" rx="1" fill="#2A2A3A" />
      <rect x="38" y="30" width="4" height="3" rx="1" fill="#2A2A3A" />
    </svg>
  );
}

export function TerminalIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="6" y="8" width="36" height="32" rx="4" fill="#13131A" stroke="#00E5A0" strokeWidth="1.5" />
      <path d="M12 18L18 24L12 30" stroke="#00E5A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 30H30" stroke="#8A8AA3" strokeWidth="2" strokeLinecap="round" />
      <circle cx="36" cy="14" r="2" fill="#00E5A0" opacity="0.4" />
    </svg>
  );
}

export function FileManagerIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M6 16C6 13.7909 7.79086 12 10 12H20L24 16H38C40.2091 16 42 17.7909 42 20V36C42 38.2091 40.2091 40 38 40H10C7.79086 40 6 38.2091 6 36V16Z" fill="#13131A" stroke="#4A9EFF" strokeWidth="1.5" />
      <path d="M6 20H42" stroke="#4A9EFF" strokeWidth="1" opacity="0.3" />
      <rect x="12" y="26" width="10" height="2" rx="1" fill="#4A9EFF" opacity="0.4" />
      <rect x="12" y="30" width="6" height="2" rx="1" fill="#4A9EFF" opacity="0.3" />
    </svg>
  );
}

export function SettingsIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M24 30C27.3137 30 30 27.3137 30 24C30 20.6863 27.3137 18 24 18C20.6863 18 18 20.6863 18 24C18 27.3137 20.6863 30 24 30Z" fill="#13131A" stroke="#8A8AA3" strokeWidth="2" />
      <path d="M38.4 24H42M6 24H9.6M24 9.6V6M24 42V38.4M35.2 12.8L37.8 10.2M10.2 37.8L12.8 35.2M35.2 35.2L37.8 37.8M10.2 10.2L12.8 12.8" stroke="#8A8AA3" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M33.2 24C33.2 29.08 29.08 33.2 24 33.2C18.92 33.2 14.8 29.08 14.8 24C14.8 18.92 18.92 14.8 24 14.8C29.08 14.8 33.2 18.92 33.2 24Z" stroke="#8A8AA3" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

export function DashboardIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="6" y="6" width="16" height="16" rx="3" fill="#13131A" stroke="#00E5A0" strokeWidth="1.5" />
      <rect x="26" y="6" width="16" height="16" rx="3" fill="#13131A" stroke="#00E5A0" strokeWidth="1.5" />
      <rect x="6" y="26" width="16" height="16" rx="3" fill="#13131A" stroke="#00E5A0" strokeWidth="1.5" />
      <rect x="26" y="26" width="16" height="16" rx="3" fill="#13131A" stroke="#00E5A0" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="2" fill="#00E5A0" opacity="0.6" />
      <rect x="30" y="30" width="8" height="2" rx="1" fill="#00E5A0" opacity="0.4" />
      <rect x="30" y="34" width="5" height="2" rx="1" fill="#00E5A0" opacity="0.3" />
    </svg>
  );
}

export function TrashIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M18 10H30L32 14H42V16H6V14H16L18 10Z" fill="#13131A" stroke="#8A8AA3" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 18H36V38C36 40.2091 34.2091 42 32 42H16C13.7909 42 12 40.2091 12 38V18Z" fill="#13131A" stroke="#8A8AA3" strokeWidth="1.5" />
      <path d="M18 24V34M24 24V34M30 24V34" stroke="#8A8AA3" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function HomeIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M8 20L24 8L40 20V38C40 40.2091 38.2091 42 36 42H12C9.79086 42 8 40.2091 8 38V20Z" fill="#13131A" stroke="#FFB020" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18 42V28H30V42" fill="#1C1C26" stroke="#FFB020" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="24" cy="18" r="2" fill="#FFB020" opacity="0.4" />
    </svg>
  );
}

// Icon resolver that returns the appropriate icon component
import {
  Calculator,
  FileText,
  Globe,
  Activity,
  BookOpen,
  Box,
  type LucideIcon,
} from 'lucide-react';

const svgIconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  GpuIcon,
  TerminalIcon,
  FileManagerIcon,
  SettingsIcon,
  DashboardIcon,
  TrashIcon,
  HomeIcon,
};

const lucideIconMap: Record<string, LucideIcon> = {
  Calculator,
  FileText,
  Globe,
  Activity,
  BookOpen,
  Box,
};

export function renderAppIcon(iconName: string, iconType: 'lucide' | 'svg', size = 24, className = '') {
  if (iconType === 'svg') {
    const IconComponent = svgIconMap[iconName];
    if (IconComponent) {
      return <IconComponent size={size} className={className} />;
    }
  }
  const LucideComponent = lucideIconMap[iconName] || Box;
  return <LucideComponent size={size} className={className} />;
}
