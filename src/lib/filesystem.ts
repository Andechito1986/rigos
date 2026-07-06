export type FileNode = {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileNode[];
  permissions: string;
  owner: string;
  size: number;
  modified: Date;
};

function d(
  name: string,
  permissions: string,
  owner: string,
  modified: string,
  children: FileNode[]
): FileNode {
  return {
    name,
    type: 'directory',
    permissions,
    owner,
    modified: new Date(modified),
    size: 4096,
    children,
  };
}

function f(
  name: string,
  permissions: string,
  owner: string,
  size: number,
  modified: string,
  content?: string
): FileNode {
  return {
    name,
    type: 'file',
    permissions,
    owner,
    size,
    modified: new Date(modified),
    content,
  };
}

// Initial file system data
function createFileSystem(): FileNode {
  return d('/', 'drwxr-xr-x', 'root', '2024-01-01T00:00:00Z', [
    d('bin', 'drwxr-xr-x', 'root', '2024-01-01T00:00:00Z', [
      f('bash', '-rwxr-xr-x', 'root', 1099016, '2024-01-01T00:00:00Z'),
      f('ls', '-rwxr-xr-x', 'root', 138816, '2024-01-01T00:00:00Z'),
      f('cat', '-rwxr-xr-x', 'root', 35000, '2024-01-01T00:00:00Z'),
      f('grep', '-rwxr-xr-x', 'root', 210000, '2024-01-01T00:00:00Z'),
      f('chmod', '-rwxr-xr-x', 'root', 60000, '2024-01-01T00:00:00Z'),
      f('ps', '-rwxr-xr-x', 'root', 88000, '2024-01-01T00:00:00Z'),
      f('top', '-rwxr-xr-x', 'root', 115000, '2024-01-01T00:00:00Z'),
      f('ssh', '-rwxr-xr-x', 'root', 420000, '2024-01-01T00:00:00Z'),
    ]),
    d('etc', 'drwxr-xr-x', 'root', '2024-01-01T00:00:00Z', [
      f('hostname', '-rw-r--r--', 'root', 26, '2024-01-01T00:00:00Z', 'rig-os-mining-station'),
      f('hosts', '-rw-r--r--', 'root', 320, '2024-01-01T00:00:00Z',
        '127.0.0.1 localhost\n127.0.1.1 rig-os-mining-station\n\n# GPU cluster nodes\n192.168.1.100 gpu-node-1\n192.168.1.101 gpu-node-2\n192.168.1.102 gpu-node-3'
      ),
      f('fstab', '-rw-r--r--', 'root', 520, '2024-01-01T00:00:00Z',
        '# /etc/fstab\nUUID=abc123 / ext4 defaults 0 1\nUUID=def456 /home ext4 defaults 0 2\nUUID=ghi789 /mnt/drives ext4 defaults,noatime 0 2\ntmpfs /tmp tmpfs defaults,size=16G 0 0'
      ),
      f('rig-os.config', '-rw-r--r--', 'root', 1048, '2024-06-15T10:30:00Z',
        '# RIG.OS System Configuration\nGPU_CLUSTER_ID=us-east-4\nPOOL_ADDRESS=stratum+tcp://pool.rig.os:3333\nWALLET_ADDRESS=0xRIG7a1f...b3c2d4e5\nMAX_TEMP=85\nPOWER_LIMIT=350\nFAN_SPEED=75\nMINING_MODE=efficiency\nAUTOSTART_MINING=false\nSSH_ENABLED=true\nMONITORING_PORT=9945'
      ),
      f('resolv.conf', '-rw-r--r--', 'root', 78, '2024-01-01T00:00:00Z', 'nameserver 8.8.8.8\nnameserver 1.1.1.1'),
    ]),
    d('home', 'drwxr-xr-x', 'root', '2024-01-01T00:00:00Z', [
      d('rigos', 'drwxr-xr-x', 'rigos', '2024-01-01T00:00:00Z', [
        d('Documents', 'drwxr-xr-x', 'rigos', '2024-01-15T08:00:00Z', [
          f('README.md', '-rw-r--r--', 'rigos', 1240, '2024-01-15T09:30:00Z',
            '# RIG.OS Documents\n\nThis directory contains important documentation for the RIG.OS mining station.\n\n## Contents\n\n- Mining pool configuration\n- GPU maintenance logs\n- Rental agreements\n- System documentation'
          ),
          f('mining-guide.md', '-rw-r--r--', 'rigos', 3580, '2024-03-10T14:22:00Z',
            '# GPU Mining Guide\n\n## Getting Started\n\n1. Configure your wallet in `/etc/rig-os.config`\n2. Start mining with `mine --start`\n3. Monitor GPU stats with `gpustat`\n4. Rent GPUs through the GPU Rental app\n\n## Optimization Tips\n\n- Keep temperatures below 85°C\n- Use efficiency mode for lower power draw\n- Regular maintenance every 30 days'
          ),
          f('wallet.txt', '-rw-------', 'rigos', 128, '2024-02-01T10:00:00Z',
            'RIG Wallet Address: 0xRIG7a1f3b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0\nBalance: 45.2 RIG\nLast payout: 2024-06-14 08:30:00'
          ),
        ]),
        d('Downloads', 'drwxr-xr-x', 'rigos', '2024-02-20T12:00:00Z', [
          f('cuda_12.3.run', '-rwxr-xr-x', 'rigos', 2147483648, '2024-02-20T12:30:00Z', '# CUDA 12.3 Installer'),
          f('nvidia-driver-545.run', '-rwxr-xr-x', 'rigos', 325058560, '2024-02-22T15:00:00Z', '# NVIDIA Driver 545'),
          f('rig-os-update-v2.1.deb', '-rw-r--r--', 'rigos', 52428800, '2024-06-10T09:00:00Z', '# RIG.OS Update Package v2.1'),
        ]),
        d('Pictures', 'drwxr-xr-x', 'rigos', '2024-03-01T00:00:00Z', [
          f('screenshot-desktop.png', '-rw-r--r--', 'rigos', 1258291, '2024-03-05T18:30:00Z'),
          f('gpu-rig-photo.jpg', '-rw-r--r--', 'rigos', 3145728, '2024-03-10T12:00:00Z'),
          f('mining-facility.jpg', '-rw-r--r--', 'rigos', 6291456, '2024-03-15T08:00:00Z'),
        ]),
        d('Projects', 'drwxr-xr-x', 'rigos', '2024-01-20T00:00:00Z', [
          d('gpu-miner', 'drwxr-xr-x', 'rigos', '2024-04-01T00:00:00Z', [
            f('main.py', '-rw-r--r--', 'rigos', 4512, '2024-04-05T10:00:00Z',
              '#!/usr/bin/env python3\n"""GPU Mining Core Module"""\nimport asyncio\nimport json\nfrom gpu_controller import GPUController\n\nasync def main():\n    controller = GPUController()\n    await controller.initialize()\n    await controller.start_mining()\n\nif __name__ == "__main__":\n    asyncio.run(main())'
            ),
            f('config.json', '-rw-r--r--', 'rigos', 512, '2024-04-05T10:30:00Z',
              '{\n  "pool_url": "stratum+tcp://pool.rig.os:3333",\n  "wallet": "0xRIG7a1f...b3c2d4e5",\n  "intensity": 20,\n  "threads": 8\n}'
            ),
            f('requirements.txt', '-rw-r--r--', 'rigos', 89, '2024-04-01T00:00:00Z', 'asyncio\npynvml>=11.0\nnumpy>=1.24\nrequests>=2.28'),
            f('README.md', '-rw-r--r--', 'rigos', 2100, '2024-04-10T14:00:00Z', '# GPU Miner\n\nHigh-performance GPU mining software for RIG.OS.'),
          ]),
          d('rig-os', 'drwxr-xr-x', 'rigos', '2024-01-20T00:00:00Z', [
            f('package.json', '-rw-r--r--', 'rigos', 890, '2024-01-20T00:00:00Z',
              '{\n  "name": "rig-os",\n  "version": "2.0.1",\n  "description": "Operating system for GPU mining stations",\n  "main": "src/main.ts"\n}'
            ),
            f('README.md', '-rw-r--r--', 'rigos', 1840, '2024-01-25T09:00:00Z', '# RIG.OS\n\nWeb-based Linux desktop environment for GPU mining operations.'),
            d('src', 'drwxr-xr-x', 'rigos', '2024-01-20T00:00:00Z', [
              f('main.ts', '-rw-r--r--', 'rigos', 1200, '2024-02-01T10:00:00Z', 'import { Desktop } from "./desktop";\nconst desktop = new Desktop();\ndesktop.boot();'),
              f('desktop.ts', '-rw-r--r--', 'rigos', 3500, '2024-02-05T14:30:00Z', 'export class Desktop { boot() { console.log("RIG.OS booting..."); } }'),
            ]),
          ]),
          d('dashboard-v2', 'drwxr-xr-x', 'rigos', '2024-05-01T00:00:00Z', [
            f('package.json', '-rw-r--r--', 'rigos', 756, '2024-05-01T00:00:00Z', '{ "name": "dashboard-v2", "version": "2.0.0" }'),
            f('App.tsx', '-rw-r--r--', 'rigos', 2400, '2024-05-10T11:00:00Z', 'import React from "react";\nexport default function App() { return <div>Dashboard v2</div>; }'),
            d('components', 'drwxr-xr-x', 'rigos', '2024-05-01T00:00:00Z', [
              f('Chart.tsx', '-rw-r--r--', 'rigos', 1200, '2024-05-15T10:00:00Z', 'export const Chart = () => <div>Chart</div>;'),
            ]),
          ]),
        ]),
        d('Videos', 'drwxr-xr-x', 'rigos', '2024-04-01T00:00:00Z', []),
        d('Music', 'drwxr-xr-x', 'rigos', '2024-04-01T00:00:00Z', []),
        f('.bashrc', '-rw-r--r--', 'rigos', 2100, '2024-01-01T00:00:00Z',
          '# ~/.bashrc\n# RIG.OS User Configuration\n\n# Aliases\nalias ll="ls -la"\nalias la="ls -A"\nalias l="ls -CF"\nalias ..="cd .."\nalias ...="cd ../.."\nalias grep="grep --color=auto"\nalias fgrep="fgrep --color=auto"\nalias egrep="egrep --color=auto"\nalias gpustat="nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,memory.used --format=csv"\nalias mine="rig mine"\nalias wallet="rig wallet"\n\n# Environment\nexport PATH="$HOME/.local/bin:$PATH"\nexport EDITOR=nano\nexport PS1="\\u@\\h:\\w\\$ "\n\n# Colors\nexport LS_COLORS="di=1;34:ln=1;36:so=1;35:pi=1;33:ex=1;32"'
        ),
        f('.bash_history', '-rw-------', 'rigos', 450, '2024-06-15T10:00:00Z',
          'ls -la\ncd Projects\nls\ncd gpu-miner\ncat config.json\ngpustat\ncd ..\nls -la\nneofetch\ncd rig-os\ncat package.json'
        ),
        d('.ssh', 'drwx------', 'rigos', '2024-01-01T00:00:00Z', [
          f('id_rsa', '-rw-------', 'rigos', 2602, '2024-01-01T00:00:00Z', '-----BEGIN OPENSSH PRIVATE KEY-----\n[KEY REDACTED]\n-----END OPENSSH PRIVATE KEY-----'),
          f('id_rsa.pub', '-rw-r--r--', 'rigos', 573, '2024-01-01T00:00:00Z', 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7... rigos@rig-os-mining-station'),
          f('known_hosts', '-rw-r--r--', 'rigos', 890, '2024-03-01T00:00:00Z', 'gpu-node-1 ssh-rsa AAAAB3NzaC...\ngpu-node-2 ssh-rsa AAAAB3NzaC...'),
          f('config', '-rw-r--r--', 'rigos', 320, '2024-01-15T00:00:00Z',
            'Host gpu-cluster\n    HostName 192.168.1.100\n    User rigos\n    IdentityFile ~/.ssh/id_rsa\n    StrictHostKeyChecking no'
          ),
        ]),
        d('.trash', 'drwxr-xr-x', 'rigos', '2024-06-01T00:00:00Z', []),
        d('Desktop', 'drwxr-xr-x', 'rigos', '2024-01-01T00:00:00Z', [
          f('notes.txt', '-rw-r--r--', 'rigos', 256, '2024-06-14T16:30:00Z', 'TODO:\n- Check GPU temps\n- Update mining config\n- Review rental requests'),
        ]),
      ]),
    ]),
    d('mnt', 'drwxr-xr-x', 'root', '2024-01-01T00:00:00Z', [
      d('drives', 'drwxr-xr-x', 'root', '2024-01-01T00:00:00Z', [
        f('external-1', 'lrwxrwxrwx', 'root', 12, '2024-01-01T00:00:00Z', '/dev/sdb1'),
        f('external-2', 'lrwxrwxrwx', 'root', 12, '2024-01-01T00:00:00Z', '/dev/sdc1'),
      ]),
    ]),
    d('opt', 'drwxr-xr-x', 'root', '2024-01-01T00:00:00Z', [
      d('cuda', 'drwxr-xr-x', 'root', '2024-02-20T00:00:00Z', [
        f('version.txt', '-rw-r--r--', 'root', 12, '2024-02-20T00:00:00Z', 'CUDA 12.3'),
      ]),
    ]),
    d('tmp', 'drwxrwxrwt', 'root', '2024-06-15T00:00:00Z', [
      f('session.log', '-rw-r--r--', 'rigos', 128, '2024-06-15T08:00:00Z', 'Session started at 2024-06-15 08:00:00'),
    ]),
    d('usr', 'drwxr-xr-x', 'root', '2024-01-01T00:00:00Z', [
      d('share', 'drwxr-xr-x', 'root', '2024-01-01T00:00:00Z', [
        f('motd', '-rw-r--r--', 'root', 256, '2024-01-01T00:00:00Z',
          'Welcome to RIG.OS 24.04 LTS\nGPU Mining Station Operating System\nType "help" for available commands'
        ),
      ]),
    ]),
    d('var', 'drwxr-xr-x', 'root', '2024-01-01T00:00:00Z', [
      d('log', 'drwxr-xr-x', 'root', '2024-01-01T00:00:00Z', [
        f('system.log', '-rw-r--r--', 'root', 8192, '2024-06-15T10:00:00Z',
          'Jun 15 08:00:01 rig-os-mining-station systemd[1]: Started RIG.OS Kernel.\nJun 15 08:00:05 rig-os-mining-station gpu-daemon[412]: Initialized 8 GPUs\nJun 15 08:00:10 rig-os-mining-station network[430]: Connected to RIG-Main\nJun 15 09:30:00 rig-os-mining-station cron[512]: Running scheduled maintenance\nJun 15 10:00:00 rig-os-mining-station gpu-daemon[412]: GPU temps normal (58-72°C)'
        ),
        f('auth.log', '-rw-r--r--', 'root', 4096, '2024-06-15T10:00:00Z',
          'Jun 15 08:00:02 rig-os-mining-station sshd[380]: Server listening on 0.0.0.0 port 22\nJun 15 08:30:15 rig-os-mining-station sshd[451]: Accepted publickey for rigos from 192.168.1.50 port 54321\nJun 15 09:00:00 rig-os-mining-station sudo: rigos : TTY=pts/0 ; USER=root ; COMMAND=/usr/bin/gpustat'
        ),
        f('mining.log', '-rw-r--r--', 'rigos', 16384, '2024-06-15T10:30:00Z',
          '2024-06-15T08:00:00 [INFO] Mining started - Pool: pool.rig.os:3333\n2024-06-15T08:00:01 [INFO] Connected to pool. Difficulty: 4.29G\n2024-06-15T08:05:30 [INFO] Share accepted. Hashrate: 142.3 TH/s\n2024-06-15T09:15:45 [INFO] Share accepted. Hashrate: 141.8 TH/s\n2024-06-15T10:30:00 [INFO] Normal operation. Avg hashrate: 142.1 TH/s'
        ),
      ]),
    ]),
  ]);
}

// Global mutable file system instance
let fileSystem = createFileSystem();

export function getFileSystem(): FileNode {
  return fileSystem;
}

export function resetFileSystem(): void {
  fileSystem = createFileSystem();
}

// Path resolution
export function resolvePath(cwd: string, path: string): string {
  if (path.startsWith('/')) return normalizePath(path);
  return normalizePath(`${cwd}/${path}`);
}

function normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const result: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      result.pop();
    } else if (part !== '.') {
      result.push(part);
    }
  }
  return '/' + result.join('/');
}

// Get node at path
export function getNodeAtPath(fs: FileNode, path: string): FileNode | null {
  if (path === '/' || path === '') return fs;
  const parts = normalizePath(path).split('/').filter(Boolean);
  let current: FileNode = fs;
  for (const part of parts) {
    if (current.type !== 'directory' || !current.children) return null;
    const found = current.children.find((c) => c.name === part);
    if (!found) return null;
    current = found;
  }
  return current;
}

// Get parent directory of a path
export function getParentPath(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === '/') return '/';
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === 0 ? '/' : normalized.substring(0, lastSlash);
}

// Get basename
export function getBasename(path: string): string {
  const normalized = normalizePath(path);
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] || '/';
}

// Create a node at a path
export function createNodeAtPath(
  fs: FileNode,
  parentPath: string,
  node: FileNode
): boolean {
  const parent = getNodeAtPath(fs, parentPath);
  if (!parent || parent.type !== 'directory') return false;
  if (!parent.children) parent.children = [];
  if (parent.children.find((c) => c.name === node.name)) return false;
  parent.children.push(node);
  parent.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return true;
}

// Remove a node at path
export function removeNodeAtPath(fs: FileNode, parentPath: string, name: string): boolean {
  const parent = getNodeAtPath(fs, parentPath);
  if (!parent || parent.type !== 'directory' || !parent.children) return false;
  const idx = parent.children.findIndex((c) => c.name === name);
  if (idx === -1) return false;
  parent.children.splice(idx, 1);
  return true;
}

// Format size
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

// Format date
export function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${month} ${day} ${hours}:${mins}`;
}

// Permission string helpers
export function permissionStringToMode(perm: string): number {
  let mode = 0;
  for (let i = 1; i < 10; i++) {
    mode <<= 1;
    if (perm[i] !== '-') mode |= 1;
  }
  return mode;
}

export function modeToPermissionString(mode: number): string {
  const chars = ['r', 'w', 'x', 'r', 'w', 'x', 'r', 'w', 'x'];
  let result = '';
  for (let i = 8; i >= 0; i--) {
    result = ((mode >> i) & 1 ? chars[8 - i] : '-') + result;
  }
  return result;
}

// Duplicate a node (for copy)
export function cloneNode(node: FileNode): FileNode {
  return {
    ...node,
    children: node.children?.map(cloneNode),
    modified: new Date(),
  };
}

// Get directory size recursively
export function getDirectorySize(node: FileNode): number {
  if (node.type === 'file') return node.size;
  if (!node.children) return 4096;
  return node.children.reduce((sum, child) => sum + getDirectorySize(child), 4096);
}

// Get total item count in directory
export function getItemCount(node: FileNode): number {
  if (node.type === 'file') return 1;
  if (!node.children) return 0;
  return node.children.length;
}

// File type detection
export function getFileType(node: FileNode): string {
  if (node.type === 'directory') return 'Folder';
  const ext = node.name.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    txt: 'Text Document',
    md: 'Markdown Document',
    py: 'Python Script',
    js: 'JavaScript File',
    ts: 'TypeScript File',
    tsx: 'TSX File',
    json: 'JSON File',
    run: 'Executable',
    sh: 'Shell Script',
    deb: 'Debian Package',
    png: 'PNG Image',
    jpg: 'JPEG Image',
    jpeg: 'JPEG Image',
    conf: 'Configuration File',
    config: 'Configuration File',
    log: 'Log File',
    css: 'CSS File',
  };
  return typeMap[ext] || 'File';
}

// Get file icon color based on type
export function getFileIconColor(node: FileNode): string {
  if (node.type === 'directory') return '#4A9EFF';
  const ext = node.name.split('.').pop()?.toLowerCase() || '';
  if (['sh', 'run', 'deb'].includes(ext)) return '#00E5A0';
  if (['py', 'js', 'ts', 'tsx', 'json'].includes(ext)) return '#FFB020';
  if (['png', 'jpg', 'jpeg'].includes(ext)) return '#A855F7';
  if (['conf', 'config', 'css'].includes(ext)) return '#4A9EFF';
  return '#8A8AA3';
}

// Path display for prompt (home dir tilde)
export function getPromptPath(fullPath: string): string {
  if (fullPath === '/home/rigos') return '~';
  if (fullPath.startsWith('/home/rigos/')) return '~/' + fullPath.substring('/home/rigos/'.length);
  return fullPath;
}

// Tab completion helper
export function getCompletionCandidates(cwd: string, prefix: string): string[] {
  const fs = getFileSystem();
  const dirPath = prefix.includes('/')
    ? prefix.startsWith('/')
      ? getParentPath(prefix)
      : resolvePath(cwd, getParentPath(prefix))
    : cwd;
  const searchPrefix = prefix.includes('/') ? getBasename(prefix) : prefix;
  const dir = getNodeAtPath(fs, dirPath);
  if (!dir || dir.type !== 'directory' || !dir.children) return [];
  return dir.children
    .filter((c) => c.name.startsWith(searchPrefix))
    .map((c) => (c.type === 'directory' ? c.name + '/' : c.name));
}

// Generate calendar display
export function generateCalendar(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  let lines: string[] = [`     ${monthNames[month]} ${year}`, 'Su Mo Tu We Th Fr Sa'];
  let line = '';
  for (let i = 0; i < firstDay; i++) line += '   ';
  for (let d = 1; d <= daysInMonth; d++) {
    if (d === day) {
      line += `\x1b[7m${String(d).padStart(2, '0')}\x1b[0m `;
    } else {
      line += `${String(d).padStart(2, '0')} `;
    }
    if ((firstDay + d - 1) % 7 === 6) {
      lines.push(line.trimEnd());
      line = '';
    }
  }
  if (line) lines.push(line.trimEnd());
  return lines.join('\n');
}

// ANSI color helpers for terminal output
export function color(text: string, colorCode: string): string {
  return `\x1b[${colorCode}m${text}\x1b[0m`;
}

export const ANSI = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m',
};
