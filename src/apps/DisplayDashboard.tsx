import { useState, useEffect, useRef, useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import useRealGPU from '@/hooks/useRealGPU';
import type { GPUStatus } from '@/hooks/useRealGPU';

// ─── Types ───────────────────────────────────────────────────────────

interface HashPoint {
  time: number;
  value: number;
}

interface GPULogEvent {
  id: string;
  time: number;
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatTimeDisplay(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m`;
}

function getTempColor(temp: number): string {
  if (temp < 65) return '#00E5A0';
  if (temp <= 80) return '#FFB020';
  return '#FF4757';
}

function shortGPUName(name: string): string {
  if (name.includes('RTX 3070')) return '3070';
  if (name.includes('1660 SUPER')) return '1660S';
  if (name.includes('1660')) return '1660';
  return name.replace('NVIDIA GeForce ', '').slice(0, 10);
}

function calcHashrate(gpu: GPUStatus): number {
  // Approximate hashrate based on GPU type and utilization
  const base = gpu.name.includes('RTX 3070') ? 62.5 : 30.0;
  return Math.round(base * (gpu.utilization / 100) * 10) / 10;
}

// ─── Constants ───────────────────────────────────────────────────────

const BG = '#0A0A0F';
const ROW_BG_1 = '#13131A';
const ROW_BG_2 = '#1A1A24';
const TEXT_PRIMARY = '#E8E8F0';
const TEXT_DIM = '#6A6A80';
const BORDER_3070 = '#00E5A0';

// ─── Main Component ──────────────────────────────────────────────────

export default function DisplayDashboard() {
  const { gpus, system, isMock } = useRealGPU();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [flashTemps, setFlashTemps] = useState<Record<number, boolean>>({});
  const prevTemps = useRef<Record<number, number>>({});
  const [hashHistory, setHashHistory] = useState<HashPoint[]>([]);
  const [events, setEvents] = useState<GPULogEvent[]>([]);
  const eventId = useRef(0);

  // Update clock every second
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Track hashrate history
  useEffect(() => {
    if (gpus.length === 0) return;
    const totalHash = gpus.reduce((s, g) => s + calcHashrate(g), 0);
    setHashHistory((prev) => {
      const next = [...prev, { time: Date.now(), value: totalHash }];
      if (next.length > 30) return next.slice(-30);
      return next;
    });
  }, [gpus]);

  // Flash animation on temp changes
  useEffect(() => {
    const newFlash: Record<number, boolean> = {};
    gpus.forEach((gpu) => {
      const prev = prevTemps.current[gpu.index];
      if (prev !== undefined && prev !== gpu.temperature) {
        newFlash[gpu.index] = true;
      }
      prevTemps.current[gpu.index] = gpu.temperature;
    });
    if (Object.keys(newFlash).length > 0) {
      setFlashTemps(newFlash);
      const t = setTimeout(() => setFlashTemps({}), 800);
      return () => clearTimeout(t);
    }
  }, [gpus]);

  // Generate log events from GPU changes
  useEffect(() => {
    if (gpus.length === 0) return;
    const newEvents: GPULogEvent[] = [];
    gpus.forEach((gpu) => {
      if (gpu.temperature > 80) {
        newEvents.push({
          id: `evt-${++eventId.current}`,
          time: Date.now(),
          message: `GPU ${gpu.index} HOT: ${gpu.temperature}°C`,
        });
      }
      if (gpu.utilization > 95) {
        newEvents.push({
          id: `evt-${++eventId.current}`,
          time: Date.now(),
          message: `GPU ${gpu.index} MAX LOAD`,
        });
      }
    });
    if (newEvents.length > 0) {
      setEvents((prev) => [...newEvents, ...prev].slice(0, 20));
    }
  }, [gpus]);

  const stats = useMemo(() => {
    const totalPower = gpus.reduce((s, g) => s + g.power, 0);
    const avgTemp = gpus.length > 0 ? Math.round(gpus.reduce((s, g) => s + g.temperature, 0) / gpus.length) : 0;
    const totalHash = gpus.reduce((s, g) => s + calcHashrate(g), 0);
    return { totalPower, avgTemp, totalHash };
  }, [gpus]);

  // Simulated earnings (slowly incrementing)
  const earnings = useMemo(() => {
    const base = 0.0024;
    const seconds = currentTime.getTime() / 1000;
    return (base + seconds * 0.0000001).toFixed(4);
  }, [currentTime]);

  const connectionColor = isMock ? '#FF4757' : '#00E5A0';
  const uptime = system?.uptime ?? 0;

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{
        background: BG,
        color: TEXT_PRIMARY,
        cursor: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
        overflow: 'hidden',
      }}
    >
      {/* ─── Header ─── */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #1E1E2A',
          background: 'linear-gradient(180deg, rgba(0,229,160,0.04) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[15px] font-bold tracking-wider"
            style={{ color: '#00E5A0' }}
          >
            RIG.OS
          </span>
          <div
            className="rounded-full"
            style={{
              width: 8,
              height: 8,
              background: connectionColor,
              boxShadow: `0 0 6px ${connectionColor}40`,
              animation: isMock ? 'none' : 'pulse 2s infinite',
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px]" style={{ color: TEXT_DIM }}>
            ETH {earnings}
          </span>
          <span className="text-[18px] font-bold" style={{ color: TEXT_PRIMARY }}>
            {formatTimeDisplay(currentTime)}
          </span>
        </div>
      </div>

      {/* ─── GPU Rows ─── */}
      <div className="flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
        {gpus.map((gpu, i) => {
          const is3070 = gpu.name.includes('RTX 3070');
          const rowBg = i % 2 === 0 ? ROW_BG_1 : ROW_BG_2;
          const tempColor = getTempColor(gpu.temperature);
          const isFlashing = flashTemps[gpu.index];
          const hash = calcHashrate(gpu);

          return (
            <div
              key={gpu.index}
              className="flex items-center gap-2 shrink-0"
              style={{
                padding: '6px 10px',
                background: isFlashing ? `${tempColor}15` : rowBg,
                borderLeft: is3070 ? `3px solid ${BORDER_3070}` : '3px solid transparent',
                borderBottom: '1px solid #1A1A22',
                transition: 'background 0.3s ease',
              }}
            >
              {/* GPU Index */}
              <span className="text-[11px] font-bold shrink-0" style={{ color: TEXT_DIM, width: 36 }}>
                GPU{gpu.index}
              </span>

              {/* Short Name */}
              <span
                className="text-[12px] font-semibold shrink-0"
                style={{ color: is3070 ? '#00E5A0' : TEXT_PRIMARY, width: 42 }}
              >
                {shortGPUName(gpu.name)}
              </span>

              {/* Temperature */}
              <span
                className="text-[14px] font-bold shrink-0 tabular-nums"
                style={{
                  color: tempColor,
                  width: 44,
                  textShadow: isFlashing ? `0 0 8px ${tempColor}` : 'none',
                  transition: 'text-shadow 0.3s ease',
                }}
              >
                {gpu.temperature}°
              </span>

              {/* Utilization */}
              <span className="text-[11px] shrink-0 tabular-nums" style={{ color: TEXT_DIM, width: 30 }}>
                {gpu.utilization}%
              </span>

              {/* Utilization Bar */}
              <div className="flex-1 overflow-hidden" style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, gpu.utilization))}%`,
                    background: gpu.utilization > 90 ? '#FF4757' : gpu.utilization > 70 ? '#FFB020' : '#00E5A0',
                    borderRadius: 3,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>

              {/* Power */}
              <span className="text-[11px] shrink-0 tabular-nums" style={{ color: TEXT_DIM, width: 38, textAlign: 'right' }}>
                {gpu.power}W
              </span>

              {/* Hashrate */}
              <span className="text-[11px] font-bold shrink-0 tabular-nums" style={{ color: '#39FF14', width: 44, textAlign: 'right' }}>
                {hash}M
              </span>
            </div>
          );
        })}
      </div>

      {/* ─── Summary Bar ─── */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          padding: '6px 10px',
          background: '#0D0D14',
          borderTop: '1px solid #1E1E2A',
          borderBottom: '1px solid #1E1E2A',
        }}
      >
        <div className="flex items-center gap-1">
          <span className="text-[10px]" style={{ color: TEXT_DIM }}>PWR</span>
          <span className="text-[13px] font-bold tabular-nums" style={{ color: '#FFB020' }}>
            {stats.totalPower}W
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px]" style={{ color: TEXT_DIM }}>AVG</span>
          <span
            className="text-[13px] font-bold tabular-nums"
            style={{ color: getTempColor(stats.avgTemp) }}
          >
            {stats.avgTemp}°C
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px]" style={{ color: TEXT_DIM }}>HASH</span>
          <span className="text-[13px] font-bold tabular-nums" style={{ color: '#00E5A0' }}>
            {stats.totalHash.toFixed(1)}M
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px]" style={{ color: TEXT_DIM }}>UP</span>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: TEXT_PRIMARY }}>
            {formatUptime(uptime)}
          </span>
        </div>
      </div>

      {/* ─── Mini Sparkline ─── */}
      <div className="shrink-0" style={{ height: 60, padding: '4px 8px', background: BG }}>
        {hashHistory.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hashHistory}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5A0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00E5A0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#00E5A0"
                strokeWidth={1.5}
                fill="url(#sparkGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px]" style={{ color: TEXT_DIM }}>Collecting data...</span>
          </div>
        )}
      </div>

      {/* ─── Footer Events ─── */}
      {events.length > 0 && (
        <div
          className="shrink-0 overflow-hidden"
          style={{
            height: 22,
            padding: '2px 10px',
            background: '#0D0D14',
            borderTop: '1px solid #1E1E2A',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-1 rounded" style={{ background: '#FF475720', color: '#FF4757' }}>
              EVT
            </span>
            <span className="text-[10px] truncate" style={{ color: '#FF6B6B' }}>
              {events[0].message}
            </span>
          </div>
        </div>
      )}

      {/* ─── CSS Animations ─── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #00E5A040; }
          50% { opacity: 0.6; box-shadow: 0 0 8px #00E5A080; }
        }
      `}</style>
    </div>
  );
}
