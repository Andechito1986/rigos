import { useState, useRef, useEffect, useCallback } from 'react';
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
  getPromptPath,
  getCompletionCandidates,
  generateCalendar,
  ANSI,
  getDirectorySize,
} from '@/lib/filesystem';
import type { FileNode } from '@/lib/filesystem';

type TerminalMode = 'normal' | 'ssh' | 'cmatrix';

type SSHState = {
  instanceId: string;
  gpuName: string;
  ip: string;
};

type OutputLine = {
  id: number;
  text: string;
  isHtml?: boolean;
};

let outputId = 0;

export default function Terminal() {
  const [history, setHistory] = useState<OutputLine[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [cwd, setCwd] = useState('/home/rigos');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [mode, setMode] = useState<TerminalMode>('normal');
  const [sshState, setSshState] = useState<SSHState | null>(null);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [tabMatches, setTabMatches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const cmatrixRef = useRef<HTMLCanvasElement>(null);
  const cmatrixInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const user = 'rigos';
  const hostname = 'rig-os-mining-station';

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  // Focus input on mount and click
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // CMatrix animation
  useEffect(() => {
    if (mode !== 'cmatrix' || !cmatrixRef.current) return;

    const canvas = cmatrixRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resizeCanvas();

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(){}[]<>;:/|~';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = new Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 10, 20, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00E5A0';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    cmatrixInterval.current = setInterval(draw, 33);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'q') {
        setMode('normal');
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      if (cmatrixInterval.current) clearInterval(cmatrixInterval.current);
      window.removeEventListener('keydown', handleKey);
    };
  }, [mode]);

  const getPrompt = useCallback(() => {
    if (mode === 'ssh' && sshState) {
      return `root@gpu-${sshState.instanceId}:~# `;
    }
    return `${user}@${hostname}:${getPromptPath(cwd)}$ `;
  }, [cwd, mode, sshState]);

  const addOutput = useCallback((text: string) => {
    const lines = text.split('\n').map((line) => ({
      id: outputId++,
      text: line,
    }));
    setHistory((prev) => [...prev, ...lines]);
  }, []);

  const addOutputHtml = useCallback((html: string) => {
    setHistory((prev) => [...prev, { id: outputId++, text: html, isHtml: true }]);
  }, []);

  // Execute command
  const executeCommand = useCallback(
    (input: string) => {
      const prompt = getPrompt();
      const fullCommand = input.trim();

      // Add command to history display
      setHistory((prev) => [...prev, { id: outputId++, text: prompt + fullCommand }]);

      if (fullCommand.length > 0) {
        setCommandHistory((prev) => [...prev, fullCommand]);
        setHistoryIndex(-1);
      }

      const parts = fullCommand.split(/\s+/);
      const cmd = parts[0] || '';
      const args = parts.slice(1);

      const fs = getFileSystem();

      // SSH mode limited commands
      if (mode === 'ssh') {
        switch (cmd) {
          case 'exit':
          case 'logout':
            addOutput('Connection closed.');
            setMode('normal');
            setSshState(null);
            return;
          case 'nvidia-smi':
            addOutput(renderNvidiaSMI());
            return;
          case 'ls':
            addOutput('bin  boot  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var');
            return;
          case 'pwd':
            addOutput('/root');
            return;
          case 'cat':
            if (args[0]) {
              addOutput(`File "${args[0]}" not found in remote instance.`);
            } else {
              addOutput('cat: missing file argument');
            }
            return;
          case 'clear':
            setHistory([]);
            return;
          case 'whoami':
            addOutput('root');
            return;
          case 'uname':
            addOutput('Linux gpu-instance 6.5.0-rig #1 SMP x86_64');
            return;
          default:
            if (cmd) {
              addOutput(`${ANSI.red}bash: ${cmd}: command not found${ANSI.reset}`);
            }
            return;
        }
      }

      // Normal mode commands
      switch (cmd) {
        case '':
          break;

        case 'ls': {
          const showAll = args.includes('-la') || args.includes('-al') || args.includes('-a');
          const longFormat = args.includes('-la') || args.includes('-al') || args.includes('-l');
          const targetPath = args.find((a) => !a.startsWith('-')) || '.';
          const resolved = resolvePath(cwd, targetPath);
          const node = getNodeAtPath(fs, resolved);
          if (!node) {
            addOutput(`${ANSI.red}ls: cannot access '${targetPath}': No such file or directory${ANSI.reset}`);
          } else if (node.type === 'file') {
            if (longFormat) {
              addOutput(
                `${node.permissions} 1 ${node.owner} ${node.owner} ${String(node.size).padStart(6, ' ')} ${formatDate(node.modified)} ${ANSI.blue}${node.name}${ANSI.reset}`
              );
            } else {
              addOutput(node.name);
            }
          } else if (node.children) {
            const items = showAll
              ? [
                  { name: '.', type: 'directory' as const, permissions: 'drwxr-xr-x', owner: node.owner, size: 4096, modified: node.modified },
                  { name: '..', type: 'directory' as const, permissions: 'drwxr-xr-x', owner: node.owner, size: 4096, modified: node.modified },
                  ...node.children,
                ]
              : node.children.filter((c) => !c.name.startsWith('.'));

            if (longFormat) {
              for (const item of items) {
                const color = item.type === 'directory' ? ANSI.blue : item.permissions.includes('x') ? ANSI.green : '';
                addOutput(
                  `${item.permissions} 1 ${item.owner} ${item.owner} ${String(item.size).padStart(8, ' ')} ${formatDate(item.modified)} ${color}${item.name}${ANSI.reset}`
                );
              }
            } else {
              const colored = items.map((item) => {
                if (item.type === 'directory') return `${ANSI.blue}${item.name}${ANSI.reset}`;
                if (item.permissions.includes('x')) return `${ANSI.green}${item.name}${ANSI.reset}`;
                return item.name;
              });
              // Arrange in columns
              if (colored.length > 0) {
                const maxLen = Math.max(...colored.map((c) => c.replace(/\x1b\[\d+m/g, '').length));
                const cols = Math.max(1, Math.floor(60 / (maxLen + 2)));
                let line = '';
                for (let i = 0; i < colored.length; i++) {
                  line += colored[i].padEnd(maxLen + 2);
                  if ((i + 1) % cols === 0 || i === colored.length - 1) {
                    addOutput(line.trimEnd());
                    line = '';
                  }
                }
              }
            }
          }
          break;
        }

        case 'cd': {
          const target = args[0] || '/home/rigos';
          const resolved = resolvePath(cwd, target);
          const node = getNodeAtPath(fs, resolved);
          if (!node) {
            addOutput(`${ANSI.red}bash: cd: ${target}: No such file or directory${ANSI.reset}`);
          } else if (node.type !== 'directory') {
            addOutput(`${ANSI.red}bash: cd: ${target}: Not a directory${ANSI.reset}`);
          } else {
            setCwd(resolved);
          }
          break;
        }

        case 'pwd':
          addOutput(cwd);
          break;

        case 'cat': {
          if (!args[0]) {
            addOutput('cat: missing file argument');
            break;
          }
          const resolved = resolvePath(cwd, args[0]);
          const node = getNodeAtPath(fs, resolved);
          if (!node) {
            addOutput(`${ANSI.red}cat: ${args[0]}: No such file or directory${ANSI.reset}`);
          } else if (node.type === 'directory') {
            addOutput(`${ANSI.red}cat: ${args[0]}: Is a directory${ANSI.reset}`);
          } else {
            const content = node.content || '';
            // Simple syntax highlighting for json files
            if (args[0].endsWith('.json')) {
              const highlighted = content
                .replace(/"(\w+)":/g, `${ANSI.cyan}"$1":${ANSI.reset}`)
                .replace(/: "([^"]*)"/g, `: ${ANSI.green}"$1"${ANSI.reset}`)
                .replace(/: (\d+)/g, `: ${ANSI.yellow}$1${ANSI.reset}`);
              addOutput(highlighted);
            } else {
              addOutput(content);
            }
          }
          break;
        }

        case 'touch': {
          if (!args[0]) {
            addOutput('touch: missing file argument');
            break;
          }
          const resolved = resolvePath(cwd, args[0]);
          const parentPath = getParentPath(resolved);
          const name = getBasename(resolved);
          const parent = getNodeAtPath(fs, parentPath);
          if (!parent || parent.type !== 'directory') {
            addOutput(`${ANSI.red}touch: cannot touch '${args[0]}': No such directory${ANSI.reset}`);
          } else {
            const existing = parent.children?.find((c) => c.name === name);
            if (existing) {
              existing.modified = new Date();
            } else {
              const newFile: FileNode = {
                name,
                type: 'file',
                permissions: '-rw-r--r--',
                owner: user,
                size: 0,
                modified: new Date(),
                content: '',
              };
              parent.children = [...(parent.children || []), newFile];
            }
            addOutput('');
          }
          break;
        }

        case 'mkdir': {
          if (!args[0]) {
            addOutput('mkdir: missing directory name');
            break;
          }
          const resolved = resolvePath(cwd, args[0]);
          const parentPath = getParentPath(resolved);
          const name = getBasename(resolved);
          const parent = getNodeAtPath(fs, parentPath);
          if (!parent || parent.type !== 'directory') {
            addOutput(`${ANSI.red}mkdir: cannot create directory '${args[0]}': No such directory${ANSI.reset}`);
          } else {
            const newDir: FileNode = {
              name,
              type: 'directory',
              permissions: 'drwxr-xr-x',
              owner: user,
              size: 4096,
              modified: new Date(),
              children: [],
            };
            parent.children = [...(parent.children || []), newDir];
            addOutput('');
          }
          break;
        }

        case 'rm': {
          const recursive = args.includes('-r') || args.includes('-rf');
          const target = args.find((a) => !a.startsWith('-'));
          if (!target) {
            addOutput('rm: missing operand');
            break;
          }
          const resolved = resolvePath(cwd, target);
          const parentPath = getParentPath(resolved);
          const name = getBasename(resolved);
          const parent = getNodeAtPath(fs, parentPath);
          const node = getNodeAtPath(fs, resolved);
          if (!node) {
            addOutput(`${ANSI.red}rm: cannot remove '${target}': No such file or directory${ANSI.reset}`);
          } else if (node.type === 'directory' && !recursive) {
            addOutput(`${ANSI.red}rm: cannot remove '${target}': Is a directory${ANSI.reset}`);
          } else {
            removeNodeAtPath(fs, parentPath, name);
            addOutput('');
          }
          break;
        }

        case 'cp': {
          if (args.length < 2) {
            addOutput('cp: missing operand');
            break;
          }
          const [src, dest] = args;
          const srcPath = resolvePath(cwd, src);
          const destPath = resolvePath(cwd, dest);
          const srcNode = getNodeAtPath(fs, srcPath);
          if (!srcNode) {
            addOutput(`${ANSI.red}cp: cannot stat '${src}': No such file or directory${ANSI.reset}`);
            break;
          }
          const destParentPath = getParentPath(destPath);
          const destParent = getNodeAtPath(fs, destParentPath);
          if (!destParent || destParent.type !== 'directory') {
            addOutput(`${ANSI.red}cp: cannot create regular file '${dest}': No such directory${ANSI.reset}`);
            break;
          }
          const clone = cloneNode(srcNode);
          clone.name = getBasename(destPath);
          destParent.children = [...(destParent.children || []), clone];
          addOutput('');
          break;
        }

        case 'mv': {
          if (args.length < 2) {
            addOutput('mv: missing operand');
            break;
          }
          const [src, dest] = args;
          const srcPath = resolvePath(cwd, src);
          const destPath = resolvePath(cwd, dest);
          const srcNode = getNodeAtPath(fs, srcPath);
          if (!srcNode) {
            addOutput(`${ANSI.red}mv: cannot stat '${src}': No such file or directory${ANSI.reset}`);
            break;
          }
          const srcParentPath = getParentPath(srcPath);
          const destParentPath = getParentPath(destPath);
          const destParent = getNodeAtPath(fs, destParentPath);
          if (!destParent || destParent.type !== 'directory') {
            addOutput(`${ANSI.red}mv: cannot move to '${dest}': No such directory${ANSI.reset}`);
            break;
          }
          const clone = cloneNode(srcNode);
          clone.name = getBasename(destPath);
          destParent.children = [...(destParent.children || []), clone];
          removeNodeAtPath(fs, srcParentPath, getBasename(srcPath));
          addOutput('');
          break;
        }

        case 'find': {
          const searchPath = args[0] && !args[0].startsWith('-') ? resolvePath(cwd, args[0]) : cwd;
          const nameFlagIdx = args.indexOf('-name');
          const pattern = nameFlagIdx >= 0 && args[nameFlagIdx + 1] ? args[nameFlagIdx + 1] : null;

          const results: string[] = [];
          const walk = (node: FileNode, path: string) => {
            if (pattern) {
              if (node.name.includes(pattern.replace(/\*/g, '').replace(/\?/g, ''))) {
                results.push(path);
              }
            } else {
              results.push(path);
            }
            if (node.type === 'directory' && node.children) {
              for (const child of node.children) {
                walk(child, path + (path === '/' ? '' : '/') + child.name);
              }
            }
          };

          const startNode = getNodeAtPath(fs, searchPath);
          if (startNode) {
            if (!pattern) results.push(searchPath);
            if (startNode.type === 'directory' && startNode.children) {
              for (const child of startNode.children) {
                walk(child, searchPath + (searchPath === '/' ? '' : '/') + child.name);
              }
            }
          }
          addOutput(results.join('\n') || (pattern ? '' : searchPath));
          break;
        }

        case 'grep': {
          if (args.length < 2) {
            addOutput('grep: usage: grep [pattern] [file]');
            break;
          }
          const pattern = args[0];
          const filePath = resolvePath(cwd, args[1]);
          const node = getNodeAtPath(fs, filePath);
          if (!node) {
            addOutput(`${ANSI.red}grep: ${args[1]}: No such file or directory${ANSI.reset}`);
          } else if (node.type === 'directory') {
            addOutput(`${ANSI.red}grep: ${args[1]}: Is a directory${ANSI.reset}`);
          } else {
            const lines = (node.content || '').split('\n');
            const matches = lines.filter((line) => line.includes(pattern));
            if (matches.length === 0) {
              addOutput('');
            } else {
              addOutput(matches.map((line) => line.replace(new RegExp(pattern, 'g'), `${ANSI.red}${pattern}${ANSI.reset}`)).join('\n'));
            }
          }
          break;
        }

        case 'chmod': {
          if (args.length < 2) {
            addOutput('chmod: missing operand');
            break;
          }
          const mode = args[0];
          const filePath = resolvePath(cwd, args[1]);
          const node = getNodeAtPath(fs, filePath);
          if (!node) {
            addOutput(`${ANSI.red}chmod: cannot access '${args[1]}': No such file or directory${ANSI.reset}`);
          } else {
            // Simplified chmod - just accept the mode
            node.permissions = node.permissions[0] + mode;
            addOutput('');
          }
          break;
        }

        case 'du': {
          const target = args.find((a) => !a.startsWith('-')) || '.';
          const human = args.includes('-sh') || args.includes('-h');
          const resolved = resolvePath(cwd, target);
          const node = getNodeAtPath(fs, resolved);
          if (!node) {
            addOutput(`${ANSI.red}du: cannot access '${target}': No such file or directory${ANSI.reset}`);
          } else {
            const size = getDirectorySize(node);
            addOutput(`${human ? formatSize(size) : size}\t${target}`);
          }
          break;
        }

        case 'df': {
          if (args[0] === '-h' || args.length === 0) {
            addOutput('Filesystem      Size  Used Avail Use% Mounted on');
            addOutput('/dev/nvme0n1p1  1.8T  892G  826G  52% /');
            addOutput('/dev/nvme0n1p2  3.6T  1.2T  2.2T  36% /home');
            addOverlay('Filesystem      Size  Used Avail Use% Mounted on', '/dev/nvme0n1p1  1.8T  892G  826G  52% /', '/dev/nvme0n1p2  3.6T  1.2T  2.2T  36% /home');
          }
          break;
        }

        case 'tree': {
          const target = args[0] || '.';
          const resolved = resolvePath(cwd, target);
          const node = getNodeAtPath(fs, resolved);
          if (!node) {
            addOutput(`${ANSI.red}tree: '${target}': No such file or directory${ANSI.reset}`);
          } else if (node.type !== 'directory') {
            addOutput(node.name);
          } else {
            const lines: string[] = [];
            const buildTree = (n: FileNode, prefix: string, isLast: boolean) => {
              const connector = isLast ? '└── ' : '├── ';
              lines.push(prefix + connector + n.name);
              if (n.type === 'directory' && n.children) {
                const visible = n.children.filter((c) => !c.name.startsWith('.'));
                for (let i = 0; i < visible.length; i++) {
                  const childPrefix = prefix + (isLast ? '    ' : '│   ');
                  buildTree(visible[i], childPrefix, i === visible.length - 1);
                }
              }
            };
            lines.push(node.name);
            if (node.children) {
              const visible = node.children.filter((c) => !c.name.startsWith('.'));
              for (let i = 0; i < visible.length; i++) {
                buildTree(visible[i], '', i === visible.length - 1);
              }
            }
            addOutput(lines.join('\n'));
          }
          break;
        }

        case 'neofetch': {
          const art = [
            `${ANSI.green}      ___  ____  _____ ____   ___ ${ANSI.reset}   ${user}@${hostname}`,
            `${ANSI.green}     |  _ \\|  _ \\| ____/ ___| / ___|${ANSI.reset}   ${'-'.repeat(user.length + hostname.length + 1)}`,
            `${ANSI.green}     | |_) | |_) |  _| \\___ \\| |    ${ANSI.reset}   ${ANSI.cyan}OS:${ANSI.reset} RIG.OS 24.04 LTS`,
            `${ANSI.green}     |  _ <|  __/| |___ ___) | |___ ${ANSI.reset}   ${ANSI.cyan}Kernel:${ANSI.reset} 6.8.0-rig-generic`,
            `${ANSI.green}     |_| \\__\\_|  |_____|____/ \\____|${ANSI.reset}   ${ANSI.cyan}Uptime:${ANSI.reset} 3 days, 7 hours, 22 mins`,
            `                                          ${ANSI.cyan}Shell:${ANSI.reset} bash 5.2.21`,
            `                                          ${ANSI.cyan}Resolution:${ANSI.reset} 2560x1440`,
            `                                          ${ANSI.cyan}DE:${ANSI.reset} RIG-Desktop 2.0`,
            `                                          ${ANSI.cyan}WM:${ANSI.reset} RIG-WM`,
            `                                          ${ANSI.cyan}Theme:${ANSI.reset} Mining-Dark`,
            `                                          ${ANSI.cyan}Icons:${ANSI.reset} RIG-Icons`,
            `                                          ${ANSI.cyan}Terminal:${ANSI.reset} rig-terminal`,
            `                                          ${ANSI.cyan}CPU:${ANSI.reset} AMD Ryzen 9 7950X (16)`,
            `                                          ${ANSI.cyan}GPU:${ANSI.reset} 8x NVIDIA RTX 4090`,
            `                                          ${ANSI.cyan}Memory:${ANSI.reset} 42.1GB / 64GB DDR5`,
            `                                          ${ANSI.cyan}Storage:${ANSI.reset} 892GB / 1.8TB NVMe`,
          ];
          addOutput(art.join('\n'));
          break;
        }

        case 'uname':
          if (args.includes('-a')) {
            addOutput('Linux rig-os-mining-station 6.8.0-rig-generic #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux');
          } else {
            addOutput('Linux');
          }
          break;

        case 'whoami':
          addOutput(user);
          break;

        case 'hostname':
          addOutput(hostname);
          break;

        case 'uptime': {
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, '0');
          const mins = String(now.getMinutes()).padStart(2, '0');
          const secs = String(now.getSeconds()).padStart(2, '0');
          addOutput(`${hours}:${mins}:${secs} up 3 days, 7:22, 1 user, load average: 0.52, 0.48, 0.55`);
          break;
        }

        case 'ps': {
          if (args[0] === 'aux' || args.length === 0) {
            addOutput('USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND');
            const procs = [
              'root         1  0.0  0.0 168364 12104 ?        Ss   Jun12   0:03 /sbin/init',
              'root       412  0.1  0.2 245892 42000 ?        Ssl  Jun12   2:14 /usr/sbin/gpu-daemon',
              'root       430  0.0  0.1  89200 18320 ?        Ss   Jun12   0:08 /usr/sbin/network-manager',
              'root       451  0.0  0.0  18200  8200 ?        Ss   Jun12   0:01 /usr/sbin/sshd -D',
              'rigos      512  0.0  0.0   4500  3100 pts/0    S+   10:30   0:00 bash',
              'rigos      520  2.8  1.2 982340 805200 ?       Sl   Jun12  42:31 /usr/bin/python3 gpu-miner/main.py',
              'rigos      528  0.0  0.3 445200 204000 ?       Sl   Jun12   5:22 /usr/bin/Xorg :0',
              'rigos      600  0.1  0.4 567800 280000 ?       Sl   Jun12   8:15 /usr/local/bin/rig-server',
              'rigos      612  0.0  0.0   4500  3200 pts/1    S+   08:00   0:00 -bash',
              'rigos     2847 12.5  3.8 2.3G  2.4G  ?        Rl   09:15  15:42 /compute/pytorch-training.py',
            ];
            addOutput(procs.join('\n'));
          }
          break;
        }

        case 'top': {
          addOutput('top - 14:32:10 up 3 days, 7:22, 1 user, load average: 0.52, 0.48, 0.55');
          addOutput('Tasks: 142 total, 2 running, 140 sleeping, 0 stopped, 0 zombie');
          addOutput('%Cpu(s): 15.2 us, 3.1 sy, 0.0 ni, 78.5 id, 2.8 wa, 0.0 hi, 0.4 si, 0.0 st');
          addOutput('MiB Mem :  65536.0 total,  18432.0 free,  43008.0 used,   4096.0 buff/cache');
          addOutput('MiB Swap:  32768.0 total,  31744.0 free,   1024.0 used.  22528.0 avail Mem');
          addOutput('');
          addOutput('  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND');
          const topProcs = [
            ' 2847 rigos     20   0 2361080 2458920 42000 R  45.2   3.8  15:42.30 pytorch-train',
            '  520 rigos     20   0  982340 805200 20400 S  12.8   1.2  42:31.15 python3',
            '  412 root      20   0  245892  42000  12100 S   4.1   0.2   2:14.30 gpu-daemon',
            '  600 rigos     20   0  567800 280000  18300 S   2.3   0.4   8:15.45 rig-server',
            '  451 root      20   0   18200   8200   4100 S   0.3   0.0   0:01.20 sshd',
            '    1 root      20   0  168364  12104   8400 S   0.0   0.0   0:03.15 systemd',
            '  430 root      20   0   89200  18320   9200 S   0.0   0.1   0:08.45 NetworkManager',
            '  528 rigos     20   0  445200 204000  28400 S   0.0   0.3   5:22.10 Xorg',
            '  512 rigos     20   0    4500   3100   2400 S   0.0   0.0   0:00.05 bash',
            '  612 rigos     20   0    4500   3200   2400 S   0.0   0.0   0:00.80 bash',
          ];
          addOutput(topProcs.join('\n'));
          break;
        }

        case 'free': {
          if (args[0] === '-h') {
            addOutput('              total        used        free      shared  buff/cache   available');
            addOutput('Mem:           64Gi        42Gi        18Gi       256Mi       4.0Gi        22Gi');
            addOutput('Swap:          32Gi       1.0Gi        31Gi');
          } else {
            addOutput('              total        used        free      shared  buff/cache   available');
            addOutput('Mem:       67108864    44040192    18874368      262144     4194304    23068672');
            addOutput('Swap:      33554432     1048576    32505856');
          }
          break;
        }

        case 'ifconfig':
        case 'ip': {
          if (cmd === 'ip' && !args.includes('a')) {
            addOutput('Usage: ip a');
            break;
          }
          addOutput('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500');
          addOutput('        inet 192.168.1.105  netmask 255.255.255.0  broadcast 192.168.1.255');
          addOutput('        inet6 fe80::a00:27ff:fe4e:66a1  prefixlen 64  scopeid 0x20<link>');
          addOutput('        ether 08:00:27:4e:66:a1  txqueuelen 1000  (Ethernet)');
          addOutput('        RX packets 1849203  bytes 2147483648 (2.0 GiB)');
          addOutput('        TX packets 923401  bytes 536870912 (512.0 MiB)');
          addOutput('');
          addOutput('lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536');
          addOutput('        inet 127.0.0.1  netmask 255.0.0.0');
          addOutput('        inet6 ::1  prefixlen 128  scopeid 0x10<host>');
          addOutput('        loop  txqueuelen 1000  (Local Loopback)');
          break;
        }

        case 'ping': {
          const target = args[0] || 'google.com';
          addOutput(`PING ${target} (142.250.80.46) 56(84) bytes of data.`);
          for (let i = 1; i <= 5; i++) {
            const ms = 12 + Math.random() * 8;
            addOutput(`64 bytes from ${target}: icmp_seq=${i} ttl=117 time=${ms.toFixed(1)} ms`);
          }
          addOutput('');
          addOutput(`--- ${target} ping statistics ---`);
          addOutput('5 packets transmitted, 5 received, 0% packet loss, time 4006ms');
          addOutput(`rtt min/avg/max/mdev = 12.3/16.8/21.4/3.2 ms`);
          break;
        }

        case 'date': {
          addOutput(new Date().toString());
          break;
        }

        case 'cal': {
          addOutput(generateCalendar());
          break;
        }

        case 'history': {
          commandHistory.forEach((cmd, i) => {
            addOutput(`${String(i + 1).padStart(4, ' ')}  ${cmd}`);
          });
          break;
        }

        case 'clear':
          setHistory([]);
          break;

        case 'echo':
          addOutput(args.join(' '));
          break;

        case 'exit':
        case 'logout':
          // Just clear in normal mode since we can't actually close the window
          addOutput('Use the window close button to exit the terminal.');
          break;

        case 'help': {
          addOutput(`${ANSI.green}RIG.OS Terminal - Available Commands${ANSI.reset}`);
          addOutput('');
          addOutput(`${ANSI.cyan}File System:${ANSI.reset}`);
          addOutput('  ls [-la]       List directory contents');
          addOutput('  cd [path]      Change directory');
          addOutput('  pwd            Print working directory');
          addOutput('  cat [file]     Display file contents');
          addOutput('  touch [file]   Create empty file');
          addOutput('  mkdir [dir]    Create directory');
          addOutput('  rm [-rf]       Remove file or directory');
          addOutput('  cp [src] [dst] Copy file/directory');
          addOutput('  mv [src] [dst] Move/rename file or directory');
          addOutput('  find [path] -name [pattern]  Find files');
          addOutput('  grep [pattern] [file]        Search in file');
          addOutput('  chmod [mode] [file]          Change permissions');
          addOutput('  du [-sh] [path]              Disk usage');
          addOutput('  df -h                        Disk free');
          addOutput('  tree                         Directory tree view');
          addOutput('');
          addOutput(`${ANSI.cyan}System Info:${ANSI.reset}`);
          addOutput('  neofetch       System info with ASCII art');
          addOutput('  uname -a       Kernel information');
          addOutput('  whoami         Current user');
          addOutput('  hostname       Machine name');
          addOutput('  uptime         System uptime');
          addOutput('  ps aux         Process list');
          addOutput('  top            System monitor (top 10)');
          addOutput('  free -h        Memory usage');
          addOutput('  ifconfig       Network interfaces');
          addOutput('  ip a           Network interfaces (modern)');
          addOutput('  ping [host]    Ping simulation');
          addOutput('  date           Current date/time');
          addOutput('  cal            Calendar');
          addOutput('  history        Command history');
          addOutput('');
          addOutput(`${ANSI.cyan}RIG.OS Special:${ANSI.reset}`);
          addOutput('  gpustat        GPU status and information');
          addOutput('  mine --start   Start mining simulation');
          addOutput('  mine --stop    Stop mining');
          addOutput('  rent [gpu-id] [hours]  Rent a GPU');
          addOutput('  nvidia-smi     NVIDIA GPU status');
          addOutput('  cmatrix        Matrix rain animation (q to quit)');
          addOutput('  ssh [user@host]  SSH session simulation');
          addOutput('  whois [domain] WHOIS lookup');
          addOutput('  clear          Clear terminal');
          addOutput('  echo [text]    Print text');
          addOutput('  help           Show this help message');
          addOutput('');
          addOutput(`${ANSI.yellow}Use Tab for auto-completion, Up/Down for history${ANSI.reset}`);
          break;
        }

        case 'gpustat': {
          addOutput(`${ANSI.green}╔══════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
          addOutput(`${ANSI.green}║                    GPU STATUS - RIG.OS                           ║${ANSI.reset}`);
          addOutput(`${ANSI.green}╠══════════════════════════════════════════════════════════════════╣${ANSI.reset}`);
          const gpus = [
            { id: 0, name: 'NVIDIA RTX 4090 FE', hash: '145.2 MH/s', temp: 62, power: 312, avail: true },
            { id: 1, name: 'NVIDIA RTX 4090 FE', hash: '143.8 MH/s', temp: 64, power: 325, avail: true },
            { id: 2, name: 'NVIDIA RTX 4090 FE', hash: '142.1 MH/s', temp: 61, power: 298, avail: true },
            { id: 3, name: 'NVIDIA RTX 4090 FE', hash: '144.5 MH/s', temp: 63, power: 340, avail: false },
            { id: 4, name: 'NVIDIA RTX 4080', hash: '118.4 MH/s', temp: 58, power: 285, avail: true },
            { id: 5, name: 'NVIDIA RTX 4080', hash: '120.2 MH/s', temp: 59, power: 290, avail: true },
            { id: 6, name: 'NVIDIA RTX 3090', hash: '92.7 MH/s', temp: 71, power: 310, avail: true },
            { id: 7, name: 'NVIDIA RTX 3090', hash: '90.3 MH/s', temp: 73, power: 320, avail: false },
          ];
          addOutput(`${ANSI.cyan}  GPU  Model              Hash Rate    Temp    Power    Status      ${ANSI.reset}`);
          addOutput(`${ANSI.cyan}  ─────────────────────────────────────────────────────────────────${ANSI.reset}`);
          for (const gpu of gpus) {
            const status = gpu.avail ? `${ANSI.green}● Available${ANSI.reset}` : `${ANSI.amber}○ Rented${ANSI.reset}`;
            const tempColor = gpu.temp > 80 ? ANSI.red : gpu.temp > 70 ? ANSI.yellow : ANSI.green;
            addOutput(
              `  ${String(gpu.id).padStart(2, ' ')}   ${gpu.name.padEnd(20, ' ')} ${gpu.hash.padStart(12, ' ')}  ${tempColor}${String(gpu.temp).padStart(3, ' ')}°C${ANSI.reset}   ${String(gpu.power).padStart(4, ' ')}W   ${status}`
            );
          }
          addOutput(`${ANSI.green}╠══════════════════════════════════════════════════════════════════╣${ANSI.reset}`);
          addOutput(`${ANSI.cyan}  Total Hashrate:${ANSI.reset} 996.2 MH/s  ${ANSI.cyan}Power:${ANSI.reset} 2,480W  ${ANSI.cyan}Avg Temp:${ANSI.reset} 63.9°C`);
          addOutput(`${ANSI.green}╚══════════════════════════════════════════════════════════════════╝${ANSI.reset}`);
          break;
        }

        case 'mine': {
          if (args.includes('--start')) {
            const gpuIdx = args.indexOf('--gpu');
            if (gpuIdx >= 0 && args[gpuIdx + 1]) {
              addOutput(`${ANSI.green}[INFO]${ANSI.reset} Starting mining on GPU ${args[gpuIdx + 1]}...`);
              addOutput(`${ANSI.green}[INFO]${ANSI.reset} Connected to pool.rig.os:3333`);
              addOutput(`${ANSI.green}[INFO]${ANSI.reset} Initializing... Hashrate building up: 45 MH/s`);
              addOutput(`${ANSI.green}[INFO]${ANSI.reset} Hashrate: 89 MH/s...`);
              addOutput(`${ANSI.green}[INFO]${ANSI.reset} Hashrate: 132 MH/s...`);
              addOutput(`${ANSI.green}[INFO]${ANSI.reset} Mining at full speed: 145 MH/s`);
            } else {
              addOutput(`${ANSI.green}[INFO]${ANSI.reset} Starting mining on all available GPUs...`);
              addOutput(`${ANSI.green}[INFO]${ANSI.reset} Connected to pool.rig.os:3333`);
              addOutput(`${ANSI.green}[INFO]${ANSI.reset} Mining started on 6 GPUs - Total: 996.2 MH/s`);
            }
          } else if (args.includes('--stop')) {
            addOutput(`${ANSI.amber}[WARN]${ANSI.reset} Stopping mining...`);
            addOutput(`${ANSI.green}[INFO]${ANSI.reset} Mining stopped. Total shares submitted: 14,892`);
          } else {
            addOutput('Usage: mine --start [--gpu id] | mine --stop');
          }
          break;
        }

        case 'rent': {
          if (args.length < 2) {
            addOutput('Usage: rent [gpu-id] [hours]');
            addOutput('Example: rent 0 24');
            break;
          }
          const gpuId = args[0];
          const hours = args[1];
          addOutput(`${ANSI.green}[INFO]${ANSI.reset} Renting GPU #${gpuId} for ${hours} hours...`);
          addOutput(`${ANSI.green}[INFO]${ANSI.reset} Payment: ${(parseFloat(hours) * 2.4).toFixed(2)} RIG deducted from wallet`);
          addOutput(`${ANSI.green}[INFO]${ANSI.reset} GPU #${gpuId} rental confirmed!`);
          addOutput(`${ANSI.green}[INFO]${ANSI.reset} SSH access: ssh rigos@192.168.1.${100 + parseInt(gpuId)}`);
          break;
        }

        case 'nvidia-smi':
          addOutput(renderNvidiaSMI());
          break;

        case 'cmatrix': {
          setMode('cmatrix');
          break;
        }

        case 'ssh': {
          if (!args[0]) {
            addOutput('Usage: ssh [user@host]');
            break;
          }
          const sshTarget = args[0];
          addOutput(`Connecting to ${sshTarget}...`);
          addOutput('Authenticated.');
          addOutput('');
          const match = sshTarget.match(/rigos@192\.168\.1\.(\d+)/);
          if (match) {
            const gpuId = parseInt(match[1]) - 100;
            setSshState({
              instanceId: String(2847 + gpuId),
              gpuName: 'NVIDIA RTX 4090 FE',
              ip: `192.168.1.${match[1]}`,
            });
          } else {
            setSshState({
              instanceId: '2847',
              gpuName: 'NVIDIA RTX 4090 FE',
              ip: sshTarget.includes('@') ? sshTarget.split('@')[1] : sshTarget,
            });
          }
          setMode('ssh');
          break;
        }

        case 'whois': {
          const domain = args[0] || 'rig.os';
          addOutput(`[Querying whois for ${domain}]`);
          addOutput('');
          addOutput(`Domain Name: ${domain.toUpperCase()}`);
          addOutput(`Registry Domain ID: D123456789-RIG`);
          addOutput(`Registrar WHOIS Server: whois.rig.os`);
          addOutput(`Registrar URL: https://rig.os`);
          addOutput(`Updated Date: 2024-06-01T00:00:00Z`);
          addOutput(`Creation Date: 2024-01-01T00:00:00Z`);
          addOutput(`Registry Expiry Date: 2025-01-01T00:00:00Z`);
          addOutput(`Registrar: RIG Registry`);
          addOutput(`Registrar IANA ID: 1337`);
          addOutput(`Domain Status: clientTransferProhibited`);
          addOutput(`Name Server: NS1.RIG.OS`);
          addOutput(`Name Server: NS2.RIG.OS`);
          addOutput(`DNSSEC: unsigned`);
          break;
        }

        default: {
          if (cmd) {
            addOutput(`${ANSI.red}bash: ${cmd}: command not found${ANSI.reset}`);
            addOutput(`Type 'help' for a list of available commands.`);
          }
          break;
        }
      }
    },
    [cwd, getPrompt, commandHistory, mode, sshState, addOutput]
  );

  // Handle key input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (mode === 'cmatrix') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (currentInput.trim()) {
          executeCommand(currentInput);
          setCurrentInput('');
          setTabMatches([]);
        } else {
          setHistory((prev) => [...prev, { id: outputId++, text: getPrompt() }]);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
        } else {
          setHistoryIndex(-1);
          setCurrentInput('');
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const prefix = currentInput.substring(currentInput.lastIndexOf(' ') + 1);
        const candidates = getCompletionCandidates(cwd, prefix);
        if (candidates.length === 1) {
          const before = currentInput.substring(0, currentInput.lastIndexOf(' ') + 1);
          setCurrentInput(before + candidates[0]);
          setTabMatches([]);
        } else if (candidates.length > 1) {
          if (tabMatches.length > 0) {
            // Cycle
            const currentMatch = prefix.includes('/') ? getBasename(prefix) : prefix;
            const idx = tabMatches.findIndex((m) => m.startsWith(currentMatch) && currentMatch !== m);
            if (idx >= 0) {
              const before = currentInput.substring(0, currentInput.lastIndexOf(' ') + 1);
              const candidate = tabMatches[idx];
              const newPrefix = prefix.includes('/') ? getParentPath(prefix) + '/' + candidate : candidate;
              setCurrentInput(before + newPrefix);
            }
          } else {
            setTabMatches(candidates);
            addOutput(candidates.join('  '));
          }
        }
      } else if (e.key === 'Backspace') {
        setTabMatches([]);
      } else if (e.key === 'c' && e.ctrlKey) {
        e.preventDefault();
        setHistory((prev) => [...prev, { id: outputId++, text: getPrompt() + '^C' }]);
        setCurrentInput('');
      }
    },
    [currentInput, commandHistory, historyIndex, cwd, getPrompt, executeCommand, mode, tabMatches, addOutput]
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentInput(e.target.value);
    setTabMatches([]);
  }, []);

  const handleTerminalClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // Render nvidia-smi
  function renderNvidiaSMI(): string {
    const lines = [
      '+---------------------------------------------------------------------------------------+',
      '| NVIDIA-SMI 545.23.06              Driver Version: 545.23.06    CUDA Version: 12.3     |',
      '|-----------------------------------------+----------------------+----------------------+',
      '| GPU  Name                 Persistence-M | Bus-Id        Disp.A | Volatile Uncorr. ECC |',
      '| Fan  Temp   Perf          Pwr:Usage/Cap |         Memory-Usage | GPU-Util  Compute M. |',
      '|                                         |                      |               MIG M. |',
      '|=========================================+======================+======================|',
      '|   0  NVIDIA GeForce RTX 4090        On  | 00000000:01:00.0 Off |                  Off |',
      '|  0%   62C    P0             312W / 450W |   8234MiB / 24564MiB |     98%      Default |',
      '|                                         |                      |                  N/A |',
      '+-----------------------------------------+----------------------+----------------------+',
      '                                                                                         ',
      '+---------------------------------------------------------------------------------------+',
      '| Processes:                                                                            |',
      '|  GPU   GI   CI        PID   Type   Process name                            GPU Memory |',
      '|        ID   ID                                                             Usage      |',
      '|=======================================================================================|',
      '|    0   N/A  N/A      2847      C   /compute/pytorch-training.py               8192MiB |',
      '+---------------------------------------------------------------------------------------+',
    ];
    return lines.join('\n');
  }

  // Parse ANSI for rendering
  const renderAnsiText = (text: string) => {
    if (!text.includes('\x1b[')) return text;

    const parts = text.split(/(\x1b\[\d+m)/g);
    let currentColor = '';
    const elements: React.ReactNode[] = [];

    parts.forEach((part, i) => {
      if (part.startsWith('\x1b[') && part.endsWith('m')) {
        const code = part.slice(2, -1);
        const colorMap: Record<string, string> = {
          '31': '#FF4757',
          '32': '#00E5A0',
          '33': '#FFB020',
          '34': '#4A9EFF',
          '35': '#A855F7',
          '36': '#4A9EFF',
          '37': '#E8E8F0',
          '90': '#555570',
        };
        currentColor = colorMap[code] || '';
      } else if (part) {
        if (currentColor) {
          elements.push(
            <span key={i} style={{ color: currentColor }}>
              {part}
            </span>
          );
        } else {
          elements.push(<span key={i}>{part}</span>);
        }
      }
    });

    return elements.length > 0 ? elements : text;
  };

  if (mode === 'cmatrix') {
    return (
      <div className="flex flex-col h-full relative" style={{ backgroundColor: '#0C0C14' }}>
        <canvas ref={cmatrixRef} className="absolute inset-0 w-full h-full" />
        <div className="absolute bottom-3 left-0 right-0 text-center text-xs" style={{ color: '#00E5A0', fontFamily: 'monospace' }}>
          Press 'q' to quit
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full select-text"
      style={{
        backgroundColor: '#0C0C14',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 12,
        color: '#E8E8F0',
        padding: '12px 16px',
      }}
      onClick={handleTerminalClick}
    >
      {/* Output Area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto mb-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}
      >
        {history.map((line) => (
          <div key={line.id} className="whitespace-pre-wrap break-all leading-relaxed min-h-[16px]">
            {renderAnsiText(line.text)}
          </div>
        ))}
      </div>

      {/* Input Line */}
      <div className="flex items-center shrink-0">
        <span className="whitespace-pre shrink-0">
          {renderAnsiText(getPrompt())}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none border-none min-w-0"
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 12,
            color: '#E8E8F0',
            caretColor: '#00E5A0',
          }}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
        />
        <span
          className="shrink-0"
          style={{
            width: 8,
            height: 14,
            backgroundColor: cursorVisible ? '#00E5A0' : 'transparent',
            display: 'inline-block',
            marginLeft: 1,
          }}
        />
      </div>
    </div>
  );
}
