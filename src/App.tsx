import { useState, useCallback, useEffect, useRef } from 'react';
import PromoBar from './components/PromoBar';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ReleasesGrid from './components/ReleasesGrid';
import Creator from './components/Creator';
import ElectribeSynth from './components/ElectribeSynth';
import KorgSynth from './components/KorgSynth';
import NeuralSequencer from './components/NeuralSequencer';
import Testimonials from './components/Testimonials';
import Press from './components/Press';
import About from './components/About';
import Footer from './components/Footer';
import CartPanel from './components/CartPanel';
import { releases, testimonials, pressItems } from './data/releases';
import type { Release } from './data/releases';

interface CartItem { release: Release; qty: number; }

// ─── PatchCable — animated signal route between machines ──────────────────────
function PatchCable({
  from, to, color, eventName, direction,
}: {
  from: string; to: string; color: string; eventName: string; direction: 'down' | 'up';
}) {
  const [flash, setFlash] = useState(0); // increments on each event
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dotPos, setDotPos] = useState(-1);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    const handler = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setFlash(f => f + 1);
      startTimeRef.current = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const t = Math.min(elapsed / 600, 1);
        setDotPos(t);
        if (t < 1) frameRef.current = requestAnimationFrame(animate);
        else { setDotPos(-1); timerRef.current = setTimeout(() => setFlash(0), 200); }
      };
      frameRef.current = requestAnimationFrame(animate);
    };
    window.addEventListener(eventName, handler);
    return () => {
      window.removeEventListener(eventName, handler);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [eventName]);

  const isActive = flash > 0;
  const dotPercent = direction === 'down' ? dotPos : 1 - dotPos;

  return (
    <div style={{
      background: '#0c0c0e',
      borderTop: `1px solid #1a1a22`,
      borderBottom: `1px solid #1a1a22`,
      padding: '10px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* From label */}
      <div style={{
        position: 'absolute', left: 24,
        fontSize: 9, letterSpacing: '0.15em',
        color: isActive ? color : '#333',
        fontWeight: 600, textTransform: 'uppercase',
        transition: 'color 0.15s',
      }}>{from}</div>

      {/* Cable visualization */}
      <div style={{ width: '60%', maxWidth: 500, position: 'relative', height: 20 }}>
        <svg width="100%" height="20" style={{ overflow: 'visible' }}>
          {/* Dashed base cable */}
          <line x1="0" y1="10" x2="100%" y2="10"
            stroke={isActive ? color + '44' : '#1e1e28'}
            strokeWidth={2}
            strokeDasharray={isActive ? 'none' : '4 4'}
            style={{ transition: 'stroke 0.3s' }}
          />
          {/* Active glow cable */}
          {isActive && (
            <line x1="0" y1="10" x2="100%" y2="10"
              stroke={color}
              strokeWidth={1.5}
              opacity={0.6}
            />
          )}
          {/* Traveling signal dot */}
          {dotPos >= 0 && (
            <circle
              cx={`${dotPercent * 100}%`} cy="10" r={4}
              fill={color}
              style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            />
          )}
          {/* Beat markers */}
          {[0, 25, 50, 75, 100].map(pct => (
            <circle key={pct} cx={`${pct}%`} cy="10" r={2}
              fill={isActive ? color + '88' : '#2a2a35'}
              style={{ transition: 'fill 0.3s' }}
            />
          ))}
        </svg>
        {/* Route label centered */}
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: isActive ? color : '#2a2a35',
          fontWeight: 700,
          transition: 'color 0.3s',
          whiteSpace: 'nowrap',
        }}>
          {direction === 'down' ? '↓' : '↑'} {from} → {to}
        </div>
      </div>

      {/* To label */}
      <div style={{
        position: 'absolute', right: 24,
        fontSize: 9, letterSpacing: '0.15em',
        color: isActive ? color : '#333',
        fontWeight: 600, textTransform: 'uppercase',
        transition: 'color 0.15s',
      }}>{to}</div>
    </div>
  );
}

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((id: string) => {
    const release = releases.find(r => r.id === id);
    if (!release) return;
    setCartItems(prev => {
      const existing = prev.find(i => i.release.id === id);
      if (existing) return prev.map(i => i.release.id === id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { release, qty: 1 }];
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems(prev => prev.filter(i => i.release.id !== id));
  }, []);

  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div style={{ background: '#141414', minHeight: '100vh' }}>
      <PromoBar />
      <Navbar cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />

      <main>
        <Hero onAddToCart={addToCart} />
        <ReleasesGrid releases={releases} onAddToCart={addToCart} />

        {/* Neural Sequencer — probability step sequencer with motion control */}
        <NeuralSequencer />

        {/* Patch route: Neural Seq → Electribe 2 (sync) */}
        <PatchCable
          from="NEURAL SEQ" to="ELECTRIBE 2" color="#a855f7"
          eventName="audiobabe:drum" direction="down"
        />

        {/* Tekno drum synthesizer */}
        <Creator />

        {/* Patch route: Electribe 2 → Tekno (drum triggers) */}
        <PatchCable
          from="ELECTRIBE 2" to="TEKNO" color="#ea580c"
          eventName="audiobabe:drum" direction="up"
        />

        {/* Korg Electribe 2 groovebox — master sequencer */}
        <ElectribeSynth />

        {/* Patch route: Electribe 2 → Monologue (note triggers) */}
        <PatchCable
          from="ELECTRIBE 2" to="MONOLOGUE" color="#06b6d4"
          eventName="audiobabe:note" direction="down"
        />

        {/* Korg Monologue synthesizer */}
        <KorgSynth />

        <Testimonials testimonials={testimonials} />
        <Press items={pressItems} />
        <About />
        <Footer />
      </main>

      <CartPanel
        open={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
      />
    </div>
  );
}
