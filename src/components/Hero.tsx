import { ChevronDown, Zap } from 'lucide-react';

interface HeroProps {
  onNavigate: (section: string) => void;
}

export default function Hero({ onNavigate }: HeroProps) {
  const bars = Array.from({ length: 24 }, (_, i) => i);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden grid-bg" id="hero">
      {/* Background noise overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'repeat',
        backgroundSize: '200px'
      }} />

      {/* Animated visualizer bars */}
      <div className="absolute bottom-20 left-0 right-0 flex items-end justify-center gap-1 opacity-20 pointer-events-none">
        {bars.map((i) => (
          <div
            key={i}
            className="animate-pulse-bar"
            style={{
              width: '8px',
              background: 'var(--accent)',
              height: `${20 + Math.sin(i * 0.8) * 40 + 40}px`,
              animationDelay: `${i * 0.06}s`,
              animationDuration: `${0.6 + Math.sin(i) * 0.3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Zap size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-bold tracking-[0.4em] uppercase" style={{ color: 'var(--accent)' }}>
            THE UNDERGROUND TEKNO PLATFORM
          </span>
          <Zap size={14} style={{ color: 'var(--accent)' }} />
        </div>

        <h1 className="font-black uppercase leading-none mb-4" style={{ fontSize: 'clamp(3rem, 12vw, 9rem)', letterSpacing: '-0.02em' }}>
          <span style={{ color: 'var(--text)' }}>AUDIO</span>
          <span style={{ color: 'var(--accent)' }}>BABE</span>
        </h1>

        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-px flex-1 max-w-16" style={{ background: 'var(--border)' }} />
          <p className="text-xs font-bold tracking-[0.35em] uppercase" style={{ color: 'var(--muted)' }}>
            TEKNO EDITION
          </p>
          <div className="h-px flex-1 max-w-16" style={{ background: 'var(--border)' }} />
        </div>

        <p className="text-base mb-10 max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--muted)' }}>
          Raw. Industrial. Unrelenting. Discover the artists, labels and events
          shaping the global tekno underground.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('tracks')}
            className="px-8 py-3 text-xs font-bold tracking-[0.2em] uppercase transition-all hover:opacity-90 accent-glow"
            style={{ background: 'var(--accent)', color: '#000' }}
          >
            Explore Tracks
          </button>
          <button
            onClick={() => onNavigate('events')}
            className="px-8 py-3 text-xs font-bold tracking-[0.2em] uppercase border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            Find Events
          </button>
        </div>

        {/* Stats bar */}
        <div className="mt-16 grid grid-cols-3 gap-4 max-w-sm mx-auto">
          {[['12+', 'TRACKS'], ['6+', 'ARTISTS'], ['6+', 'EVENTS']].map(([num, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{num}</div>
              <div className="text-xs tracking-widest" style={{ color: 'var(--muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onNavigate('tracks')}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
        style={{ color: 'var(--muted)' }}
      >
        <ChevronDown size={20} />
      </button>
    </section>
  );
}
