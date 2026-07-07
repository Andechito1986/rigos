import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Cpu,
  Server,
  Wallet,
  X,
  Terminal,
  Square,
  Clock,
  MoreVertical,
  PlusCircle,
  RotateCcw,
  ChevronDown,
  Loader2,
  Zap,
  Minus,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useOSStore } from '@/store/osStore';
import useRealGPU from '@/hooks/useRealGPU';

// ─── Types ───────────────────────────────────────────────────────────

interface GPU {
  id: string;
  name: string;
  brand: string;
  vram: string;
  vramSize: number;
  cudaCores: number;
  baseClock: string;
  memoryType: string;
  hashRate: number;
  powerDraw: number;
  temp: number;
  availability: number;
  pricePerHour: number;
  image: string;
  location: string;
  status: 'available' | 'rented-by-you' | 'rented';
  model: string;
  bus: string;
  description: string;
}

interface Rental {
  id: string;
  gpuId: string;
  gpuName: string;
  gpuImage: string;
  hashRate: number;
  temp: number;
  powerDraw: number;
  location: string;
  startTime: number;
  duration: number;
  totalCost: number;
  status: 'running' | 'expiring-soon' | 'expired';
  instanceId: string;
}

interface Transaction {
  id: string;
  type: 'rental' | 'top-up' | 'refund' | 'extension';
  description: string;
  amount: number;
  date: number;
  gpuName?: string;
}

interface HashHistoryPoint {
  time: string;
  hashRate: number;
}

// ─── Mock Data ───────────────────────────────────────────────────────

// ─── Real Rig GPU Catalog ────────────────────────────────────────────
// Matches: 4x GTX 1660 Super + 1x RTX 3070

const GPUS: GPU[] = [
  {
    id: 'gpu-rtx3070',
    name: 'RTX 3070',
    brand: 'NVIDIA',
    vram: '8GB GDDR6',
    vramSize: 8,
    cudaCores: 5888,
    baseClock: '1.50 GHz',
    memoryType: 'GDDR6',
    hashRate: 62.5,
    powerDraw: 185,
    temp: 58,
    availability: 100,
    pricePerHour: 0.35,
    image: '/gpu-placeholder.jpg',
    location: 'RIG-LOCAL',
    status: 'available',
    model: 'GA104',
    bus: 'PCIe 4.0',
    description: 'The workhorse of the rig. 5888 CUDA cores, Tensor Cores for AI/ML inference. Best price-to-performance for LLM workloads up to 7B parameters.',
  },
  {
    id: 'gpu-1660s-0',
    name: 'GTX 1660 SUPER',
    brand: 'NVIDIA',
    vram: '6GB GDDR6',
    vramSize: 6,
    cudaCores: 1408,
    baseClock: '1.53 GHz',
    memoryType: 'GDDR6',
    hashRate: 30.0,
    powerDraw: 85,
    temp: 62,
    availability: 100,
    pricePerHour: 0.08,
    image: '/gpu-placeholder.jpg',
    location: 'RIG-LOCAL',
    status: 'available',
    model: 'TU116',
    bus: 'PCIe 3.0',
    description: 'Reliable Turing GPU for gaming workloads, lighter inference, and render farm tasks. No Tensor Cores but solid compute for the price.',
  },
  {
    id: 'gpu-1660s-1',
    name: 'GTX 1660 SUPER',
    brand: 'NVIDIA',
    vram: '6GB GDDR6',
    vramSize: 6,
    cudaCores: 1408,
    baseClock: '1.53 GHz',
    memoryType: 'GDDR6',
    hashRate: 30.0,
    powerDraw: 78,
    temp: 64,
    availability: 100,
    pricePerHour: 0.08,
    image: '/gpu-placeholder.jpg',
    location: 'RIG-LOCAL',
    status: 'available',
    model: 'TU116',
    bus: 'PCIe 3.0',
    description: 'Reliable Turing GPU for gaming workloads, lighter inference, and render farm tasks. No Tensor Cores but solid compute for the price.',
  },
  {
    id: 'gpu-1660s-2',
    name: 'GTX 1660 SUPER',
    brand: 'NVIDIA',
    vram: '6GB GDDR6',
    vramSize: 6,
    cudaCores: 1408,
    baseClock: '1.53 GHz',
    memoryType: 'GDDR6',
    hashRate: 30.0,
    powerDraw: 95,
    temp: 68,
    availability: 100,
    pricePerHour: 0.08,
    image: '/gpu-placeholder.jpg',
    location: 'RIG-LOCAL',
    status: 'available',
    model: 'TU116',
    bus: 'PCIe 3.0',
    description: 'Reliable Turing GPU for gaming workloads, lighter inference, and render farm tasks. No Tensor Cores but solid compute for the price.',
  },
  {
    id: 'gpu-1660s-3',
    name: 'GTX 1660 SUPER',
    brand: 'NVIDIA',
    vram: '6GB GDDR6',
    vramSize: 6,
    cudaCores: 1408,
    baseClock: '1.53 GHz',
    memoryType: 'GDDR6',
    hashRate: 30.0,
    powerDraw: 55,
    temp: 61,
    availability: 100,
    pricePerHour: 0.08,
    image: '/gpu-placeholder.jpg',
    location: 'RIG-LOCAL',
    status: 'available',
    model: 'TU116',
    bus: 'PCIe 3.0',
    description: 'Reliable Turing GPU for gaming workloads, lighter inference, and render farm tasks. No Tensor Cores but solid compute for the price.',
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', type: 'top-up', description: 'Credit purchase', amount: 50.0, date: new Date('2025-01-15T09:15:00').getTime() },
  { id: 'tx-2', type: 'rental', description: 'RTX 3070 #2847 (6h)', amount: -2.1, date: new Date('2025-01-15T10:30:00').getTime(), gpuName: 'RTX 3070' },
  { id: 'tx-3', type: 'rental', description: '1660 SUPER #2841 (12h)', amount: -0.96, date: new Date('2025-01-15T10:45:00').getTime(), gpuName: 'GTX 1660 SUPER' },
  { id: 'tx-4', type: 'top-up', description: 'Credit purchase', amount: 100.0, date: new Date('2025-01-14T15:22:00').getTime() },
  { id: 'tx-5', type: 'rental', description: 'RTX 3070 #2839 (3h)', amount: -1.05, date: new Date('2025-01-14T11:00:00').getTime(), gpuName: 'RTX 3070' },
  { id: 'tx-6', type: 'refund', description: 'Early termination #2835', amount: 0.7, date: new Date('2025-01-13T20:45:00').getTime() },
  { id: 'tx-7', type: 'extension', description: 'Extend RTX 3070 #2847 (+2h)', amount: -0.7, date: new Date('2025-01-15T14:20:00').getTime(), gpuName: 'RTX 3070' },
];

const INITIAL_RENTALS: Rental[] = [
  {
    id: 'rent-1',
    gpuId: 'gpu-rtx3070',
    gpuName: 'RTX 3070',
    gpuImage: '/gpu-placeholder.jpg',
    hashRate: 62.5,
    temp: 58,
    powerDraw: 185,
    location: 'RIG-LOCAL',
    startTime: Date.now() - 2 * 3600 * 1000,
    duration: 6,
    totalCost: 2.1,
    status: 'running',
    instanceId: '#2847',
  },
  {
    id: 'rent-2',
    gpuId: 'gpu-1660s-0',
    gpuName: 'GTX 1660 SUPER',
    gpuImage: '/gpu-placeholder.jpg',
    hashRate: 30.0,
    temp: 62,
    powerDraw: 85,
    location: 'RIG-LOCAL',
    startTime: Date.now() - 45 * 60 * 1000,
    duration: 12,
    totalCost: 0.96,
    status: 'running',
    instanceId: '#2841',
  },
];

function generateHashHistory(baseHash: number): HashHistoryPoint[] {
  const points: HashHistoryPoint[] = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3600 * 1000);
    const variation = (Math.random() - 0.5) * 0.06 * baseHash;
    points.push({
      time: `${t.getHours().toString().padStart(2, '0')}:00`,
      hashRate: Math.round((baseHash + variation) * 10) / 10,
    });
  }
  return points;
}

function formatRig(val: number): string {
  return `${val.toFixed(1)} RIG`;
}

function formatUsd(rig: number): string {
  return `$${(rig * 0.5).toFixed(2)}`;
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// ─── Main Component ──────────────────────────────────────────────────

export default function GPURental() {
  const [activeTab, setActiveTab] = useState<'browse' | 'my-rentals' | 'wallet'>('browse');
  const [selectedGPU, setSelectedGPU] = useState<GPU | null>(null);
  const [rentalDuration, setRentalDuration] = useState<number>(24);
  const [walletBalance, setWalletBalance] = useState<number>(45.2);
  const [myRentals, setMyRentals] = useState<Rental[]>(INITIAL_RENTALS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAvailability, setFilterAvailability] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'performance' | 'availability'>('price');
  const [showFilters, setShowFilters] = useState(false);
  const [isRenting, setIsRenting] = useState(false);
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [timeLeftMap, setTimeLeftMap] = useState<Record<string, number>>({});
  const [txFilter, setTxFilter] = useState<string>('all');

  const addNotification = useOSStore((s) => s.addNotification);
  const { gpus: realGPUs } = useRealGPU();

  // Live countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newMap: Record<string, number> = {};
      myRentals.forEach((r) => {
        const elapsed = now - r.startTime;
        const total = r.duration * 3600 * 1000;
        newMap[r.id] = Math.max(0, total - elapsed);
      });
      setTimeLeftMap(newMap);
    }, 1000);
    return () => clearInterval(interval);
  }, [myRentals]);

  // Filtered + sorted GPUs
  const filteredGPUs = useMemo(() => {
    let list = [...GPUS];

    if (filterCategory !== 'all') {
      if (filterCategory === 'RTX 3070') list = list.filter((g) => g.name.includes('RTX 3070'));
      else if (filterCategory === '1660 SUPER') list = list.filter((g) => g.name.includes('1660 SUPER'));
    }

    if (filterAvailability) {
      list = list.filter((g) => g.availability > 50);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.brand.toLowerCase().includes(q) ||
          g.location.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price') list.sort((a, b) => a.pricePerHour - b.pricePerHour);
    else if (sortBy === 'performance') list.sort((a, b) => b.hashRate - a.hashRate);
    else if (sortBy === 'availability') list.sort((a, b) => b.availability - a.availability);

    return list;
  }, [filterCategory, filterAvailability, searchQuery, sortBy]);

  const handleRentGPU = useCallback(
    (gpu: GPU) => {
      setSelectedGPU(gpu);
      setRentalDuration(24);
      setInsufficientBalance(false);
    },
    []
  );

  const confirmRental = useCallback(() => {
    if (!selectedGPU) return;
    const totalCost = selectedGPU.pricePerHour * rentalDuration;
    if (totalCost > walletBalance) {
      setInsufficientBalance(true);
      return;
    }

    setIsRenting(true);
    setTimeout(() => {
      const newRental: Rental = {
        id: `rent-${Date.now()}`,
        gpuId: selectedGPU.id,
        gpuName: selectedGPU.name,
        gpuImage: selectedGPU.image,
        hashRate: selectedGPU.hashRate,
        temp: selectedGPU.temp,
        powerDraw: selectedGPU.powerDraw,
        location: selectedGPU.location,
        startTime: Date.now(),
        duration: rentalDuration,
        totalCost,
        status: 'running',
        instanceId: `#${2800 + Math.floor(Math.random() * 999)}`,
      };

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: 'rental',
        description: `${selectedGPU.name} ${newRental.instanceId} (${rentalDuration}h)`,
        amount: -totalCost,
        date: Date.now(),
        gpuName: selectedGPU.name,
      };

      setMyRentals((prev) => [newRental, ...prev]);
      setTransactions((prev) => [newTx, ...prev]);
      setWalletBalance((prev) => prev - totalCost);
      setIsRenting(false);
      setSelectedGPU(null);

      addNotification({
        title: 'GPU Rented Successfully',
        body: `You rented ${selectedGPU.name} ${newRental.instanceId} for ${rentalDuration}h at ${formatRig(selectedGPU.pricePerHour)}/hr`,
        appId: 'gpu-rental',
        read: false,
      });

      setTimeout(() => {
        addNotification({
          title: `Instance ${newRental.instanceId} is ready`,
          body: `SSH: 192.168.1.${Math.floor(Math.random() * 255)} | User: ubuntu | Password: rig-${Math.random().toString(36).slice(2, 8)}`,
          appId: 'gpu-rental',
          read: false,
        });
      }, 4000);
    }, 1200);
  }, [selectedGPU, rentalDuration, walletBalance, addNotification]);

  const extendRental = useCallback(
    (rentalId: string, hours: number) => {
      const rental = myRentals.find((r) => r.id === rentalId);
      if (!rental) return;
      const cost = rental.totalCost * (hours / rental.duration);
      if (cost > walletBalance) {
        addNotification({
          title: 'Insufficient Balance',
          body: `You need ${formatRig(cost)} but only have ${formatRig(walletBalance)}`,
          appId: 'gpu-rental',
          read: false,
        });
        return;
      }
      setMyRentals((prev) =>
        prev.map((r) =>
          r.id === rentalId ? { ...r, duration: r.duration + hours, totalCost: r.totalCost + cost } : r
        )
      );
      setWalletBalance((prev) => prev - cost);
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          type: 'extension',
          description: `Extend ${rental.gpuName} ${rental.instanceId} (+${hours}h)`,
          amount: -cost,
          date: Date.now(),
          gpuName: rental.gpuName,
        },
        ...prev,
      ]);
      addNotification({
        title: 'Rental Extended',
        body: `${rental.gpuName} extended by ${hours}h`,
        appId: 'gpu-rental',
        read: false,
      });
    },
    [myRentals, walletBalance, addNotification]
  );

  const terminateRental = useCallback(
    (rentalId: string) => {
      const rental = myRentals.find((r) => r.id === rentalId);
      if (!rental) return;
      const elapsed = Date.now() - rental.startTime;
      const total = rental.duration * 3600 * 1000;
      const remainingRatio = Math.max(0, 1 - elapsed / total);
      const refund = Math.round(rental.totalCost * remainingRatio * 0.8 * 10) / 10;

      setMyRentals((prev) => prev.filter((r) => r.id !== rentalId));
      if (refund > 0) {
        setWalletBalance((prev) => prev + refund);
        setTransactions((prev) => [
          {
            id: `tx-${Date.now()}`,
            type: 'refund',
            description: `Early termination ${rental.instanceId}`,
            amount: refund,
            date: Date.now(),
          },
          ...prev,
        ]);
      }
      addNotification({
        title: 'Instance Terminated',
        body: `${rental.gpuName} ${rental.instanceId} terminated. ${refund > 0 ? `Refund: ${formatRig(refund)}` : 'No refund available.'}`,
        appId: 'gpu-rental',
        read: false,
      });
    },
    [myRentals, addNotification]
  );

  const filteredTransactions = useMemo(() => {
    if (txFilter === 'all') return transactions;
    return transactions.filter((t) => t.type === txFilter);
  }, [transactions, txFilter]);

  const activeCount = myRentals.length;
  const totalHoursUsed = myRentals.reduce((acc, r) => acc + r.duration, 0);

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="flex h-full" style={{ background: '#13131A' }}>
      {/* ─── Sidebar ─── */}
      <aside
        className="shrink-0 flex flex-col"
        style={{
          width: 220,
          background: 'rgba(19, 19, 26, 0.6)',
          borderRight: '1px solid #2A2A3A',
          padding: '20px 16px',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 mb-1">
          <Zap size={18} style={{ color: '#00E5A0' }} />
          <span className="font-semibold text-[14px]" style={{ color: '#00E5A0' }}>
            GPU Rental
          </span>
        </div>
        <div style={{ height: 1, background: '#2A2A3A', margin: '16px 0' }} />

        {/* Nav */}
        <nav className="flex flex-col gap-1">
          <SidebarItem
            icon={<Cpu size={16} />}
            label="Browse GPUs"
            active={activeTab === 'browse'}
            onClick={() => setActiveTab('browse')}
          />
          <SidebarItem
            icon={<Server size={16} />}
            label="My Rentals"
            active={activeTab === 'my-rentals'}
            onClick={() => setActiveTab('my-rentals')}
            badge={activeCount > 0 ? activeCount : undefined}
          />
          <SidebarItem
            icon={<Wallet size={16} />}
            label="Wallet"
            active={activeTab === 'wallet'}
            onClick={() => setActiveTab('wallet')}
          />
        </nav>

        <div className="mt-auto">
          <div style={{ height: 1, background: '#2A2A3A', marginBottom: 16 }} />
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px]" style={{ color: '#555570' }}>Credit Balance</span>
            <span className="text-[13px] font-semibold" style={{ color: '#E8E8F0' }}>
              {formatRig(walletBalance)}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px]" style={{ color: '#555570' }}>Active Instances</span>
            <span className="text-[13px] font-semibold" style={{ color: '#E8E8F0' }}>{activeCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px]" style={{ color: '#555570' }}>Total Hours Used</span>
            <span className="text-[13px] font-semibold" style={{ color: '#E8E8F0' }}>{totalHoursUsed}h</span>
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-auto" style={{ padding: 24 }}>
        {activeTab === 'browse' && (
          <BrowseTab
            filteredGPUs={filteredGPUs}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            filterAvailability={filterAvailability}
            setFilterAvailability={setFilterAvailability}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onRentGPU={handleRentGPU}
            myRentals={myRentals}
            realGPUs={realGPUs}
          />
        )}
        {activeTab === 'my-rentals' && (
          <MyRentalsTab
            rentals={myRentals}
            timeLeftMap={timeLeftMap}
            onExtend={extendRental}
            onTerminate={terminateRental}
            onBrowse={() => setActiveTab('browse')}
          />
        )}
        {activeTab === 'wallet' && (
          <WalletTab
            balance={walletBalance}
            transactions={filteredTransactions}
            txFilter={txFilter}
            setTxFilter={setTxFilter}
            onAddFunds={() =>
              addNotification({
                title: 'Coming Soon',
                body: 'Fund deposits will be available in the next update.',
                appId: 'gpu-rental',
                read: false,
              })
            }
            onWithdraw={() =>
              addNotification({
                title: 'Coming Soon',
                body: 'Withdrawals will be available in the next update.',
                appId: 'gpu-rental',
                read: false,
              })
            }
          />
        )}
      </main>

      {/* ─── CSS Keyframes ─── */}
      <style>{`
        @keyframes gpuCardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes statusPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.5; }
        }
      `}</style>

      {/* ─── GPU Detail Modal ─── */}
      {selectedGPU && (
        <GPUDetailModal
          gpu={selectedGPU}
          duration={rentalDuration}
          setDuration={setRentalDuration}
          onClose={() => { setSelectedGPU(null); setIsRenting(false); setInsufficientBalance(false); }}
          onConfirm={confirmRental}
          isRenting={isRenting}
          walletBalance={walletBalance}
          insufficientBalance={insufficientBalance}
        />
      )}
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────

function SidebarItem({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-[10px] w-full text-left transition-colors duration-150"
      style={{
        height: 36,
        padding: '0 12px',
        borderRadius: 6,
        background: active ? 'rgba(0, 229, 160, 0.12)' : 'transparent',
        color: active ? '#00E5A0' : '#8A8AA3',
        fontSize: 13,
        fontWeight: 500,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          e.currentTarget.style.color = '#E8E8F0';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#8A8AA3';
        }
      }}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span
          className="text-[10px] font-semibold px-[6px] py-[2px] rounded-full"
          style={{ background: 'rgba(0,229,160,0.2)', color: '#00E5A0' }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Browse Tab ──────────────────────────────────────────────────────

function BrowseTab({
  filteredGPUs,
  searchQuery,
  setSearchQuery,
  filterCategory,
  setFilterCategory,
  filterAvailability,
  setFilterAvailability,
  showFilters,
  setShowFilters,
  sortBy,
  setSortBy,
  onRentGPU,
  myRentals,
  realGPUs,
}: {
  filteredGPUs: GPU[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  filterAvailability: boolean;
  setFilterAvailability: (v: boolean) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  sortBy: string;
  setSortBy: (v: 'price' | 'performance' | 'availability') => void;
  onRentGPU: (gpu: GPU) => void;
  myRentals: Rental[];
  realGPUs: import('@/hooks/useRealGPU').GPUStatus[];
}) {
  const categories = ['all', 'RTX 3070', '1660 SUPER'];
  const totalOnline = 5;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-display text-[22px] font-bold" style={{ color: '#E8E8F0' }}>
            Available GPUs
          </h2>
          <p className="text-[12px] mt-1" style={{ color: '#8A8AA3' }}>
            {totalOnline} GPUs in local rig — {realGPUs.length} detected by nvidia-smi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555570' }} />
            <input
              type="text"
              placeholder="Search GPUs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-[13px] outline-none transition-colors duration-150"
              style={{
                width: 240,
                height: 36,
                background: '#0A0A0F',
                border: '1px solid #2A2A3A',
                borderRadius: 6,
                padding: '0 12px 0 36px',
                color: '#E8E8F0',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#00E5A0'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#2A2A3A'; }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center transition-colors duration-150"
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              background: showFilters ? 'rgba(0,229,160,0.12)' : 'transparent',
              border: '1px solid',
              borderColor: showFilters ? '#00E5A0' : '#2A2A3A',
              color: showFilters ? '#00E5A0' : '#8A8AA3',
            }}
            onMouseEnter={(e) => { if (!showFilters) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={(e) => { if (!showFilters) e.currentTarget.style.background = 'transparent'; }}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div
          className="mb-4"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid #2A2A3A',
            borderRadius: 10,
            padding: '16px 20px',
          }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[12px]" style={{ color: '#8A8AA3' }}>Model:</span>
            {categories.map((cat) => (
              <FilterChip
                key={cat}
                label={cat === 'all' ? 'All' : cat}
                active={filterCategory === cat}
                onClick={() => setFilterCategory(cat)}
              />
            ))}
            <div style={{ width: 1, height: 20, background: '#2A2A3A', margin: '0 8px' }} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterAvailability}
                onChange={(e) => setFilterAvailability(e.target.checked)}
                className="accent-[#00E5A0]"
              />
              <span className="text-[12px]" style={{ color: '#8A8AA3' }}>Available now only</span>
            </label>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[12px]" style={{ color: '#8A8AA3' }}>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'price' | 'performance' | 'availability')}
                className="text-[12px] outline-none cursor-pointer"
                style={{
                  background: '#1C1C26',
                  border: '1px solid #2A2A3A',
                  borderRadius: 6,
                  padding: '4px 8px',
                  color: '#E8E8F0',
                }}
              >
                <option value="price">Price: Low → High</option>
                <option value="performance">Performance</option>
                <option value="availability">Availability</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Category quick chips (when filters not expanded) */}
      {!showFilters && (
        <div className="flex items-center gap-2 mb-4">
          {categories.map((cat) => (
            <FilterChip
              key={cat}
              label={cat === 'all' ? 'All' : cat}
              active={filterCategory === cat}
              onClick={() => setFilterCategory(cat)}
            />
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px]" style={{ color: '#8A8AA3' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'price' | 'performance' | 'availability')}
              className="text-[12px] outline-none cursor-pointer"
              style={{
                background: '#1C1C26',
                border: '1px solid #2A2A3A',
                borderRadius: 6,
                padding: '4px 8px',
                color: '#E8E8F0',
              }}
            >
              <option value="price">Price: Low → High</option>
              <option value="performance">Performance</option>
              <option value="availability">Availability</option>
            </select>
          </div>
        </div>
      )}

      {/* GPU Grid */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
      >
        {filteredGPUs.map((gpu, i) => {
          const isRentedByMe = myRentals.some((r) => r.gpuId === gpu.id);
          const isRented = gpu.status === 'rented' && !isRentedByMe;
          const isDetected = realGPUs.some((rg) => rg.name.includes(gpu.name.includes('3070') ? 'RTX 3070' : '1660 SUPER'));
          return (
            <GPUCard
              key={gpu.id}
              gpu={gpu}
              index={i}
              isRentedByMe={isRentedByMe}
              isRented={isRented}
              isDetected={isDetected}
              onRent={() => onRentGPU(gpu)}
            />
          );
        })}
      </div>

      {filteredGPUs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Cpu size={48} style={{ color: '#555570' }} />
          <p className="text-[15px] font-medium mt-4" style={{ color: '#8A8AA3' }}>
            No GPUs match your filters
          </p>
          <p className="text-[13px] mt-1" style={{ color: '#555570' }}>
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[12px] transition-all duration-150"
      style={{
        padding: '4px 12px',
        borderRadius: 16,
        border: `1px solid ${active ? '#00E5A0' : '#2A2A3A'}`,
        background: active ? 'rgba(0,229,160,0.12)' : '#1C1C26',
        color: active ? '#00E5A0' : '#E8E8F0',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = '#3D3D55'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = '#2A2A3A'; }}
    >
      {label}
    </button>
  );
}

function GPUCard({
  gpu,
  index,
  isRentedByMe,
  isRented,
  isDetected,
  onRent,
}: {
  gpu: GPU;
  index: number;
  isRentedByMe: boolean;
  isRented: boolean;
  isDetected: boolean;
  onRent: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const statusColor = isRentedByMe ? '#4A9EFF' : isRented ? '#FFB020' : '#00E5A0';
  const availColor = gpu.availability > 70 ? '#00E5A0' : gpu.availability > 30 ? '#FFB020' : '#FF4757';
  const isStar = gpu.name.includes('RTX 3070');

  return (
    <div
      className="flex flex-col overflow-hidden transition-all duration-200 cursor-pointer"
      style={{
        background: '#13131A',
        border: `1px solid ${hovered ? '#3D3D55' : '#2A2A3A'}`,
        borderRadius: 10,
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
        animation: `gpuCardIn 300ms ease-out ${index * 60}ms both`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onRent}
    >
      {/* Status bar */}
      <div style={{ height: 4, background: statusColor }} />

      {/* Image */}
      <div style={{ padding: 16, paddingBottom: 0 }}>
        <div className="overflow-hidden" style={{ borderRadius: 6, height: 140 }}>
          <img
            src={gpu.image}
            alt={gpu.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16 }} className="flex flex-col flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold" style={{ color: isStar ? '#00E5A0' : '#E8E8F0' }}>
            {gpu.name}
          </h3>
          {isStar && (
            <span className="text-[9px] font-bold px-[4px] py-[1px] rounded" style={{ background: 'rgba(0,229,160,0.15)', color: '#00E5A0' }}>
              STAR
            </span>
          )}
          {isDetected && (
            <span className="text-[9px] font-bold px-[4px] py-[1px] rounded flex items-center gap-1" style={{ background: 'rgba(0,229,160,0.10)', color: '#00E5A0' }}>
              <CheckCircle2 size={9} /> DETECTED
            </span>
          )}
        </div>
        <p className="text-[12px] mt-1" style={{ color: '#8A8AA3' }}>
          {gpu.brand} &middot; {gpu.vram} &middot; {formatRig(gpu.pricePerHour)}/hr
        </p>

        <div style={{ height: 1, background: '#2A2A3A', margin: '12px 0' }} />

        {/* Specs */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono-os" style={{ color: '#8A8AA3' }}>
          <span>Hash: <span style={{ color: '#39FF14' }}>{gpu.hashRate} MH/s</span></span>
          <span>Temp: <span style={{ color: gpu.temp > 70 ? '#FF6B35' : '#E8E8F0' }}>{gpu.temp}°C</span></span>
          <span>Power: {gpu.powerDraw}W</span>
          <span>Avail: <span style={{ color: availColor }}>{gpu.availability}%</span></span>
        </div>

        <p className="text-[11px] mt-2" style={{ color: '#555570' }}>{gpu.location}</p>

        {/* Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onRent(); }}
          disabled={isRented}
          className="mt-auto w-full text-[13px] font-semibold transition-all duration-150 shrink-0"
          style={{
            height: 36,
            borderRadius: 6,
            marginTop: 12,
            background: isRented ? '#1C1C26' : isRentedByMe ? '#1C1C26' : '#00E5A0',
            color: isRented ? '#555570' : isRentedByMe ? '#4A9EFF' : '#0A0A0F',
            border: isRentedByMe ? '1px solid #4A9EFF' : 'none',
            cursor: isRented ? 'not-allowed' : 'pointer',
            opacity: isRented ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isRented && !isRentedByMe) e.currentTarget.style.filter = 'brightness(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)';
          }}
        >
          {isRented ? 'Unavailable' : isRentedByMe ? 'Manage Instance' : 'Rent Now'}
        </button>
      </div>
    </div>
  );
}

// ─── GPU Detail Modal ────────────────────────────────────────────────

function GPUDetailModal({
  gpu,
  duration,
  setDuration,
  onClose,
  onConfirm,
  isRenting,
  walletBalance,
  insufficientBalance,
}: {
  gpu: GPU;
  duration: number;
  setDuration: (v: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  isRenting: boolean;
  walletBalance: number;
  insufficientBalance: boolean;
}) {
  const totalCost = gpu.pricePerHour * duration;
  const [hashHistory] = useState(() => generateHashHistory(gpu.hashRate));
  const durations = [1, 6, 12, 24, 48, 168];
  const durationLabels: Record<number, string> = { 1: '1h', 6: '6h', 12: '12h', 24: '24h', 48: '48h', 168: '7d' };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 2000,
        background: 'rgba(10,10,15,0.7)',
        backdropFilter: 'blur(8px)',
        animation: 'modalBackdropIn 200ms ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: 560,
          maxHeight: '85vh',
          background: '#13131A',
          border: '1px solid #2A2A3A',
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          animation: 'modalIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{ padding: '16px 20px' }}>
          <div>
            <h3 className="font-display text-[18px] font-bold" style={{ color: '#E8E8F0' }}>{gpu.name}</h3>
            <span
              className="inline-block text-[11px] font-medium mt-1 px-2 py-[2px] rounded-full"
              style={{
                background: gpu.status === 'available' ? 'rgba(0,229,160,0.15)' : 'rgba(255,176,32,0.15)',
                color: gpu.status === 'available' ? '#00E5A0' : '#FFB020',
              }}
            >
              {gpu.status === 'available' ? 'Available' : 'Rented'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center transition-colors duration-150"
            style={{ width: 32, height: 32, borderRadius: 6, color: '#8A8AA3' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Image */}
        <div style={{ height: 200, overflow: 'hidden' }}>
          <img src={gpu.image} alt={gpu.name} className="w-full h-full object-cover" draggable={false} />
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-4 gap-3" style={{ padding: '20px' }}>
          <SpecCell label="VRAM" value={gpu.vram} />
          <SpecCell label="Power" value={`${gpu.powerDraw}W`} />
          <SpecCell label="Hash Rate" value={`${gpu.hashRate} MH/s`} />
          <SpecCell label="Temp" value={`${gpu.temp}°C`} />
          <SpecCell label="Model" value={gpu.model} />
          <SpecCell label="Bus" value={gpu.bus} />
          <SpecCell label="Cores" value={gpu.cudaCores.toLocaleString()} />
          <SpecCell label="Clock" value={gpu.baseClock} />
        </div>

        {/* Hash History Chart */}
        <div style={{ padding: '0 20px', height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hashHistory}>
              <defs>
                <linearGradient id="hashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5A0" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00E5A0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#555570' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  background: '#1C1C26',
                  border: '1px solid #2A2A3A',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#E8E8F0',
                }}
                labelStyle={{ color: '#8A8AA3' }}
              />
              <Area type="monotone" dataKey="hashRate" stroke="#00E5A0" strokeWidth={2} fill="url(#hashGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Rental Section */}
        <div style={{ padding: '20px', borderTop: '1px solid #2A2A3A' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-[22px] font-bold" style={{ color: '#00E5A0' }}>
              {formatRig(gpu.pricePerHour)}<span className="text-[13px] font-normal" style={{ color: '#8A8AA3' }}>/hr</span>
            </span>
          </div>

          {/* Duration selector */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {durations.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className="text-[13px] font-medium transition-all duration-150"
                style={{
                  width: 56,
                  height: 36,
                  borderRadius: 6,
                  border: `1px solid ${duration === d ? '#00E5A0' : '#2A2A3A'}`,
                  background: duration === d ? 'rgba(0,229,160,0.12)' : '#1C1C26',
                  color: duration === d ? '#00E5A0' : '#E8E8F0',
                }}
              >
                {durationLabels[d]}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-[12px]" style={{ color: '#8A8AA3' }}>Custom:</span>
              <input
                type="number"
                min={1}
                max={168}
                value={duration}
                onChange={(e) => setDuration(Math.max(1, Math.min(168, parseInt(e.target.value) || 1)))}
                className="text-[13px] text-center outline-none"
                style={{
                  width: 56,
                  height: 36,
                  background: '#1C1C26',
                  border: '1px solid #2A2A3A',
                  borderRadius: 6,
                  color: '#E8E8F0',
                }}
              />
              <span className="text-[12px]" style={{ color: '#8A8AA3' }}>hrs</span>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="space-y-1 text-[13px]">
            <div className="flex justify-between">
              <span style={{ color: '#8A8AA3' }}>Duration</span>
              <span style={{ color: '#E8E8F0' }}>{duration} hours</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#8A8AA3' }}>Rate</span>
              <span style={{ color: '#E8E8F0' }}>{formatRig(gpu.pricePerHour)}/hour</span>
            </div>
            <div className="flex justify-between font-semibold" style={{ color: '#E8E8F0' }}>
              <span>Total</span>
              <span style={{ color: '#00E5A0' }}>{formatRig(totalCost)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#8A8AA3' }}>Your balance</span>
              <span style={{ color: '#E8E8F0' }}>{formatRig(walletBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#8A8AA3' }}>Remaining after</span>
              <span style={{ color: totalCost > walletBalance ? '#FF4757' : '#E8E8F0' }}>
                {formatRig(walletBalance - totalCost)}
              </span>
            </div>
          </div>

          {insufficientBalance && (
            <div
              className="mt-3 text-[12px] font-medium"
              style={{
                color: '#FF4757',
                background: 'rgba(255,71,87,0.09)',
                padding: '8px 12px',
                borderRadius: 6,
              }}
            >
              Insufficient balance. You need {formatRig(totalCost)} but have {formatRig(walletBalance)}.
            </div>
          )}

          <button
            onClick={onConfirm}
            disabled={isRenting}
            className="w-full text-[14px] font-semibold mt-4 transition-all duration-150"
            style={{
              height: 44,
              borderRadius: 6,
              background: '#00E5A0',
              color: '#0A0A0F',
              cursor: isRenting ? 'wait' : 'pointer',
              opacity: isRenting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!isRenting) e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            {isRenting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Processing...
              </span>
            ) : (
              'Confirm Rental'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col items-center text-center"
      style={{
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <span className="text-[11px] uppercase tracking-wide" style={{ color: '#555570' }}>{label}</span>
      <span className="text-[14px] font-semibold font-mono-os mt-1" style={{ color: '#E8E8F0' }}>{value}</span>
    </div>
  );
}

// ─── My Rentals Tab ──────────────────────────────────────────────────

function MyRentalsTab({
  rentals,
  timeLeftMap,
  onExtend,
  onTerminate,
  onBrowse,
}: {
  rentals: Rental[];
  timeLeftMap: Record<string, number>;
  onExtend: (id: string, hours: number) => void;
  onTerminate: (id: string) => void;
  onBrowse: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-[22px] font-bold" style={{ color: '#E8E8F0' }}>My Rentals</h2>
          <p className="text-[12px] mt-1" style={{ color: '#8A8AA3' }}>
            {rentals.length} active instance{rentals.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onBrowse}
          className="text-[13px] font-semibold transition-all duration-150"
          style={{
            height: 34,
            padding: '0 16px',
            borderRadius: 6,
            background: '#00E5A0',
            color: '#0A0A0F',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
        >
          + Rent New GPU
        </button>
      </div>

      {rentals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Server size={48} style={{ color: '#555570' }} />
          <p className="text-[15px] font-medium mt-4" style={{ color: '#8A8AA3' }}>No active rentals</p>
          <p className="text-[13px] mt-1" style={{ color: '#555570' }}>Browse available GPUs to get started</p>
          <button
            onClick={onBrowse}
            className="text-[13px] font-semibold mt-4 transition-all duration-150"
            style={{
              height: 36,
              padding: '0 20px',
              borderRadius: 6,
              background: '#00E5A0',
              color: '#0A0A0F',
            }}
          >
            Browse GPUs
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rentals.map((rental) => {
            const timeLeft = timeLeftMap[rental.id] || 0;
            const totalMs = rental.duration * 3600 * 1000;
            const progressPct = Math.min(100, Math.max(0, ((totalMs - timeLeft) / totalMs) * 100));
            const remainingPct = 100 - progressPct;

            let statusColor = '#00E5A0';
            let statusLabel = 'Running';
            if (timeLeft <= 0) { statusColor = '#FF4757'; statusLabel = 'Expired'; }
            else if (remainingPct < 15) { statusColor = '#FFB020'; statusLabel = 'Expiring Soon'; }

            return (
              <div
                key={rental.id}
                className="transition-colors duration-150"
                style={{
                  background: '#13131A',
                  border: '1px solid #2A2A3A',
                  borderRadius: 10,
                  padding: 16,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3D3D55'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2A2A3A'; }}
              >
                {/* Main Row */}
                <div className="flex items-center gap-4">
                  {/* Status dot */}
                  <div className="relative flex items-center justify-center" style={{ width: 12, height: 12 }}>
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: statusColor,
                        animation: statusLabel === 'Running' ? 'statusPulse 2s infinite' : 'none',
                      }}
                    />
                    <div className="rounded-full" style={{ width: 8, height: 8, background: statusColor }} />
                  </div>

                  {/* GPU Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold truncate" style={{ color: '#E8E8F0' }}>
                        {rental.gpuName}
                      </span>
                      <span className="text-[11px] font-mono-os shrink-0" style={{ color: '#8A8AA3' }}>
                        {rental.instanceId}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-[11px] font-mono-os" style={{ color: '#8A8AA3' }}>
                      <span style={{ color: '#39FF14' }}>{rental.hashRate} MH/s</span>
                      <span style={{ color: rental.temp > 75 ? '#FF6B35' : '#E8E8F0' }}>{rental.temp}°C</span>
                      <span>{rental.powerDraw}W</span>
                      <span>{rental.location}</span>
                    </div>
                  </div>

                  {/* Cost */}
                  <div className="text-right shrink-0 mr-2">
                    <div className="text-[13px] font-mono-os font-semibold" style={{ color: '#E8E8F0' }}>
                      {formatRig(rental.totalCost)}
                    </div>
                    <div className="text-[11px]" style={{ color: '#555570' }}>
                      {formatRig(rental.totalCost / rental.duration)}/hr
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <ActionButton icon={<Terminal size={14} />} title="SSH" onClick={() => {}} />
                    <ActionButton icon={<Square size={14} />} title="Stop" onClick={() => onTerminate(rental.id)} hoverColor="#FF4757" />
                    <ActionButton icon={<Clock size={14} />} title="Extend" onClick={() => onExtend(rental.id, 2)} />
                    <ActionButton icon={<MoreVertical size={14} />} title="More" onClick={() => {}} />
                  </div>
                </div>

                {/* Time remaining bar */}
                <div className="mt-3">
                  <div
                    className="w-full overflow-hidden"
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${Math.max(0, remainingPct)}%`,
                        background: remainingPct < 15 ? '#FFB020' : '#00E5A0',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px]" style={{ color: '#555570' }}>
                      {formatTimeRemaining(timeLeft)} remaining of {rental.duration}h rental
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: statusColor }}>{statusLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon,
  title,
  onClick,
  hoverColor,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  hoverColor?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex items-center justify-center transition-colors duration-150"
      style={{ width: 28, height: 28, borderRadius: 6, color: '#8A8AA3' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        if (hoverColor) e.currentTarget.style.color = hoverColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = '#8A8AA3';
      }}
    >
      {icon}
    </button>
  );
}

// ─── Wallet Tab ──────────────────────────────────────────────────────

function WalletTab({
  balance,
  transactions,
  txFilter,
  setTxFilter,
  onAddFunds,
  onWithdraw,
}: {
  balance: number;
  transactions: Transaction[];
  txFilter: string;
  setTxFilter: (v: string) => void;
  onAddFunds: () => void;
  onWithdraw: () => void;
}) {
  const txTypeIcons: Record<string, React.ReactNode> = {
    rental: <Server size={14} />,
    'top-up': <PlusCircle size={14} />,
    refund: <RotateCcw size={14} />,
    extension: <Clock size={14} />,
  };

  const txTypeColors: Record<string, string> = {
    rental: '#FF4757',
    'top-up': '#00E5A0',
    refund: '#4A9EFF',
    extension: '#FFB020',
  };

  const filters = ['all', 'top-up', 'rental', 'refund', 'extension'];

  return (
    <div>
      <h2 className="font-display text-[22px] font-bold mb-6" style={{ color: '#E8E8F0' }}>Wallet</h2>

      <div className="flex gap-6">
        {/* Left: Balance */}
        <div className="shrink-0" style={{ width: 280 }}>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(0,229,160,0.08) 0%, rgba(0,0,0,0) 100%)',
              border: '1px solid rgba(0,229,160,0.2)',
              borderRadius: 12,
              padding: 24,
            }}
          >
            <p className="text-[12px] mb-2" style={{ color: '#8A8AA3' }}>Your Balance</p>
            <p className="font-display text-[32px] font-bold" style={{ color: '#00E5A0' }}>
              {formatRig(balance)}
            </p>
            <p className="text-[13px] mt-1" style={{ color: '#555570' }}>
              ≈ {formatUsd(balance)} USD
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={onAddFunds}
                className="flex-1 text-[13px] font-semibold transition-all duration-150"
                style={{ height: 36, borderRadius: 6, background: '#00E5A0', color: '#0A0A0F' }}
                onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
              >
                Top Up
              </button>
              <button
                onClick={onWithdraw}
                className="flex-1 text-[13px] font-semibold transition-all duration-150"
                style={{ height: 36, borderRadius: 6, background: '#1C1C26', color: '#E8E8F0', border: '1px solid #2A2A3A' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3D3D55'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2A2A3A'; }}
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* Quick amounts */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[10, 50, 100, 250, 500].map((amt) => (
              <button
                key={amt}
                onClick={onAddFunds}
                className="text-[12px] font-medium transition-all duration-150"
                style={{
                  height: 36,
                  borderRadius: 6,
                  background: '#1C1C26',
                  border: '1px solid #2A2A3A',
                  color: '#E8E8F0',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3D3D55'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2A2A3A'; }}
              >
                {amt} RIG
              </button>
            ))}
            <button
              onClick={onAddFunds}
              className="text-[12px] font-medium transition-all duration-150"
              style={{
                height: 36,
                borderRadius: 6,
                background: '#1C1C26',
                border: '1px solid #2A2A3A',
                color: '#8A8AA3',
              }}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Right: Transaction History */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold" style={{ color: '#E8E8F0' }}>Transaction History</h3>
            <div className="relative">
              <select
                value={txFilter}
                onChange={(e) => setTxFilter(e.target.value)}
                className="text-[12px] outline-none cursor-pointer appearance-none pr-6"
                style={{
                  background: '#1C1C26',
                  border: '1px solid #2A2A3A',
                  borderRadius: 6,
                  padding: '4px 24px 4px 10px',
                  color: '#E8E8F0',
                }}
              >
                {filters.map((f) => (
                  <option key={f} value={f}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute pointer-events-none" style={{ right: 8, top: '50%', transform: 'translateY(-50%)', color: '#8A8AA3' }} />
            </div>
          </div>

          <div
            className="overflow-auto"
            style={{
              border: '1px solid #2A2A3A',
              borderRadius: 10,
              maxHeight: 440,
            }}
          >
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <Minus size={32} style={{ color: '#555570' }} />
                <p className="text-[13px] mt-2" style={{ color: '#8A8AA3' }}>No transactions</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 transition-colors duration-100"
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #2A2A3A',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `${txTypeColors[tx.type]}18`,
                      color: txTypeColors[tx.type],
                    }}
                  >
                    {txTypeIcons[tx.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: '#E8E8F0' }}>
                      {tx.type === 'rental' ? 'Rental' : tx.type === 'top-up' ? 'Top-up' : tx.type === 'refund' ? 'Refund' : 'Extension'}: {tx.description}
                    </p>
                    <p className="text-[11px] mt-[2px]" style={{ color: '#555570' }}>
                      {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span
                    className="text-[13px] font-mono-os font-semibold shrink-0"
                    style={{ color: tx.amount > 0 ? '#00E5A0' : '#FF4757' }}
                  >
                    {tx.amount > 0 ? '+' : ''}{formatRig(Math.abs(tx.amount))}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
