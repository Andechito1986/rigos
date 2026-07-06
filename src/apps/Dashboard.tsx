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

// ─── Mock Data ───────────────────────────────────────────────────────

const INITIAL_INSTANCES: Instance[] = [
  {
    id: 'inst-1',
    gpuName: 'RTX 4090 FE',
    instanceId: '#2847',
    location: 'US-East-4',
    hashRate: 165,
    temp: 62,
    powerDraw: 450,
    vramUsed: 8.2,
    vramTotal: 24,
    gpuUtil: 78,
    status: 'running',
    startTime: Date.now() - 7200000,
  },
  {
    id: 'inst-2',
    gpuName: 'RTX 3090',
    instanceId: '#2841',
    location: 'US-West-1',
    hashRate: 93,
    temp: 71,
    powerDraw: 348,
    vramUsed: 12.5,
    vramTotal: 24,
    gpuUtil: 85,
    status: 'running',
    startTime: Date.now() - 2700000,
  },
  {
    id: 'inst-3',
    gpuName: 'H100 80GB',
    instanceId: '#2855',
    location: 'US-West-2',
    hashRate: 210,
    temp: 60,
    powerDraw: 680,
    vramUsed: 45.0,
    vramTotal: 80,
    gpuUtil: 92,
    status: 'running',
    startTime: Date.now() - 3600000,
  },
  {
    id: 'inst-4',
    gpuName: 'A100 80GB',
    instanceId: '#2851',
    location: 'US-East-1',
    hashRate: 98,
    temp: 55,
    powerDraw: 395,
    vramUsed: 62.0,
    vramTotal: 80,
    gpuUtil: 88,
    status: 'running',
    startTime: Date.now() - 5400000,
  },
  {
    id: 'inst-5',
    gpuName: 'RTX 4070',
    instanceId: '#2862',
    location: 'EU-West-3',
    hashRate: 85,
    temp: 52,
    powerDraw: 198,
    vramUsed: 6.8,
    vramTotal: 12,
    gpuUtil: 72,
    status: 'running',
    startTime: Date.now() - 1800000,
  },
  {
    id: 'inst-6',
    gpuName: 'RX 7900 XTX',
    instanceId: '#2859',
    location: 'EU-West-3',
    hashRate: 88,
    temp: 65,
    powerDraw: 352,
    vramUsed: 14.2,
    vramTotal: 24,
    gpuUtil: 80,
    status: 'running',
    startTime: Date.now() - 900000,
  },
];

function generateInitialChartData(): ChartPoint[] {
  const points: ChartPoint[] = [];
  const now = Date.now();
  const baseHash1 = 165;
  const baseHash2 = 93;
  const basePower1 = 450;
  const basePower2 = 348;
  const baseTemp1 = 62;
  const baseTemp2 = 71;

  for (let i = 59; i >= 0; i--) {
    const t = now - i * 2000;
    const h1 = randomWalk(baseHash1, baseHash1 * 0.03);
    const h2 = randomWalk(baseHash2, baseHash2 * 0.03);
    points.push({
      time: formatTime(t),
      hash1: Math.round(h1 * 10) / 10,
      hash2: Math.round(h2 * 10) / 10,
      combined: Math.round((h1 + h2) * 10) / 10,
      power: Math.round((randomWalk(basePower1, 20) + randomWalk(basePower2, 15)) * 10) / 10,
      temp1: Math.round(randomWalk(baseTemp1, 3) * 10) / 10,
      temp2: Math.round(randomWalk(baseTemp2, 3) * 10) / 10,
    });
  }
  return points;
}

const INITIAL_LOGS: LogEntry[] = [
  { id: 'log-1', timestamp: Date.now() - 120000, level: 'INFO', message: 'Instance #2847 hash rate stable at 165 MH/s' },
  { id: 'log-2', timestamp: Date.now() - 180000, level: 'INFO', message: 'Instance #2841 memory usage at 34%' },
  { id: 'log-3', timestamp: Date.now() - 240000, level: 'WARN', message: 'Instance #2847 temp spike: 74°C' },
  { id: 'log-4', timestamp: Date.now() - 300000, level: 'INFO', message: 'Auto-backup completed for instance #2841' },
  { id: 'log-5', timestamp: Date.now() - 420000, level: 'INFO', message: 'Rental started: Instance #2847 (RTX 4090 FE)' },
  { id: 'log-6', timestamp: Date.now() - 480000, level: 'INFO', message: 'Payment confirmed: 14.4 RIG deducted' },
  { id: 'log-7', timestamp: Date.now() - 600000, level: 'INFO', message: 'Instance #2841 hash rate adjusted to 93 MH/s' },
  { id: 'log-8', timestamp: Date.now() - 720000, level: 'WARN', message: 'Pool difficulty increased to 47.2T' },
  { id: 'log-9', timestamp: Date.now() - 900000, level: 'INFO', message: 'Instance #2855 (H100) started successfully' },
  { id: 'log-10', timestamp: Date.now() - 960000, level: 'INFO', message: 'Network latency optimized: 12ms avg' },
  { id: 'log-11', timestamp: Date.now() - 1080000, level: 'ERROR', message: 'Instance #2851 thermal throttle detected' },
  { id: 'log-12', timestamp: Date.now() - 1200000, level: 'INFO', message: 'Hash rate optimization: +3.2% efficiency gain' },
  { id: 'log-13', timestamp: Date.now() - 1320000, level: 'WARN', message: 'Power grid fluctuation detected in EU-West-3' },
  { id: 'log-14', timestamp: Date.now() - 1440000, level: 'INFO', message: 'Instance #2862 joined the cluster' },
  { id: 'log-15', timestamp: Date.now() - 1500000, level: 'INFO', message: 'Daily earnings report: $142.50' },
  { id: 'log-16', timestamp: Date.now() - 1620000, level: 'DEBUG', message: 'GPU driver version: 545.23.08' },
  { id: 'log-17', timestamp: Date.now() - 1740000, level: 'INFO', message: 'Cooling system: All fans nominal (4200 RPM)' },
  { id: 'log-18', timestamp: Date.now() - 1800000, level: 'WARN', message: 'Instance #2841 approaching VRAM limit (89%)' },
  { id: 'log-19', timestamp: Date.now() - 1920000, level: 'INFO', message: 'Rental extended: Instance #2847 (+2h)' },
  { id: 'log-20', timestamp: Date.now() - 2100000, level: 'INFO', message: 'System health check: All green' },
];

const LOG_TEMPLATES: { level: LogEntry['level']; message: string }[] = [
  { level: 'INFO', message: 'Instance #2847 hash rate stable at ___ MH/s' },
  { level: 'INFO', message: 'Auto-backup completed for instance #2841' },
  { level: 'WARN', message: 'Instance #2847 temp spike: ___°C' },
  { level: 'INFO', message: 'Network latency check: ___ms avg' },
  { level: 'WARN', message: 'Pool difficulty changed to ___T' },
  { level: 'INFO', message: 'GPU utilization optimized for instance #2855' },
  { level: 'ERROR', message: 'Connection retry: instance #2851 (attempt ___)' },
  { level: 'INFO', message: 'Memory garbage collection completed' },
  { level: 'DEBUG', message: 'Fan speed adjusted: ___ RPM' },
  { level: 'INFO', message: 'Hash rate benchmark: ___ MH/s (target: 165)' },
];

// ─── Main Component ──────────────────────────────────────────────────

export default function Dashboard() {
  const [instances, setInstances] = useState<Instance[]>(INITIAL_INSTANCES);
  const [chartData, setChartData] = useState<ChartPoint[]>(generateInitialChartData);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [totalHash, setTotalHash] = useState(1240);
  const [activeGPUs] = useState(6);
  const [powerDraw, setPowerDraw] = useState(2847);
  const [revenue, setRevenue] = useState(142.50);
  const [isLive, setIsLive] = useState(true);

  // Simulate live data
  useEffect(() => {
    if (!isLive) return;

    // Every 2s: update hash rate, power, chart data
    const interval2 = setInterval(() => {
      const now = Date.now();
      setTotalHash((prev) => {
        const variation = (Math.random() - 0.5) * 0.04 * prev;
        return Math.round((prev + variation) * 10) / 10;
      });
      setPowerDraw((prev) => {
        const variation = (Math.random() - 0.5) * 40;
        return Math.round(prev + variation);
      });
      setRevenue((prev) => Math.round((prev + Math.random() * 0.15) * 100) / 100);

      setChartData((prev) => {
        const last = prev[prev.length - 1];
        const newPoint: ChartPoint = {
          time: formatTime(now),
          hash1: Math.round(randomWalk(last.hash1, 5) * 10) / 10,
          hash2: Math.round(randomWalk(last.hash2, 3) * 10) / 10,
          combined: 0,
          power: Math.round(randomWalk(last.power, 30) * 10) / 10,
          temp1: Math.round(randomWalk(last.temp1, 2) * 10) / 10,
          temp2: Math.round(randomWalk(last.temp2, 2) * 10) / 10,
        };
        newPoint.combined = Math.round((newPoint.hash1 + newPoint.hash2) * 10) / 10;
        const next = [...prev.slice(1), newPoint];
        return next;
      });
    }, 2000);

    // Every 5s: update instance temps
    const interval5 = setInterval(() => {
      setInstances((prev) =>
        prev.map((inst) => ({
          ...inst,
          temp: Math.round(randomWalk(inst.temp, 3)),
          hashRate: Math.round(randomWalk(inst.hashRate, inst.hashRate * 0.02)),
          gpuUtil: Math.min(99, Math.max(50, Math.round(randomWalk(inst.gpuUtil, 5)))),
          vramUsed: Math.round((inst.vramUsed + 0.05) * 10) / 10,
        }))
      );
    }, 5000);

    // Every 10s: add new log
    const interval10 = setInterval(() => {
      const tmpl = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
      let msg = tmpl.message;
      if (msg.includes('___')) {
        const replacements = [
          Math.floor(160 + Math.random() * 20).toString(),
          Math.floor(65 + Math.random() * 15).toString(),
          Math.floor(10 + Math.random() * 20).toString(),
          (40 + Math.random() * 10).toFixed(1),
          Math.floor(3800 + Math.random() * 800).toString(),
          Math.floor(1 + Math.random() * 3).toString(),
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
  }, [isLive]);

  const handleRefresh = useCallback(() => {
    setTotalHash(1240 + (Math.random() - 0.5) * 50);
    setPowerDraw(2847 + Math.floor((Math.random() - 0.5) * 100));
  }, []);

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

  const stats = [
    { label: 'Active GPUs', value: `${activeGPUs} / ${INITIAL_INSTANCES.length}`, color: '#00E5A0', icon: <Cpu size={14} />, subtext: 'of 847 total' },
    { label: 'Total Hashrate', value: `${totalHash.toFixed(0)} MH/s`, color: '#00E5A0', icon: <Zap size={14} />, subtext: 'combined' },
    { label: 'Power Draw', value: `${powerDraw.toLocaleString()}W`, color: '#FFB020', icon: <Plug size={14} />, subtext: 'combined' },
    { label: 'Avg Temp', value: `${avgTemp}°C`, color: avgTemp > 70 ? '#FF4757' : '#FFB020', icon: <Thermometer size={14} />, subtext: avgTemp > 70 ? 'elevated' : 'healthy' },
    { label: 'Earnings', value: `$${revenue.toFixed(2)}`, color: '#00E5A0', icon: <TrendingDown size={14} />, subtext: 'this session' },
  ];

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
                background: isLive ? '#00E5A0' : '#FF4757',
                animation: isLive ? 'livePulse 2s infinite' : 'none',
              }}
            />
            <span className="text-[11px] font-medium" style={{ color: isLive ? '#00E5A0' : '#FF4757' }}>
              {isLive ? 'LIVE' : 'PAUSED'}
            </span>
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
                  <Area type="monotone" dataKey="hash1" name="RTX 4090" stroke="#00E5A0" strokeWidth={1.5} fill="url(#hashGrad1)" />
                  <Area type="monotone" dataKey="hash2" name="RTX 3090" stroke="#4A9EFF" strokeWidth={1.5} fill="url(#hashGrad2)" />
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
                  <Line yAxisId="right" type="monotone" dataKey="temp1" name="Temp RTX 4090" stroke="#FF4757" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="temp2" name="Temp RTX 3090" stroke="#FF6B35" strokeWidth={1.5} dot={false} />
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

  return (
    <div
      className="flex flex-col overflow-hidden transition-all duration-150"
      style={{
        background: '#13131A',
        border: `1px solid ${hovered ? '#3D3D55' : '#2A2A3A'}`,
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
              <span className="text-[13px] font-semibold truncate" style={{ color: '#E8E8F0' }}>
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
