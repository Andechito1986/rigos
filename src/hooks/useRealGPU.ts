import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────

export interface GPUStatus {
  index: number;
  name: string;
  temperature: number;
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
  power: number;
  powerLimit: number;
  clockSM: number;
  clockMem: number;
  pstate: string;
  pcieGen: number;
}

export interface SystemStatus {
  cpuUsage: number;
  memoryUsed: number;
  memoryTotal: number;
  diskUsed: number;
  diskTotal: number;
  uptime: number;
  loadAverage: number[];
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime?: number;
}

export interface UseRealGPUReturn {
  gpus: GPUStatus[];
  system: SystemStatus | null;
  services: ServiceStatus[];
  loading: boolean;
  error: string | null;
  isMock: boolean;
}

// ─── API Base ────────────────────────────────────────────────────────

const API_BASE = 'http://172.16.16.70:3001/api';

// ─── Mock Data ───────────────────────────────────────────────────────

export const MOCK_GPUS: GPUStatus[] = [
  { index: 0, name: 'NVIDIA GeForce GTX 1660 SUPER', temperature: 62, utilization: 45, memoryUsed: 2048, memoryTotal: 6144, power: 85, powerLimit: 125, clockSM: 1830, clockMem: 7000, pstate: 'P0', pcieGen: 3 },
  { index: 1, name: 'NVIDIA GeForce GTX 1660 SUPER', temperature: 64, utilization: 38, memoryUsed: 1536, memoryTotal: 6144, power: 78, powerLimit: 125, clockSM: 1815, clockMem: 7000, pstate: 'P0', pcieGen: 3 },
  { index: 2, name: 'NVIDIA GeForce GTX 1660 SUPER', temperature: 68, utilization: 72, memoryUsed: 4096, memoryTotal: 6144, power: 95, powerLimit: 125, clockSM: 1780, clockMem: 7000, pstate: 'P2', pcieGen: 3 },
  { index: 3, name: 'NVIDIA GeForce GTX 1660 SUPER', temperature: 61, utilization: 12, memoryUsed: 512, memoryTotal: 6144, power: 55, powerLimit: 125, clockSM: 1860, clockMem: 7000, pstate: 'P0', pcieGen: 3 },
  { index: 4, name: 'NVIDIA GeForce RTX 3070', temperature: 58, utilization: 82, memoryUsed: 6144, memoryTotal: 8192, power: 185, powerLimit: 220, clockSM: 1950, clockMem: 7000, pstate: 'P0', pcieGen: 4 },
];

const MOCK_SYSTEM: SystemStatus = {
  cpuUsage: 35,
  memoryUsed: 16384,
  memoryTotal: 32768,
  diskUsed: 256000,
  diskTotal: 1000000,
  uptime: 86400 * 7,
  loadAverage: [1.2, 1.5, 1.1],
};

const MOCK_SERVICES: ServiceStatus[] = [
  { name: 'nvidia-smi', status: 'running', uptime: 86400 },
  { name: 'mining', status: 'running', uptime: 43200 },
  { name: 'ssh', status: 'running', uptime: 86400 * 7 },
  { name: 'api-server', status: 'running', uptime: 86400 },
  { name: 'fan-control', status: 'running', uptime: 86400 * 7 },
];

// ─── Mock data with slight variation ─────────────────────────────────

function getVaryingMockGPUs(): GPUStatus[] {
  return MOCK_GPUS.map((gpu) => ({
    ...gpu,
    temperature: Math.max(40, Math.min(85, gpu.temperature + Math.round((Math.random() - 0.5) * 4))),
    utilization: Math.max(0, Math.min(100, gpu.utilization + Math.round((Math.random() - 0.5) * 8))),
    power: Math.max(30, Math.min(gpu.powerLimit, gpu.power + Math.round((Math.random() - 0.5) * 10))),
    memoryUsed: Math.max(0, Math.min(gpu.memoryTotal, gpu.memoryUsed + Math.round((Math.random() - 0.5) * 256))),
  }));
}

// ─── Fetch helper ────────────────────────────────────────────────────

async function fetchJSON<T>(url: string, timeoutMs = 5000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────

export default function useRealGPU(): UseRealGPUReturn {
  const [gpus, setGpus] = useState<GPUStatus[]>(MOCK_GPUS);
  const [system, setSystem] = useState<SystemStatus | null>(MOCK_SYSTEM);
  const [services, setServices] = useState<ServiceStatus[]>(MOCK_SERVICES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(true);

  // Track whether the API is reachable
  const apiReachable = useRef(false);

  // Fetch GPU status
  const fetchGPU = useCallback(async () => {
    try {
      const data = await fetchJSON<{ gpus: GPUStatus[]; mock?: boolean }>(`${API_BASE}/gpu/status`);
      if (data.mock) {
        // API explicitly says it's mock data
        if (!apiReachable.current) {
          setIsMock(true);
          setGpus(getVaryingMockGPUs());
        }
      } else if (data.gpus && data.gpus.length > 0) {
        apiReachable.current = true;
        setIsMock(false);
        setError(null);
        setGpus(data.gpus);
      }
    } catch {
      // API unreachable, use varying mock data
      if (!apiReachable.current) {
        setIsMock(true);
        setGpus(getVaryingMockGPUs());
      }
    }
  }, []);

  // Fetch system status
  const fetchSystem = useCallback(async () => {
    try {
      const data = await fetchJSON<SystemStatus & { mock?: boolean }>(`${API_BASE}/system`);
      if (!data.mock) {
        apiReachable.current = true;
        setSystem(data);
      }
    } catch {
      // Keep existing / mock system data
    }
  }, []);

  // Fetch services
  const fetchServices = useCallback(async () => {
    try {
      const data = await fetchJSON<{ services: ServiceStatus[]; mock?: boolean }>(`${API_BASE}/services`);
      if (!data.mock && data.services) {
        apiReachable.current = true;
        setServices(data.services);
      }
    } catch {
      // Keep existing / mock services data
    }
  }, []);

  // Combined fetch
  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchGPU(), fetchSystem(), fetchServices()]);
    setLoading(false);
  }, [fetchGPU, fetchSystem, fetchServices]);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Polling intervals
  useEffect(() => {
    const gpuInterval = setInterval(fetchGPU, 3000);
    const sysInterval = setInterval(fetchSystem, 10000);
    const svcInterval = setInterval(fetchServices, 30000);
    return () => {
      clearInterval(gpuInterval);
      clearInterval(sysInterval);
      clearInterval(svcInterval);
    };
  }, [fetchGPU, fetchSystem, fetchServices]);

  return { gpus, system, services, loading, error, isMock };
}
