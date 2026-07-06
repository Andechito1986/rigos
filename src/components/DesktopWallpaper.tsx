import { useEffect, useMemo } from 'react';
import { useOSStore } from '@/store/osStore';
import { motion, AnimatePresence } from 'framer-motion';

// Floating particle component - isolated for performance
const FloatingParticles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 2,
      duration: 20 + Math.random() * 20,
      delay: Math.random() * 20,
      opacity: 0.05 + Math.random() * 0.1,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: '#00E5A0',
            opacity: p.opacity,
            animation: `particleDrift ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes particleDrift {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: var(--particle-opacity, 0.1); }
          90% { opacity: var(--particle-opacity, 0.1); }
          100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// Boot sequence component
const BootSequence = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  const bootLines = [
    '[ OK ] Initializing RIG.OS kernel 6.8.0-rig',
    '[ OK ] Loading GPU drivers (nvidia, amdgpu)',
    '[ OK ] Mounting /dev/rig-storage',
    '[ OK ] Starting RIG mining pool services',
    '[ OK ] Detecting 847 available GPU units',
    '[ OK ] Starting compute rental marketplace',
    '[ OK ] All systems operational',
  ];

  useEffect(() => {
    let cancelled = false;
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return p + (100 / 2500) * 50;
      });
    }, 50);

    let lineDelay = 800;
    bootLines.forEach((line) => {
      const randomDelay = lineDelay + Math.random() * 300;
      setTimeout(() => {
        if (!cancelled) setLines((prev) => [...prev, line]);
      }, randomDelay);
      lineDelay += 350 + Math.random() * 200;
    });

    const totalBootTime = lineDelay + 600;
    setTimeout(() => {
      if (!cancelled) {
        setFading(true);
        setTimeout(() => {
          if (!cancelled) {
            setVisible(false);
            onComplete();
          }
        }, 400);
      }
    }, totalBootTime);

    return () => {
      cancelled = true;
      clearInterval(progressInterval);
    };
  }, []);

  if (!visible) return null;

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#0A0A0F', zIndex: 3000 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Boot Logo */}
      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="14" width="40" height="20" rx="3" fill="#1C1C26" stroke="#00E5A0" strokeWidth="1.5" />
            <circle cx="14" cy="24" r="5" fill="#13131A" stroke="#00E5A0" strokeWidth="1" />
            <circle cx="14" cy="24" r="2" fill="#00E5A0" opacity="0.6" />
            <circle cx="34" cy="24" r="5" fill="#13131A" stroke="#00E5A0" strokeWidth="1" />
            <circle cx="34" cy="24" r="2" fill="#00E5A0" opacity="0.6" />
          </svg>
          <span className="text-2xl font-bold tracking-wider" style={{ color: '#E8E8F0', fontFamily: "'Space Grotesk', sans-serif" }}>
            RIG.OS
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="w-[200px] h-[2px] mt-4"
          style={{ backgroundColor: '#1A1A2E' }}
        >
          <motion.div
            className="h-full"
            style={{ backgroundColor: '#00E5A0' }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
      </motion.div>

      {/* Boot text */}
      <div className="mt-6 w-[420px]">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            className="text-[11px] font-mono leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <span style={{ color: '#00E5A0' }}>[ OK ]</span>
            <span style={{ color: '#8A8AA3' }}> {line.slice(7)}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// Need to import useState for BootSequence
import { useState } from 'react';

export default function DesktopWallpaper() {
  const { isBooting, setBooting, currentWallpaper } = useOSStore();

  const handleBootComplete = () => {
    setBooting(false);
  };

  return (
    <>
      {/* Boot Sequence Overlay */}
      <AnimatePresence>
        {isBooting && <BootSequence onComplete={handleBootComplete} />}
      </AnimatePresence>

      {/* Wallpaper */}
      <motion.div
        className="fixed inset-0"
        style={{ zIndex: 0 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isBooting ? 0 : 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Base wallpaper image */}
        <img
          src={currentWallpaper}
          alt="Desktop wallpaper"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
          }}
        />

        {/* Floating particles */}
        <FloatingParticles />
      </motion.div>
    </>
  );
}
