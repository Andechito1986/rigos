import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Cpu,
  Zap,
  Plug,
  Thermometer,
  TrendingDown,
  RefreshCw,
  Terminal,
  RotateCcw,
  Wifi,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ComposedChart,
} from 'recharts';
import useRealGPU from '@/hooks/useRealGPU';
import type { GPUStatus } from '@/hooks/useRealGPU';

// ─── Types ───────────────────────────────────────────────────────────

interface Instance {
  id: string;
  gpuName: string;
  instanceId: string;
  location: string;
  hashRate: number;
  temp: number;
  powerDraw: number;
  vramUsed: number;
  vramTotal: number;
  gpuUtil: number;
  status: 'running' | 'restarting' | 'warning' | 'stopped';
  startTime: number;
}

interface ChartPoint {
  time: string;
  hash1: number;
  hash2: number;
  combined: number;
  power: number;
  temp1: number;
  temp2: number;
}

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

function randomWalk(base: number, variance: number): number {
  return Math.max(0, base + (Math.random() - 0.5) * variance * 2);
}

function gpuToInstance(gpu: GPUStatus, index: number): Instance {
  const hashRate = gpu.name.includes('RTX 3070')
    ? Math.round(62.5 * (gpu.utilization / 100) * 10) / 10
    : Math.round(30.0 * (gpu.utilization / 100) * 10) / 10;
  return {
    id: `inst-${gpu.index}`,
    gpuName: gpu.name.replace('NVIDIA GeForce ', ''),
    instanceId: `#${2847 + index}`,
    location: 'RIG-LOCAL',
    hashRate,
    temp: gpu.temperature,
    powerDraw: gpu.power,
    vramUsed: Math.round((gpu.memoryUsed / 1024) * 10) / 10,
    vramTotal: Math.round((gpu.memoryTotal / 1024) * 10) / 10,
    gpuUtil: gpu.utilization,
    status: 'running',
    startTime: Date.now() - 7200000 - index * 600000,
  };
}

function generateInitialChartData(gpus: GPUStatus[]): ChartPoint[] {
  const points: ChartPoint[] = [];
  const now = Date.now();
  const basePower = gpus.reduce((s, g) => s + g.power, 0) * 0.8;
  const baseTemp0 = gpus[0]?.temperature ?? 62;
  const baseTemp1 = gpus[1]?.temperature ?? 64;

  for (let i = 59; i >= 0; i--) {
    const t = now - i * 3000;
    const h1 = randomWalk(30, 5);
    const h2 = randomWalk(50, 8);
    points.push({
      time: formatTime(t),
      hash1: Math.round(h1 * 10) / 10,
      hash2: Math.round(h2 * 10) / 10,
      combined: Math.round((h1 + h2) * 10) / 10,
      power: Math.round(randomWalk(basePower, basePower * 0.1)),
      temp1: Math.round(randomWalk(baseTemp0, 3) * 10) / 10,
      temp2: Math.round(randomWalk(baseTemp1, 3) * 10) / 10,
    });
  }
  return points;
}

// ─── Log generators ──────────────────────────────────────────────────

function generateLogsFromGPUs(gpus: GPUStatus[]): LogEntry[] {
  const logs: LogEntry[] = [];
  gpus.forEach((gpu) => {
    const shortName = gpu.name.replace('NVIDIA GeForce ', '');
    logs.push({
      id: `log-${gpu.index}-${Date.now()}`,
      timestamp: Date.now() - gpu.index * 120000,
      level: 'INFO',
      message: `GPU ${gpu.index} (${shortName}) detected — ${gpu.utilization}% util, ${gpu.temperature}°C`,
    });
  });
  logs.push(
    { id: `log-sys-${Date.now()}`, timestamp: Date.now() - 300000, level: 'INFO', message: `System initialized with ${gpus.length} GPUs` },
    { id: `log-pool-${Date.now()}`, timestamp: Date.now() - 600000, level: 'INFO', message: 'Connected to mining pool: us1.ethermine.org:4444' },
    { id: `log-net-${Date.now()}`, timestamp: Date.now() - 900000, level: 'INFO', message: 'Network latency: 12ms average' },
  );
  return logs;
}

const LOG_TEMPLATES: { level: LogEntry['level']; message: string }[] = [
  { level: 'INFO', message: 'GPU ___ hash rate stable at ___ MH/s' },
  { level: 'INFO', message: 'Auto-backup completed for config' },
  { level: 'WARN', message: 'GPU ___ temp spike: ___°C' },
  { level: 'INFO', message: 'Network latency check: ___ms avg' },
  { level: 'WARN', message: 'Pool difficulty changed to ___T' },
  { level: 'INFO', message: 'GPU utilization optimized for ___' },
  { level: 'INFO', message: 'Memory garbage collection completed' },
  { level: 'DEBUG', message: 'Fan speed adjusted: ___ RPM' },
  { level: 'INFO', message: 'Hash rate benchmark: ___ MH/s' },
];

// ─── Main Component ──────────────────────────────────────────────────

export default function Dashboard() {
  const { gpus, isMock } = useRealGPU();

  const [instances, setInstances] = useState<Instance[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalHash, setTotalHash] = useState(0);
  const [powerDraw, setPowerDraw] = useState(0);
  const [revenue, setRevenue] = useState(142.50);
  const [isLive, setIsLive] = useState(true);
  const [dataInitialized, setDataInitialized] = useState(false);

  // Initialize data from real GPUs
  useEffect(() => {
    if (gpus.length > 0 && !dataInitialized) {
      setInstances(gpus.map((gpu, i) => gpuToInstance(gpu, i)));
      setChartData(generateInitialChartData(gpus));
      setLogs(generateLogsFromGPUs(gpus));
      setDataInitialized(true);
    }
  }, [gpus, dataInitialized]);

  // Update instances when real GPU data changes
  useEffect(() => {
    if (gpus.length > 0) {
      setInstances((prev) =>
        gpus.map((gpu) => {
          const existing = prev.find((p) => p.id === `inst-${gpu.index}`);
          const inst = gpuToInstance(gpu, gpu.index);
          if (existing) {
            return { ...inst, status: existing.status };
          }
          return inst;
        })
      );
      setPowerDraw(gpus.reduce((s, g) => s + g.power, 0));
    }
  }, [gpus]);

  // Simulate live chart data
  useEffect(() => {
    if (!isLive || gpus.length === 0) return;

    const interval2 = setInterval(() => {
      const now = Date.now();
      const hash = gpus.reduce((s, g) => {
        const base = g.name.includes('RTX 3070') ? 62.5 : 30.0;
        return s + base * (g.utilization / 100);
      }, 0);
      setTotalHash(Math.round(hash * 10) / 10);

      setChartData((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const totalP = gpus.reduce((s, g) => s + g.power, 0);
        const newPoint: ChartPoint = {
          time: formatTime(now),
          hash1: Math.round(randomWalk(last.hash1, 5) * 10) / 10,
          hash2: Math.round(randomWalk(last.hash2, 3) * 10) / 10,
          combined: 0,
          power: Math.round(randomWalk(totalP, 30) * 10) / 10,
          temp1: Math.round(randomWalk(gpus[0]?.temperature ?? 62, 2) * 10) / 10,
          temp2: Math.round(randomWalk(gpus[1]?.temperature ?? 64, 2) * 10) / 10,
        };
        newPoint.combined = Math.round((newPoint.hash1 + newPoint.hash2) * 10) / 10;
        return [...prev.slice(1), newPoint];
      });
    }, 3000);

    const interval5 = setInterval(() => {
      setRevenue((prev) => Math.round((prev + Math.random() * 0.05) * 100) / 100);
    }, 5000);

    const interval10 = setInterval(() => {
      const tmpl = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
      let msg = tmpl.message;
      if (msg.includes('___')) {
        const replacements = [
          Math.floor(Math.random() * gpus.length).toString(),
          Math.floor(25 + Math.random() * 40).toFixed(1),
          Math.floor(60 + Math.random() * 20).toString(),
          Math.floor(10 + Math.random() * 20).toString(),
          (40 + Math.random() * 10).toFixed(1),
          Math.floor(3800 + Math.random() * 800).toString(),
        ];
        let ri = 0;
        while (msg.includes('___') && ri < replacements.length) {
          msg = msg.replace('___', replacements[ri++]);
        }
      }
      const newLog: LogEntry = {
        id: `log-${Date.now()}`,
        timestamp: Date.now(),
        level: tmpl.level,
        message: msg,
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 100));
    }, 10000);

    return () => {
      clearInterval(interval2);
      clearInterval(interval5);
      clearInterval(interval10);
    };
  }, [isLive, gpus]);

  const handleRefresh = useCallback(() => {
    if (gpus.length > 0) {
      const hash = gpus.reduce((s, g) => {
        const base = g.name.includes('RTX 3070') ? 62.5 : 30.0;
        return s + base * (g.utilization / 100);
      }, 0);
      setTotalHash(Math.round(hash * 10) / 10);
      setPowerDraw(gpus.reduce((s, g) => s + g.power, 0));
    }
  }, [gpus]);

  const handleRestart = useCallback((instanceId: string) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.instanceId === instanceId ? { ...inst, status: 'restarting' as const } : inst
      )
    );
    setTimeout(() => {
      setInstances((prev) =>
        prev.map((inst) =>
          inst.instanceId === instanceId ? { ...inst, status: 'running' as const, temp: 45 } : inst
        )
      );
      setLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: Date.now(),
          level: 'INFO',
          message: `Instance ${instanceId} restarted successfully`,
        },
        ...prev,
      ]);
    }, 3000);
  }, []);

  const avgTemp = useMemo(() => {
    if (instances.length === 0) return 0;
    return Math.round((instances.reduce((s, i) => s + i.temp, 0) / instances.length) * 10) / 10;
  }, [instances]);

  const activeGPUs = instances.filter((i) => i.status === 'running').length;

  // Connection status
  const connectionStatus = useMemo(() => {
    if (isMock) {
      // Check if API was ever reachable - if not, show disconnected
      return { label: 'MOCK DATA', color: '#FFB020', icon: <AlertTriangle size={12} /> };
    }
    return { label: 'LIVE', color: '#00E5A0', icon: <Wifi size={12} /> };
  }, [isMock]);

  const stats = [
    { label: 'Active GPUs', value: `${activeGPUs} / ${instances.length || gpus.length}`, color: '#00E5A0', icon: <Cpu size={14} />, subtext: 'local rig' },
    { label: 'Total Hashrate', value: `${totalHash.toFixed(1)} MH/s`, color: '#00E5A0', icon: <Zap size={14} />, subtext: 'combined' },
    { label: 'Power Draw', value: `${powerDraw.toLocaleString()}W`, color: '#FFB020', icon: <Plug size={14} />, subtext: 'total' },
    { label: 'Avg Temp', value: `${avgTemp}°C`, color: avgTemp > 70 ? '#FF4757' : '#FFB020', icon: <Thermometer size={14} />, subtext: avgTemp > 70 ? 'elevated' : 'healthy' },
    { label: 'Earnings', value: `$${revenue.toFixed(2)}`, color: '#00E5A0', icon: <TrendingDown size={14} />, subtext: 'this session' },
  ];

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ background: '#13131A', color: '#E8E8F0' }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: '#00E5A0', marginBottom: 16 }} />
        <span className="text-[14px]">Loading GPU data...</span>
        <span className="text-[12px] mt-2" style={{ color: '#555570' }}>Polling 172.16.16.70:3001</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#13131A' }}>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes statusPulseDash {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.5; }
        }
        @keyframes statCardIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes instanceCardIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes logEntryIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ─── Header ─── */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          height: 56,
          padding: '0 24px',
          borderBottom: '1px solid #2A2A3A',
          background: 'linear-gradient(180deg, rgba(0,229,160,0.03) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <h2 className="font-display text-[18px] font-bold" style={{ color: '#E8E8F0' }}>
            Mining Dashboard
          </h2>
          <div className="flex items-center gap-[6px] ml-2">
            <div
              className="rounded-full"
              style={{
                width: 8,
                height: 8,
                background: connectionStatus.color,
                animation: 'livePulse 2s infinite',
              }}
            />
            <span className="text-[11px] font-medium" style={{ color: connectionStatus.color }}>
              {connectionStatus.label}
            </span>
            {isMock && (
              <span className="text-[10px] ml-1" style={{ color: '#555570' }}>
                (API fallback)
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className="text-[12px] font-medium transition-colors duration-150"
            style={{
              height: 28,
              padding: '0 12px',
              borderRadius: 6,
              background: isLive ? 'rgba(0,229,160,0.12)' : 'rgba(255,71,87,0.09)',
              color: isLive ? '#00E5A0' : '#FF4757',
              border: `1px solid ${isLive ? 'rgba(0,229,160,0.2)' : 'rgba(255,71,87,0.2)'}`,
            }}
          >
            {isLive ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center transition-colors duration-150"
            style={{ width: 28, height: 28, borderRadius: 6, color: '#8A8AA3' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#E8E8F0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8A8AA3'; }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ─── Stats Bar ─── */}
      <div className="flex gap-4 shrink-0" style={{ padding: '16px 24px' }}>
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="flex-1"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 8,
              padding: '12px 16px',
              borderLeft: `3px solid ${stat.color}`,
              animation: `statCardIn 300ms ease-out ${i * 80}ms both`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide" style={{ color: '#555570' }}>{stat.label}</span>
              <span style={{ color: stat.color }}>{stat.icon}</span>
            </div>
            <div className="text-[18px] font-bold font-mono-os mt-1" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-[11px] mt-[2px]" style={{ color: '#555570' }}>{stat.subtext}</div>
          </div>
        ))}
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ padding: '0 24px 16px' }}>
        {/* Left: Charts */}
        <div className="flex flex-col gap-4" style={{ width: '60%' }}>
          {/* Hashrate Chart */}
          <div
            className="flex flex-col"
            style={{
              flex: 1.4,
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid #2A2A3A',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold" style={{ color: '#E8E8F0' }}>Hashrate Performance</span>
              <div className="flex items-center gap-1">
                {['1H', '6H', '24H', '7D'].map((r) => (
                  <button
                    key={r}
                    className="text-[11px] font-medium transition-colors duration-150"
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: r === '1H' ? 'rgba(0,229,160,0.12)' : 'transparent',
                      color: r === '1H' ? '#00E5A0' : '#8A8AA3',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="hashGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5A0" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#00E5A0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="hashGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4A9EFF" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#4A9EFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#555570' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#555570' }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip
                    contentStyle={{
                      background: '#1C1C26',
                      border: '1px solid #2A2A3A',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#E8E8F0',
                    }}
                  />
                  <Area type="monotone" dataKey="hash1" name="1660S x4" stroke="#00E5A0" strokeWidth={1.5} fill="url(#hashGrad1)" />
                  <Area type="monotone" dataKey="hash2" name="RTX 3070" stroke="#4A9EFF" strokeWidth={1.5} fill="url(#hashGrad2)" />
                  <Line type="monotone" dataKey="combined" name="Combined" stroke="#A855F7" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Power & Temperature Chart */}
          <div
            className="flex flex-col"
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid #2A2A3A',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <span className="text-[13px] font-semibold mb-2" style={{ color: '#E8E8F0' }}>Power & Temperature</span>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#555570' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#555570' }} axisLine={false} tickLine={false} width={45} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#555570' }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip
                    contentStyle={{
                      background: '#1C1C26',
                      border: '1px solid #2A2A3A',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#E8E8F0',
                    }}
                  />
                  <ReferenceLine yAxisId="right" y={85} stroke="#FF4757" strokeDasharray="4 4" strokeOpacity={0.4} />
                  <ReferenceLine yAxisId="left" y={500} stroke="#FFB020" strokeDasharray="4 4" strokeOpacity={0.4} />
                  <Bar yAxisId="left" dataKey="power" name="Power (W)" fill="#FFB020" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="temp1" name="Temp GPU0" stroke="#FF4757" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="temp2" name="Temp GPU4" stroke="#FF6B35" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Instance Cards + Logs */}
        <div className="flex flex-col gap-3" style={{ width: '40%' }}>
          {/* Instance Cards */}
          <div className="flex flex-col gap-3 overflow-auto" style={{ flex: 1.5 }}>
            {instances.map((inst, i) => (
              <InstanceCard
                key={inst.id}
                instance={inst}
                index={i}
                onRestart={() => handleRestart(inst.instanceId)}
              />
            ))}
          </div>

          {/* Activity Log */}
          <div
            className="flex flex-col overflow-hidden"
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid #2A2A3A',
              borderRadius: 10,
            }}
          >
            <div
              className="flex items-center justify-between shrink-0"
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid #2A2A3A',
              }}
            >
              <span className="text-[13px] font-semibold" style={{ color: '#E8E8F0' }}>Recent Logs</span>
              <span className="text-[11px]" style={{ color: '#555570' }}>{logs.length} entries</span>
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: '0 16px' }}>
              {logs.map((log, i) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2"
                  style={{
                    padding: '5px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    animation: i === 0 ? 'logEntryIn 200ms ease-out' : 'none',
                  }}
                >
                  <span className="text-[11px] font-mono-os shrink-0" style={{ color: '#555570', width: 55 }}>
                    {formatTime(log.timestamp)}
                  </span>
                  <span
                    className="text-[10px] font-semibold shrink-0 px-[4px] py-[1px] rounded"
                    style={{
                      background: `${LOG_LEVEL_COLORS[log.level]}18`,
                      color: LOG_LEVEL_COLORS[log.level],
                      marginTop: 1,
                    }}
                  >
                    {log.level}
                  </span>
                  <span className="text-[11px] font-mono-os" style={{ color: '#8A8AA3' }}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const LOG_LEVEL_COLORS: Record<string, string> = {
  INFO: '#8A8AA3',
  WARN: '#FFB020',
  ERROR: '#FF4757',
  DEBUG: '#555570',
};

// ─── Instance Card ───────────────────────────────────────────────────

function InstanceCard({
  instance,
  index,
  onRestart,
}: {
  instance: Instance;
  index: number;
  onRestart: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const statusColor =
    instance.status === 'running' ? '#00E5A0' :
    instance.status === 'restarting' ? '#4A9EFF' :
    instance.status === 'warning' ? '#FFB020' : '#FF4757';

  const tempColor =
    instance.temp > 80 ? '#FF4757' :
    instance.temp > 70 ? '#FFB020' : '#E8E8F0';

  const is3070 = instance.gpuName.includes('3070');
  const borderColor = is3070 ? '#00E5A0' : (hovered ? '#3D3D55' : '#2A2A3A');

  return (
    <div
      className="flex flex-col overflow-hidden transition-all duration-150"
      style={{
        background: '#13131A',
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        animation: `instanceCardIn 300ms ease-out ${index * 150}ms both`,
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '10px 14px', borderBottom: '1px solid #2A2A3A' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center shrink-0" style={{ width: 10, height: 10 }}>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: statusColor,
                animation: instance.status === 'running' ? 'statusPulseDash 2s infinite' : 'none',
              }}
            />
            <div className="rounded-full" style={{ width: 6, height: 6, background: statusColor }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold truncate" style={{ color: is3070 ? '#00E5A0' : '#E8E8F0' }}>
                {instance.gpuName}
              </span>
              <span className="text-[11px] font-mono-os shrink-0" style={{ color: '#8A8AA3' }}>
                {instance.instanceId}
              </span>
            </div>
            <span className="text-[11px] font-mono-os" style={{ color: '#555570' }}>{instance.location}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {is3070 && (
            <span className="text-[9px] font-bold px-[4px] py-[1px] rounded" style={{ background: 'rgba(0,229,160,0.15)', color: '#00E5A0' }}>
              STAR
            </span>
          )}
          <button
            className="flex items-center justify-center transition-colors duration-150"
            style={{ width: 26, height: 26, borderRadius: 5, color: '#8A8AA3' }}
            title="SSH Connect"
            onClick={() => {}}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#E8E8F0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8A8AA3'; }}
          >
            <Terminal size={12} />
          </button>
          <button
            className="flex items-center justify-center transition-colors duration-150"
            style={{ width: 26, height: 26, borderRadius: 5, color: '#8A8AA3' }}
            title="Restart"
            onClick={onRestart}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#FFB020'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8A8AA3'; }}
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1" style={{ padding: '10px 14px' }}>
        <div>
          <div className="text-[11px]" style={{ color: '#555570' }}>Hashrate</div>
          <div className="text-[14px] font-mono-os font-semibold" style={{ color: '#39FF14' }}>
            {instance.hashRate} MH/s
          </div>
        </div>
        <div>
          <div className="text-[11px]" style={{ color: '#555570' }}>Temperature</div>
          <div className="text-[14px] font-mono-os font-semibold" style={{ color: tempColor }}>
            {instance.temp}°C
          </div>
        </div>
        <div>
          <div className="text-[11px]" style={{ color: '#555570' }}>Power Draw</div>
          <div className="text-[14px] font-mono-os font-semibold" style={{ color: '#E8E8F0' }}>
            {instance.powerDraw}W
          </div>
        </div>
        <div>
          <div className="text-[11px]" style={{ color: '#555570' }}>Memory</div>
          <div className="text-[14px] font-mono-os font-semibold" style={{ color: '#E8E8F0' }}>
            {instance.vramUsed} / {instance.vramTotal} GB
          </div>
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-1" style={{ padding: '0 14px 10px' }}>
        <ProgressBar label="GPU Util" value={instance.gpuUtil} />
        <ProgressBar
          label="VRAM"
          value={Math.round((instance.vramUsed / instance.vramTotal) * 100)}
        />
      </div>
    </div>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono-os shrink-0" style={{ color: '#555570', width: 44 }}>{label}</span>
      <div className="flex-1 overflow-hidden" style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            background: value > 90 ? '#FF4757' : value > 75 ? '#FFB020' : '#00E5A0',
            borderRadius: 2,
          }}
        />
      </div>
      <span className="text-[10px] font-mono-os shrink-0" style={{ color: '#8A8AA3', width: 28, textAlign: 'right' }}>
        {value}%
      </span>
    </div>
  );
}
