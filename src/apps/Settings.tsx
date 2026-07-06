import { useState, useEffect, useCallback } from 'react';
import {
  Wifi,
  Image,
  Palette,
  Volume2,
  Globe,
  Users,
  Info,
  Check,
  Lock,
  RefreshCw,
  Cpu,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useOSStore } from '@/store/osStore';

type Theme = 'dark' | 'darker' | 'mining';
type AccentColor = { name: string; hex: string };

const ACCENT_COLORS: AccentColor[] = [
  { name: 'GPU Green', hex: '#00E5A0' },
  { name: 'Blue', hex: '#4A9EFF' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Amber', hex: '#FFB020' },
  { name: 'Red', hex: '#FF4757' },
  { name: 'Pink', hex: '#FF6B9D' },
];

const WALLPAPERS = [
  { name: 'Mining Facility', path: '/wallpaper-default.jpg' },
  { name: 'Circuit Board', path: '/wallpaper-alternate.jpg' },
  { name: 'Clean Dark', path: '/wallpaper-minimal.jpg' },
];

const WIFI_NETWORKS = [
  { name: 'RIG-Main', signal: 4, secured: true, connected: true },
  { name: 'RIG-Guest', signal: 3, secured: true, connected: false },
  { name: 'Mining-Pool-5G', signal: 4, secured: true, connected: false },
  { name: 'xfinitywifi', signal: 2, secured: false, connected: false },
  { name: 'RIG-Mesh-Node-2', signal: 3, secured: true, connected: false },
];

interface SettingsState {
  wifi: {
    enabled: boolean;
    connectedNetwork: string | null;
  };
  appearance: {
    theme: Theme;
    accentColor: string;
    transparency: boolean;
    animations: boolean;
    fontSize: number;
  };
  display: {
    wallpaper: string;
    wallpaperMode: string;
  };
  sound: {
    outputVolume: number;
    inputVolume: number;
    outputDevice: string;
    inputDevice: string;
    alertSounds: boolean;
  };
  network: {
    hostname: string;
    dhcp: boolean;
    ip: string;
    subnet: string;
    gateway: string;
    dns: string[];
  };
  users: {
    currentUser: {
      name: string;
      username: string;
      role: string;
      email: string;
    };
  };
}

type Category = 'wifi' | 'background' | 'appearance' | 'sound' | 'network' | 'users' | 'about';

const categories: { id: Category; label: string; icon: React.ElementType }[] = [
  { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { id: 'background', label: 'Background', icon: Image },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'sound', label: 'Sound', icon: Volume2 },
  { id: 'network', label: 'Network', icon: Globe },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'about', label: 'About', icon: Info },
];

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className="relative rounded-full transition-colors duration-200"
      style={{
        width: 44,
        height: 24,
        backgroundColor: checked ? '#00E5A0' : '#2A2A3A',
      }}
      onClick={() => onChange(!checked)}
    >
      <div
        className="absolute rounded-full transition-transform duration-200"
        style={{
          width: 18,
          height: 18,
          backgroundColor: '#fff',
          top: 3,
          left: 3,
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

function Slider({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[#00E5A0]"
        style={{ height: 4 }}
      />
      {label && (
        <span className="text-[12px] w-10 text-right" style={{ color: '#8A8AA3' }}>
          {label}
        </span>
      )}
    </div>
  );
}

export default function Settings() {
  const [activeCategory, setActiveCategory] = useState<Category>('wifi');
  const [settings, setSettings] = useState<SettingsState>({
    wifi: { enabled: true, connectedNetwork: 'RIG-Main' },
    appearance: {
      theme: 'dark',
      accentColor: '#00E5A0',
      transparency: true,
      animations: true,
      fontSize: 13,
    },
    display: {
      wallpaper: '/wallpaper-default.jpg',
      wallpaperMode: 'fill',
    },
    sound: {
      outputVolume: 75,
      inputVolume: 60,
      outputDevice: 'Built-in Audio',
      inputDevice: 'Built-in Microphone',
      alertSounds: true,
    },
    network: {
      hostname: 'rig-os-mining-station',
      dhcp: true,
      ip: '192.168.1.105',
      subnet: '255.255.255.0',
      gateway: '192.168.1.1',
      dns: ['8.8.8.8', '1.1.1.1'],
    },
    users: {
      currentUser: {
        name: 'Rig Operator',
        username: 'rigos',
        role: 'Administrator',
        email: 'rigos@rig-os.local',
      },
    },
  });

  const [uptime, setUptime] = useState({ days: 3, hours: 7, mins: 22 });
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [connectingWifi, setConnectingWifi] = useState<string | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [testSoundPlaying, setTestSoundPlaying] = useState(false);
  const addNotification = useOSStore((s) => s.addNotification);

  // Live uptime counter
  useEffect(() => {
    const interval = setInterval(() => {
      setUptime((prev) => {
        let { days, hours, mins } = prev;
        mins++;
        if (mins >= 60) {
          mins = 0;
          hours++;
        }
        if (hours >= 24) {
          hours = 0;
          days++;
        }
        return { days, hours, mins };
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const updateSetting = useCallback(
    <K extends keyof SettingsState>(section: K, updates: Partial<SettingsState[K]>) => {
      setSettings((prev) => ({
        ...prev,
        [section]: { ...prev[section], ...updates },
      }));
    },
    []
  );

  const playTestSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      setTestSoundPlaying(true);
      setTimeout(() => setTestSoundPlaying(false), 500);
    } catch {
      // Audio not available
    }
  }, []);

  const handleCheckUpdate = useCallback(() => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    setTimeout(() => {
      setCheckingUpdate(false);
      setUpdateStatus('Your system is up to date — RIG.OS 24.04 LTS');
    }, 2000);
  }, []);

  const handleWifiConnect = useCallback(
    (networkName: string) => {
      setConnectingWifi(networkName);
      setTimeout(() => {
        setConnectingWifi(null);
        updateSetting('wifi', { connectedNetwork: networkName });
        addNotification({
          title: 'Wi-Fi Connected',
          body: `Connected to ${networkName}`,
          appId: 'settings',
        });
      }, 1500);
    },
    [updateSetting, addNotification]
  );

  const renderPanel = () => {
    switch (activeCategory) {
      case 'wifi':
        return (
          <div className="p-6">
            <h2 className="text-[18px] font-semibold mb-6" style={{ color: '#E8E8F0' }}>
              Wi-Fi
            </h2>

            {/* Wi-Fi Toggle */}
            <div
              className="flex items-center justify-between rounded-[10px] p-4 mb-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center gap-3">
                <Wifi size={20} color={settings.wifi.enabled ? '#00E5A0' : '#555570'} />
                <span className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
                  Wi-Fi
                </span>
              </div>
              <ToggleSwitch
                checked={settings.wifi.enabled}
                onChange={(v) => updateSetting('wifi', { enabled: v })}
              />
            </div>

            {settings.wifi.enabled && (
              <>
                {/* Available Networks */}
                <h3 className="text-[13px] font-semibold mb-3 uppercase tracking-wider" style={{ color: '#555570' }}>
                  Available Networks
                </h3>
                <div className="space-y-1">
                  {WIFI_NETWORKS.map((network) => {
                    const isConnected = settings.wifi.connectedNetwork === network.name;
                    return (
                      <button
                        key={network.name}
                        className="w-full flex items-center gap-3 rounded-[8px] px-4 py-3 transition-colors duration-100 text-left"
                        style={{
                          backgroundColor: isConnected ? 'rgba(0,229,160,0.05)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isConnected)
                            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isConnected)
                            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        }}
                        onClick={() => !isConnected && handleWifiConnect(network.name)}
                        disabled={connectingWifi === network.name}
                      >
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4].map((bar) => (
                            <div
                              key={bar}
                              className="rounded-sm"
                              style={{
                                width: 3,
                                height: 4 + bar * 3,
                                backgroundColor: bar <= network.signal ? (isConnected ? '#00E5A0' : '#E8E8F0') : '#2A2A3A',
                              }}
                            />
                          ))}
                        </div>
                        <span className="flex-1 text-[13px]" style={{ color: '#E8E8F0' }}>
                          {network.name}
                        </span>
                        {network.secured && <Lock size={14} color="#8A8AA3" />}
                        {isConnected && (
                          <span className="text-[12px] font-medium" style={{ color: '#00E5A0' }}>
                            Connected
                          </span>
                        )}
                        {connectingWifi === network.name && (
                          <RefreshCw size={14} color="#00E5A0" className="animate-spin" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Saved Networks */}
                <h3 className="text-[13px] font-semibold mt-6 mb-3 uppercase tracking-wider" style={{ color: '#555570' }}>
                  Saved Networks
                </h3>
                <div className="space-y-1">
                  {WIFI_NETWORKS.filter((n) => n.connected || n.secured).map((network) => (
                    <div
                      key={`saved-${network.name}`}
                      className="flex items-center justify-between rounded-[8px] px-4 py-3"
                      style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                    >
                      <div className="flex items-center gap-3">
                        <Wifi size={16} color="#8A8AA3" />
                        <span className="text-[13px]" style={{ color: '#E8E8F0' }}>
                          {network.name}
                        </span>
                      </div>
                      <button
                        className="text-[12px] transition-colors duration-150"
                        style={{ color: '#FF4757' }}
                        onClick={() =>
                          addNotification({
                            title: 'Network Forgotten',
                            body: `Removed ${network.name} from saved networks`,
                            appId: 'settings',
                          })
                        }
                      >
                        Forget
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case 'background':
        return (
          <div className="p-6">
            <h2 className="text-[18px] font-semibold mb-6" style={{ color: '#E8E8F0' }}>
              Background
            </h2>

            {/* Wallpaper Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {WALLPAPERS.map((wp) => (
                <button
                  key={wp.path}
                  className="relative rounded-[8px] overflow-hidden transition-all duration-200"
                  style={{
                    aspectRatio: '16/9',
                    border:
                      settings.display.wallpaper === wp.path ? '2px solid #00E5A0' : '2px solid transparent',
                    boxShadow:
                      settings.display.wallpaper === wp.path
                        ? '0 0 0 2px rgba(0,229,160,0.25)'
                        : 'none',
                  }}
                  onClick={() => updateSetting('display', { wallpaper: wp.path })}
                >
                  <img
                    src={wp.path}
                    alt={wp.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.backgroundColor = '#1C1C26';
                    }}
                  />
                  {settings.display.wallpaper === wp.path && (
                    <div className="absolute top-2 right-2 rounded-full p-1" style={{ backgroundColor: '#00E5A0' }}>
                      <Check size={10} color="#0A0A0F" />
                    </div>
                  )}
                  <div
                    className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[11px] text-center"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#E8E8F0',
                    }}
                  >
                    {wp.name}
                  </div>
                </button>
              ))}
            </div>

            {/* Wallpaper Mode */}
            <h3 className="text-[13px] font-semibold mb-3" style={{ color: '#E8E8F0' }}>
              Wallpaper Mode
            </h3>
            <div className="flex gap-2 mb-6">
              {['Fill', 'Fit', 'Stretch', 'Center', 'Tile'].map((mode) => (
                <button
                  key={mode}
                  className="rounded-[6px] px-3 py-2 text-[12px] transition-colors duration-150"
                  style={{
                    backgroundColor:
                      settings.display.wallpaperMode === mode.toLowerCase() ? '#1C1C26' : 'transparent',
                    color:
                      settings.display.wallpaperMode === mode.toLowerCase() ? '#00E5A0' : '#8A8AA3',
                    border: `1px solid ${settings.display.wallpaperMode === mode.toLowerCase() ? '#00E5A0' : '#2A2A3A'}`,
                  }}
                  onClick={() => updateSetting('display', { wallpaperMode: mode.toLowerCase() })}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Preview */}
            <h3 className="text-[13px] font-semibold mb-3" style={{ color: '#E8E8F0' }}>
              Preview
            </h3>
            <div
              className="rounded-[8px] overflow-hidden"
              style={{ aspectRatio: '16/9', backgroundColor: '#0A0A0F' }}
            >
              <img
                src={settings.display.wallpaper}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.backgroundColor = '#1C1C26';
                }}
              />
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="p-6">
            <h2 className="text-[18px] font-semibold mb-6" style={{ color: '#E8E8F0' }}>
              Appearance
            </h2>

            {/* Theme */}
            <div className="mb-6">
              <h3 className="text-[13px] font-semibold mb-3" style={{ color: '#E8E8F0' }}>
                Theme
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    id: 'dark' as Theme,
                    label: 'Dark',
                    desc: 'Standard dark theme',
                    preview: '#13131A',
                  },
                  {
                    id: 'darker' as Theme,
                    label: 'Darker',
                    desc: 'Deeper blacks',
                    preview: '#0A0A0F',
                  },
                  {
                    id: 'mining' as Theme,
                    label: 'Mining',
                    desc: 'GPU green tint',
                    preview: '#0D1F14',
                  },
                ].map((theme) => (
                  <button
                    key={theme.id}
                    className="rounded-[10px] p-4 text-left transition-all duration-200"
                    style={{
                      backgroundColor: '#13131A',
                      border:
                        settings.appearance.theme === theme.id
                          ? '2px solid #00E5A0'
                          : '2px solid #2A2A3A',
                    }}
                    onClick={() => updateSetting('appearance', { theme: theme.id })}
                  >
                    <div
                      className="rounded-[6px] mb-3"
                      style={{ width: '100%', height: 48, backgroundColor: theme.preview }}
                    />
                    <div className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
                      {theme.label}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#555570' }}>
                      {theme.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div className="mb-6">
              <h3 className="text-[13px] font-semibold mb-3" style={{ color: '#E8E8F0' }}>
                Accent Color
              </h3>
              <div className="flex gap-3">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    className="relative rounded-full transition-transform duration-200"
                    style={{
                      width: 28,
                      height: 28,
                      backgroundColor: color.hex,
                      transform: settings.appearance.accentColor === color.hex ? 'scale(1.15)' : 'scale(1)',
                      boxShadow:
                        settings.appearance.accentColor === color.hex
                          ? `0 0 0 2px #fff, 0 0 0 4px ${color.hex}`
                          : 'none',
                    }}
                    onClick={() => updateSetting('appearance', { accentColor: color.hex })}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Transparency */}
            <div
              className="flex items-center justify-between rounded-[10px] p-4 mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <div>
                <div className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
                  Window Transparency
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: '#555570' }}>
                  Enable glassmorphic effects on windows
                </div>
              </div>
              <ToggleSwitch
                checked={settings.appearance.transparency}
                onChange={(v) => updateSetting('appearance', { transparency: v })}
              />
            </div>

            {/* Animations */}
            <div
              className="flex items-center justify-between rounded-[10px] p-4 mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <div>
                <div className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
                  Animations
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: '#555570' }}>
                  Enable window and UI animations
                </div>
              </div>
              <ToggleSwitch
                checked={settings.appearance.animations}
                onChange={(v) => updateSetting('appearance', { animations: v })}
              />
            </div>

            {/* Font Size */}
            <div className="rounded-[10px] p-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <div className="text-[13px] font-medium mb-3" style={{ color: '#E8E8F0' }}>
                Font Size: {settings.appearance.fontSize}px
              </div>
              <Slider
                value={settings.appearance.fontSize}
                min={11}
                max={16}
                onChange={(v) => updateSetting('appearance', { fontSize: v })}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[11px]" style={{ color: '#555570' }}>
                  Small
                </span>
                <span className="text-[11px]" style={{ color: '#555570' }}>
                  Large
                </span>
              </div>
            </div>
          </div>
        );

      case 'sound':
        return (
          <div className="p-6">
            <h2 className="text-[18px] font-semibold mb-6" style={{ color: '#E8E8F0' }}>
              Sound
            </h2>

            {/* Output Volume */}
            <div
              className="rounded-[10px] p-4 mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Volume2 size={18} color="#8A8AA3" />
                <span className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
                  Output Volume
                </span>
                <span className="text-[12px] ml-auto" style={{ color: '#8A8AA3' }}>
                  {settings.sound.outputVolume}%
                </span>
              </div>
              <Slider
                value={settings.sound.outputVolume}
                min={0}
                max={100}
                onChange={(v) => updateSetting('sound', { outputVolume: v })}
                label={`${settings.sound.outputVolume}%`}
              />
            </div>

            {/* Input Volume */}
            <div
              className="rounded-[10px] p-4 mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Cpu size={18} color="#8A8AA3" />
                <span className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
                  Input Volume
                </span>
              </div>
              <Slider
                value={settings.sound.inputVolume}
                min={0}
                max={100}
                onChange={(v) => updateSetting('sound', { inputVolume: v })}
                label={`${settings.sound.inputVolume}%`}
              />
            </div>

            {/* Output Device */}
            <div className="mb-4">
              <h3 className="text-[13px] font-semibold mb-2" style={{ color: '#E8E8F0' }}>
                Output Device
              </h3>
              <select
                value={settings.sound.outputDevice}
                onChange={(e) => updateSetting('sound', { outputDevice: e.target.value })}
                className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none"
                style={{
                  backgroundColor: '#0A0A0F',
                  border: '1px solid #2A2A3A',
                  color: '#E8E8F0',
                }}
              >
                <option>Built-in Audio</option>
                <option>HDMI Output</option>
                <option>USB Audio</option>
                <option>Bluetooth Headphones</option>
              </select>
            </div>

            {/* Input Device */}
            <div className="mb-4">
              <h3 className="text-[13px] font-semibold mb-2" style={{ color: '#E8E8F0' }}>
                Input Device
              </h3>
              <select
                value={settings.sound.inputDevice}
                onChange={(e) => updateSetting('sound', { inputDevice: e.target.value })}
                className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none"
                style={{
                  backgroundColor: '#0A0A0F',
                  border: '1px solid #2A2A3A',
                  color: '#E8E8F0',
                }}
              >
                <option>Built-in Microphone</option>
                <option>USB Microphone</option>
                <option>Bluetooth Headset</option>
              </select>
            </div>

            {/* Alert Sounds */}
            <div
              className="flex items-center justify-between rounded-[10px] p-4 mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center gap-3">
                <BellIcon size={18} color="#8A8AA3" />
                <span className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
                  Alert Sounds
                </span>
              </div>
              <ToggleSwitch
                checked={settings.sound.alertSounds}
                onChange={(v) => updateSetting('sound', { alertSounds: v })}
              />
            </div>

            {/* Test Sound */}
            <button
              className="flex items-center gap-2 rounded-[6px] px-4 py-2 text-[13px] transition-all duration-150"
              style={{
                backgroundColor: testSoundPlaying ? 'rgba(0,229,160,0.12)' : '#1C1C26',
                color: testSoundPlaying ? '#00E5A0' : '#E8E8F0',
                border: '1px solid #2A2A3A',
              }}
              onClick={playTestSound}
            >
              <Volume2 size={14} />
              {testSoundPlaying ? 'Playing...' : 'Test Sound'}
            </button>
          </div>
        );

      case 'network':
        return (
          <div className="p-6">
            <h2 className="text-[18px] font-semibold mb-6" style={{ color: '#E8E8F0' }}>
              Network
            </h2>

            {/* Connection Status */}
            <div
              className="flex items-center gap-3 rounded-[10px] p-4 mb-6"
              style={{ backgroundColor: 'rgba(0,229,160,0.05)' }}
            >
              <div
                className="rounded-full p-2"
                style={{ backgroundColor: 'rgba(0,229,160,0.12)' }}
              >
                <Globe size={20} color="#00E5A0" />
              </div>
              <div>
                <div className="text-[13px] font-medium" style={{ color: '#00E5A0' }}>
                  Connected
                </div>
                <div className="text-[11px]" style={{ color: '#8A8AA3' }}>
                  Ethernet — 1 Gbps
                </div>
              </div>
            </div>

            {/* Hostname */}
            <div className="mb-4">
              <h3 className="text-[13px] font-semibold mb-2" style={{ color: '#E8E8F0' }}>
                Hostname
              </h3>
              <input
                type="text"
                value={settings.network.hostname}
                onChange={(e) => updateSetting('network', { hostname: e.target.value })}
                className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none"
                style={{
                  backgroundColor: '#0A0A0F',
                  border: '1px solid #2A2A3A',
                  color: '#E8E8F0',
                }}
              />
            </div>

            {/* DHCP Toggle */}
            <div
              className="flex items-center justify-between rounded-[10px] p-4 mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <div>
                <div className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
                  DHCP
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: '#555570' }}>
                  Automatically obtain IP address
                </div>
              </div>
              <ToggleSwitch
                checked={settings.network.dhcp}
                onChange={(v) => updateSetting('network', { dhcp: v })}
              />
            </div>

            {/* IP Configuration */}
            <div className="space-y-3 mb-6">
              <h3 className="text-[13px] font-semibold" style={{ color: '#E8E8F0' }}>
                IP Configuration
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] block mb-1" style={{ color: '#555570' }}>
                    IP Address
                  </label>
                  <input
                    type="text"
                    value={settings.network.ip}
                    onChange={(e) => updateSetting('network', { ip: e.target.value })}
                    disabled={settings.network.dhcp}
                    className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none"
                    style={{
                      backgroundColor: '#0A0A0F',
                      border: '1px solid #2A2A3A',
                      color: settings.network.dhcp ? '#555570' : '#E8E8F0',
                    }}
                  />
                </div>
                <div>
                  <label className="text-[11px] block mb-1" style={{ color: '#555570' }}>
                    Subnet Mask
                  </label>
                  <input
                    type="text"
                    value={settings.network.subnet}
                    onChange={(e) => updateSetting('network', { subnet: e.target.value })}
                    disabled={settings.network.dhcp}
                    className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none"
                    style={{
                      backgroundColor: '#0A0A0F',
                      border: '1px solid #2A2A3A',
                      color: settings.network.dhcp ? '#555570' : '#E8E8F0',
                    }}
                  />
                </div>
                <div>
                  <label className="text-[11px] block mb-1" style={{ color: '#555570' }}>
                    Gateway
                  </label>
                  <input
                    type="text"
                    value={settings.network.gateway}
                    onChange={(e) => updateSetting('network', { gateway: e.target.value })}
                    disabled={settings.network.dhcp}
                    className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none"
                    style={{
                      backgroundColor: '#0A0A0F',
                      border: '1px solid #2A2A3A',
                      color: settings.network.dhcp ? '#555570' : '#E8E8F0',
                    }}
                  />
                </div>
                <div>
                  <label className="text-[11px] block mb-1" style={{ color: '#555570' }}>
                    DNS
                  </label>
                  <input
                    type="text"
                    value={settings.network.dns.join(', ')}
                    onChange={(e) => updateSetting('network', { dns: e.target.value.split(',').map((s) => s.trim()) })}
                    disabled={settings.network.dhcp}
                    className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none"
                    style={{
                      backgroundColor: '#0A0A0F',
                      border: '1px solid #2A2A3A',
                      color: settings.network.dhcp ? '#555570' : '#E8E8F0',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Network Interface Info */}
            <h3 className="text-[13px] font-semibold mb-2" style={{ color: '#E8E8F0' }}>
              Network Interfaces
            </h3>
            <div className="rounded-[8px] overflow-hidden" style={{ border: '1px solid #2A2A3A' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold" style={{ color: '#555570' }}>
                      Interface
                    </th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold" style={{ color: '#555570' }}>
                      IP Address
                    </th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold" style={{ color: '#555570' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderTop: '1px solid #2A2A3A' }}>
                    <td className="px-3 py-2 text-[12px]" style={{ color: '#E8E8F0' }}>
                      eth0
                    </td>
                    <td className="px-3 py-2 text-[12px]" style={{ color: '#8A8AA3' }}>
                      192.168.1.105
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[12px] font-medium" style={{ color: '#00E5A0' }}>
                        Up
                      </span>
                    </td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #2A2A3A' }}>
                    <td className="px-3 py-2 text-[12px]" style={{ color: '#E8E8F0' }}>
                      lo
                    </td>
                    <td className="px-3 py-2 text-[12px]" style={{ color: '#8A8AA3' }}>
                      127.0.0.1
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[12px] font-medium" style={{ color: '#00E5A0' }}>
                        Up
                      </span>
                    </td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #2A2A3A' }}>
                    <td className="px-3 py-2 text-[12px]" style={{ color: '#E8E8F0' }}>
                      wlan0
                    </td>
                    <td className="px-3 py-2 text-[12px]" style={{ color: '#8A8AA3' }}>
                      192.168.1.106
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[12px] font-medium" style={{ color: '#00E5A0' }}>
                        Up
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="p-6">
            <h2 className="text-[18px] font-semibold mb-6" style={{ color: '#E8E8F0' }}>
              Users
            </h2>

            {/* Current User Card */}
            <div
              className="rounded-[10px] p-5 mb-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center rounded-full text-[22px] font-bold"
                  style={{
                    width: 64,
                    height: 64,
                    backgroundColor: '#00E5A0',
                    color: '#0A0A0F',
                  }}
                >
                  R
                </div>
                <div className="flex-1">
                  <div className="text-[16px] font-semibold" style={{ color: '#E8E8F0' }}>
                    {settings.users.currentUser.name}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: '#8A8AA3' }}>
                    {settings.users.currentUser.role}
                  </div>
                  <div className="text-[12px]" style={{ color: '#555570' }}>
                    {settings.users.currentUser.email}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  className="rounded-[6px] px-3 py-2 text-[12px] transition-colors duration-150"
                  style={{ backgroundColor: '#1C1C26', border: '1px solid #2A2A3A', color: '#E8E8F0' }}
                  onClick={() => setShowPasswordChange(true)}
                >
                  Change Password
                </button>
                <button
                  className="rounded-[6px] px-3 py-2 text-[12px] transition-colors duration-150"
                  style={{ backgroundColor: '#1C1C26', border: '1px solid #2A2A3A', color: '#E8E8F0' }}
                  onClick={() =>
                    addNotification({
                      title: 'Coming Soon',
                      body: 'Avatar customization will be available in a future update.',
                      appId: 'settings',
                    })
                  }
                >
                  Change Avatar
                </button>
              </div>
            </div>

            {/* Password Change Dialog */}
            {showPasswordChange && (
              <div
                className="rounded-[10px] p-4 mb-6"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid #2A2A3A' }}
              >
                <h3 className="text-[13px] font-semibold mb-3" style={{ color: '#E8E8F0' }}>
                  Change Password
                </h3>
                <div className="space-y-2 mb-3">
                  <PasswordInput
                    placeholder="Current password"
                    value={passwordForm.current}
                    onChange={(v) => setPasswordForm((p) => ({ ...p, current: v }))}
                  />
                  <PasswordInput
                    placeholder="New password"
                    value={passwordForm.new}
                    onChange={(v) => setPasswordForm((p) => ({ ...p, new: v }))}
                  />
                  <PasswordInput
                    placeholder="Confirm new password"
                    value={passwordForm.confirm}
                    onChange={(v) => setPasswordForm((p) => ({ ...p, confirm: v }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-[6px] px-3 py-2 text-[12px] transition-colors duration-150"
                    style={{ backgroundColor: '#1C1C26', border: '1px solid #2A2A3A', color: '#E8E8F0' }}
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordForm({ current: '', new: '', confirm: '' });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-[6px] px-3 py-2 text-[12px] transition-colors duration-150"
                    style={{ backgroundColor: '#00E5A0', color: '#0A0A0F' }}
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordForm({ current: '', new: '', confirm: '' });
                      addNotification({
                        title: 'Password Updated',
                        body: 'Your password has been changed successfully.',
                        appId: 'settings',
                      });
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Other Users */}
            <h3 className="text-[13px] font-semibold mb-3" style={{ color: '#E8E8F0' }}>
              Other Users
            </h3>
            <div className="space-y-2">
              <div
                className="flex items-center gap-3 rounded-[8px] px-4 py-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <div
                  className="flex items-center justify-center rounded-full text-[14px] font-bold"
                  style={{ width: 36, height: 36, backgroundColor: '#4A9EFF', color: '#fff' }}
                >
                  G
                </div>
                <div className="flex-1">
                  <div className="text-[13px]" style={{ color: '#E8E8F0' }}>
                    Guest
                  </div>
                  <div className="text-[11px]" style={{ color: '#555570' }}>
                    Standard User
                  </div>
                </div>
                <button
                  className="text-[12px] transition-colors duration-150"
                  style={{ color: '#FF4757' }}
                  onClick={() =>
                    addNotification({
                      title: 'User Removed',
                      body: 'Guest user has been removed.',
                      appId: 'settings',
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </div>

            <button
              className="mt-4 flex items-center gap-2 rounded-[6px] px-4 py-2 text-[13px] transition-colors duration-150"
              style={{ backgroundColor: '#1C1C26', border: '1px solid #2A2A3A', color: '#E8E8F0' }}
              onClick={() =>
                addNotification({
                  title: 'Coming Soon',
                  body: 'Adding new users will be available in a future update.',
                  appId: 'settings',
                })
              }
            >
              <Users size={14} />
              Add User
            </button>
          </div>
        );

      case 'about':
        return (
          <div className="p-6">
            <div className="flex flex-col items-center mb-6">
              {/* Logo placeholder */}
              <div
                className="flex items-center justify-center rounded-[12px] mb-3 font-bold text-[28px]"
                style={{
                  width: 120,
                  height: 60,
                  backgroundColor: 'rgba(0,229,160,0.12)',
                  color: '#00E5A0',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                RIG.OS
              </div>
              <h2
                className="text-[22px] font-bold"
                style={{ color: '#E8E8F0', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                RIG.OS 24.04 LTS
              </h2>
              <p className="text-[13px] mt-1" style={{ color: '#8A8AA3' }}>
                Mining Edition
              </p>
            </div>

            {/* System Info Grid */}
            <div
              className="rounded-[10px] p-4 mb-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <h3 className="text-[13px] font-semibold mb-3" style={{ color: '#E8E8F0' }}>
                System Information
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <InfoRow label="Device Name" value="rig-os-mining-station" />
                <InfoRow label="OS Version" value="24.04 LTS" />
                <InfoRow label="Kernel" value="6.8.0-rig-generic" />
                <InfoRow label="Architecture" value="x86_64" />
                <InfoRow label="Build Date" value="2024-04-15" />
                <InfoRow label="Serial Number" value="RGM-2024-0047-MN" />
              </div>
            </div>

            {/* Hardware Info */}
            <div
              className="rounded-[10px] p-4 mb-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <h3 className="text-[13px] font-semibold mb-3" style={{ color: '#E8E8F0' }}>
                Hardware
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <InfoRow label="Processor" value="AMD Ryzen 9 7950X (16C/32T)" />
                <InfoRow label="Memory" value="64GB DDR5-5600" />
                <InfoRow label="Storage" value="2TB NVMe SSD" />
                <InfoRow label="GPU Array" value="8x NVIDIA RTX 4090" />
              </div>
            </div>

            {/* GPU List */}
            <div
              className="rounded-[10px] p-4 mb-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <h3 className="text-[13px] font-semibold mb-3" style={{ color: '#E8E8F0' }}>
                GPUs
              </h3>
              <div className="space-y-1">
                {[
                  { id: 0, name: 'NVIDIA RTX 4090 FE', vram: '24GB', temp: 62 },
                  { id: 1, name: 'NVIDIA RTX 4090 FE', vram: '24GB', temp: 64 },
                  { id: 2, name: 'NVIDIA RTX 4090 FE', vram: '24GB', temp: 61 },
                  { id: 3, name: 'NVIDIA RTX 4090 FE', vram: '24GB', temp: 63 },
                  { id: 4, name: 'NVIDIA RTX 4080', vram: '16GB', temp: 58 },
                  { id: 5, name: 'NVIDIA RTX 4080', vram: '16GB', temp: 59 },
                  { id: 6, name: 'NVIDIA RTX 3090', vram: '24GB', temp: 71 },
                  { id: 7, name: 'NVIDIA RTX 3090', vram: '24GB', temp: 73 },
                ].map((gpu) => (
                  <div key={gpu.id} className="flex items-center gap-2 text-[12px]">
                    <GpuIcon />
                    <span className="w-6 text-right" style={{ color: '#555570' }}>
                      #{gpu.id}
                    </span>
                    <span className="flex-1" style={{ color: '#E8E8F0' }}>
                      {gpu.name}
                    </span>
                    <span style={{ color: '#8A8AA3' }}>{gpu.vram}</span>
                    <span style={{ color: gpu.temp > 70 ? '#FFB020' : '#00E5A0' }}>{gpu.temp}°C</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Uptime */}
            <div
              className="rounded-[10px] p-4 mb-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-semibold" style={{ color: '#E8E8F0' }}>
                    System Uptime
                  </h3>
                  <p className="text-[12px] mt-1" style={{ color: '#8A8AA3' }}>
                    {uptime.days} days, {uptime.hours} hours, {uptime.mins} minutes
                  </p>
                </div>
                <ClockIcon />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                className="flex items-center gap-2 rounded-[6px] px-4 py-2 text-[13px] transition-colors duration-150"
                style={{ backgroundColor: '#1C1C26', border: '1px solid #2A2A3A', color: '#E8E8F0' }}
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
              >
                {checkingUpdate ? (
                  <RefreshCw size={14} color="#00E5A0" className="animate-spin" />
                ) : (
                  <RefreshCw size={14} color="#8A8AA3" />
                )}
                Check for Updates
              </button>
            </div>

            {updateStatus && (
              <p className="text-center text-[12px] mt-3" style={{ color: '#00E5A0' }}>
                {updateStatus}
              </p>
            )}

            {/* Legal */}
            <div className="mt-6 text-center">
              <p className="text-[11px]" style={{ color: '#555570' }}>
                RIG.OS is free and open-source software.{' '}
                <button className="underline hover:text-[#00E5A0] transition-colors duration-150">
                  License
                </button>
                {' · '}
                <button className="underline hover:text-[#00E5A0] transition-colors duration-150">
                  Privacy Policy
                </button>
                {' · '}
                <button className="underline hover:text-[#00E5A0] transition-colors duration-150">
                  Terms of Service
                </button>
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full" style={{ backgroundColor: '#13131A' }}>
      {/* Sidebar */}
      <div
        className="shrink-0 overflow-y-auto"
        style={{
          width: 180,
          backgroundColor: 'rgba(19, 19, 26, 0.4)',
          borderRight: '1px solid #2A2A3A',
          padding: '8px 4px',
        }}
      >
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              className="w-full flex items-center gap-2.5 rounded-[6px] transition-colors duration-100 text-left"
              style={{
                height: 32,
                padding: '0 12px',
                backgroundColor: isActive ? 'rgba(0, 229, 160, 0.12)' : 'transparent',
                color: isActive ? '#00E5A0' : '#8A8AA3',
              }}
              onClick={() => setActiveCategory(cat.id)}
            >
              <Icon size={16} style={{ color: isActive ? '#00E5A0' : '#8A8AA3', minWidth: 16 }} />
              <span
                className="text-[12px] truncate"
                style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">{renderPanel()}</div>
    </div>
  );
}

// Sub-components

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px]" style={{ color: '#555570' }}>
        {label}
      </span>
      <span className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
        {value}
      </span>
    </div>
  );
}

function PasswordInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[6px] px-3 py-2 pr-9 text-[13px] outline-none"
        style={{
          backgroundColor: '#0A0A0F',
          border: '1px solid #2A2A3A',
          color: '#E8E8F0',
        }}
      />
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2"
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff size={14} color="#555570" /> : <Eye size={14} color="#555570" />}
      </button>
    </div>
  );
}

function BellIcon({ size = 18, color = '#8A8AA3' }: { size?: number; color?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function GpuIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E5A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <circle cx="15" cy="15" r="2" />
      <path d="M9 15v-2h2v-2h2V9" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8A8AA3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
