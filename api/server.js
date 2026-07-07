const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const GPU_DB_FILE = '/var/lib/rigos/gpu-rentals.json';
const WALLET_FILE = '/var/lib/rigos/wallet.json';
const DATA_DIR = '/var/lib/rigos';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(GPU_DB_FILE)) fs.writeFileSync(GPU_DB_FILE, JSON.stringify({ rentals: [] }, null, 2));
  if (!fs.existsSync(WALLET_FILE)) fs.writeFileSync(WALLET_FILE, JSON.stringify({ balance: 0, transactions: [] }, null, 2));
}
ensureDataDir();

// ===================== GPU STATUS (REAL nvidia-smi) =====================
app.get('/api/gpu/status', (req, res) => {
  try {
    try { execSync('which nvidia-smi', { stdio: 'ignore' }); } catch {
      return res.json({
        gpus: [
          { index: 0, name: 'NVIDIA GeForce GTX 1660 SUPER', temperature: 62, utilization: 45, memoryUsed: 2048, memoryTotal: 6144, power: 85, powerLimit: 125, clockSM: 1830, clockMem: 7000, pstate: 'P0', pcieGen: 3, uuid: 'GPU-0000-01' },
          { index: 1, name: 'NVIDIA GeForce GTX 1660 SUPER', temperature: 64, utilization: 38, memoryUsed: 1536, memoryTotal: 6144, power: 78, powerLimit: 125, clockSM: 1815, clockMem: 7000, pstate: 'P0', pcieGen: 3, uuid: 'GPU-0000-02' },
          { index: 2, name: 'NVIDIA GeForce GTX 1660 SUPER', temperature: 68, utilization: 72, memoryUsed: 4096, memoryTotal: 6144, power: 95, powerLimit: 125, clockSM: 1780, clockMem: 7000, pstate: 'P2', pcieGen: 3, uuid: 'GPU-0000-03' },
          { index: 3, name: 'NVIDIA GeForce GTX 1660 SUPER', temperature: 61, utilization: 12, memoryUsed: 512, memoryTotal: 6144, power: 55, powerLimit: 125, clockSM: 1860, clockMem: 7000, pstate: 'P0', pcieGen: 3, uuid: 'GPU-0000-04' },
          { index: 4, name: 'NVIDIA GeForce RTX 3070', temperature: 58, utilization: 82, memoryUsed: 6144, memoryTotal: 8192, power: 185, powerLimit: 220, clockSM: 1950, clockMem: 7000, pstate: 'P0', pcieGen: 4, uuid: 'GPU-0000-05' },
        ],
        timestamp: Date.now(), mock: true
      });
    }

    const output = execSync(
      'nvidia-smi --query-gpu=index,name,temperature.gpu,utilization.gpu,memory.used,memory.total,power.draw,power.limit,clocks.sm,clocks.mem,pstate,pcie.link.gen.max,uuid --format=csv,noheader,nounits',
      { encoding: 'utf8', timeout: 10000 }
    );

    const lines = output.trim().split('\n');
    const gpus = lines.map((line) => {
      const parts = line.split(', ').map(s => s.trim());
      return {
        index: parseInt(parts[0]),
        name: parts[1],
        temperature: parseFloat(parts[2]) || 0,
        utilization: parseFloat(parts[3]) || 0,
        memoryUsed: parseFloat(parts[4]) || 0,
        memoryTotal: parseFloat(parts[5]) || 0,
        power: parseFloat(parts[6]) || 0,
        powerLimit: parseFloat(parts[7]) || 0,
        clockSM: parseFloat(parts[8]) || 0,
        clockMem: parseFloat(parts[9]) || 0,
        pstate: parts[10] || 'N/A',
        pcieGen: parseInt(parts[11]) || 0,
        uuid: parts[12] || '',
      };
    });

    res.json({ gpus, timestamp: Date.now(), mock: false });
  } catch (error) {
    res.status(500).json({ error: error.message, mock: true });
  }
});

// ===================== GPU PROCESSES =====================
app.get('/api/gpu/processes', (req, res) => {
  try {
    const output = execSync('nvidia-smi pmon -c 1 -s um', { encoding: 'utf8', timeout: 10000 });
    res.json({ raw: output, timestamp: Date.now() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===================== SYSTEM INFO =====================
app.get('/api/system', (req, res) => {
  try {
    const uptime = os.uptime();
    const loadAvg = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    let diskInfo = { total: 0, used: 0, available: 0, percent: 0 };
    try {
      const df = execSync("df -B1 / | tail -1", { encoding: 'utf8' }).trim().split(/\s+/);
      diskInfo = { total: parseInt(df[1]), used: parseInt(df[2]), available: parseInt(df[3]), percent: parseInt(df[4]) };
    } catch {}

    let cpuTemp = null;
    try {
      const temps = execSync('cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -1', { encoding: 'utf8' }).trim();
      if (temps) cpuTemp = parseInt(temps) / 1000;
    } catch {}

    res.json({
      hostname: os.hostname(),
      platform: os.platform(),
      uptime,
      uptimeFormatted: formatUptime(uptime),
      loadAvg,
      memory: { total: totalMem, free: freeMem, used: totalMem - freeMem, percent: (((totalMem - freeMem) / totalMem) * 100).toFixed(1) },
      cpu: { count: os.cpus().length, model: os.cpus()[0]?.model || 'Unknown', temp: cpuTemp },
      disk: diskInfo,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===================== NETWORK INFO =====================
app.get('/api/network', (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    const nets = [];
    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs || []) {
        if (addr.family === 'IPv4' && !addr.internal) {
          nets.push({ interface: name, ip: addr.address, mac: addr.mac, netmask: addr.netmask });
        }
      }
    }

    let internet = false;
    try { execSync('ping -c 1 -W 3 8.8.8.8', { stdio: 'ignore' }); internet = true; } catch {}

    res.json({ interfaces: nets, internet, timestamp: Date.now() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===================== RENTAL MANAGEMENT =====================
app.get('/api/rentals', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(GPU_DB_FILE, 'utf8'));
    res.json(data.rentals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rentals', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(GPU_DB_FILE, 'utf8'));
    const rental = { ...req.body, id: crypto.randomUUID(), createdAt: Date.now() };
    data.rentals.push(rental);
    fs.writeFileSync(GPU_DB_FILE, JSON.stringify(data, null, 2));
    res.json(rental);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rentals/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(GPU_DB_FILE, 'utf8'));
    data.rentals = data.rentals.filter(r => r.id !== req.params.id);
    fs.writeFileSync(GPU_DB_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===================== WALLET =====================
app.get('/api/wallet', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/wallet/transaction', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
    const tx = { ...req.body, id: crypto.randomUUID(), timestamp: Date.now() };
    data.transactions.unshift(tx);
    if (tx.type === 'deposit') data.balance += tx.amount;
    else if (tx.type === 'charge' || tx.type === 'rental') data.balance -= tx.amount;
    else if (tx.type === 'refund') data.balance += tx.amount;
    fs.writeFileSync(WALLET_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, balance: data.balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===================== SERVICE CONTROL =====================
app.get('/api/services', (req, res) => {
  try {
    const services = ['nginx', 'rigos-api', 'nvidia-persistenced', 'docker'];
    const statuses = services.map(s => {
      try {
        const out = execSync(`systemctl is-active ${s} 2>/dev/null || echo "unknown"`, { encoding: 'utf8' }).trim();
        return { name: s, status: out };
      } catch { return { name: s, status: 'unknown' }; }
    });
    res.json({ services: statuses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/service/:name/:action', (req, res) => {
  const { name, action } = req.params;
  if (!['start', 'stop', 'restart', 'status'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use: start, stop, restart, status' });
  }
  try {
    const output = execSync(`sudo systemctl ${action} ${name} 2>&1 || true`, { encoding: 'utf8' });
    res.json({ success: true, service: name, action, output });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ===================== HELPERS =====================
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`RIG.OS API listening on 127.0.0.1:${PORT}`);
});
