import type { AppDefinition } from '@/types/os';
import type { ComponentType } from 'react';

// Lazy load all app components
import GPURental from './GPURental';
import Terminal from './Terminal';
import FileManager from './FileManager';
import Settings from './Settings';
import Dashboard from './Dashboard';
import Placeholder from './Placeholder';

const componentRegistry: Record<string, ComponentType<Record<string, unknown>>> = {
  GPURental,
  Terminal,
  FileManager,
  Settings,
  Dashboard,
  Placeholder,
};

export function getAppComponent(app: AppDefinition): ComponentType<Record<string, unknown>> {
  return componentRegistry[app.component] || Placeholder;
}

export function getAppById(apps: AppDefinition[], appId: string): AppDefinition | undefined {
  return apps.find((a) => a.id === appId);
}
