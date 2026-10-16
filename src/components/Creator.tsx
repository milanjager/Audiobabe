import { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Square, Shuffle, Volume2, VolumeX } from 'lucide-react';
import { useAudioEngine, defaultTracks } from '../hooks/useAudioEngine';
import type { Track, VoiceParams } from '../hooks/useAudioEngine';

// ─── Knob ─────────────────────────────────────────────────────────────────────
interface KnobProps {
  value: number; // 0–1
  onChange: (v: number) => void;
  color: string;
  label: string;
  size?: number;
}

function Knob({ value, onChange, color, label, size = 36 }: KnobProps) {
  const startY = useRef(0);
  const startVal = useRef(0);
  const isDragging = useRef(false);

  const angle = -140 + value * 280;
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const rad = (a: number) => (a * Math.PI) / 180;

  const arcPath = () => {
    const startAngle = -140;
    const endAngle = angle;
    const start = {
      x: cx + r * Math.cos(rad(startAngle - 90)),
      y: cy + r * Math.sin(rad(startAngle - 90)),
    };
    const end = {
      x: cx + r * Math.cos(rad(endAngle - 90)),
      y: cy + r * Math.sin(rad(endAngle - 90)),
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const dotX = cx + (r - 3) * Math.cos(rad(angle - 90));
  const dotY = cy + (r - 3) * Math.sin(rad(angle - 90));

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = (startY.current - ev.clientY) / 120;
      onChange(Math.max(0, Math.min(1, startVal.current + delta)));
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="flex flex-col items-center gap-0.5 select-none cursor-ns-resize" onMouseDown={onMouseDown} title={`${label}: ${Math.round(value * 100)}`}>
      <svg width={size} height={size}>
        {/* Track ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2a2a" strokeWidth={3} />
        {/* Value arc */}
        <path d={arcPath()} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
        {/* Dot */}
        <circle cx={dotX} cy={dotY} r={2.5} fill={color} />
        {/* Center */}
        <circle cx={cx} cy={cy} r={3} fill="#333" />
      </svg>
      <span className="text-center leading-none" style={{ fontSize: 9, color: '#555', letterSpacing: '0.05em' }}>{label}</span>
    </div>
  );
}

// ─── Step button (multi-level velocity) ───────────────────────────────────────
const VEL_LEVELS = [0, 0.45, 0.75, 1.0];

function StepBtn({ value, onClick, isCurrent, color, groupStart }: {
  value: number;
  onClick: () => void;
  isCurrent: boolean;
  color: string;
  groupStart: boolean;
}) {
  const alpha = value > 0 ? (0.4 + value * 0.6) : 0;
  const bg = value > 0
    ? `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
    : isCurrent ? '#2a2a2a' : groupStart ? '#202020' : '#1a1a1a';

  return (
    <button
      onClick={onClick}
      className="rounded transition-all flex-1"
      style={{
        height: 28,
        minWidth: 0,
        background: bg,
        border: `1px solid ${value > 0 ? 'transparent' : isCurrent ? '#444' : groupStart ? '#252525' : '#1e1e1e'}`,
        boxShadow: isCurrent && value > 0 ? `0 0 6px ${color}66` : 'none',
        transform: isCurrent ? 'scaleY(1.15)' : 'scaleY(1)',
      }}
    />
  );
}

// ─── Presets ──────────────────────────────────────────────────────────────────
const PRESETS: Record<string, { name: string; steps: number[][] }> = {
  basic: {
    name: 'Basic',
    steps: [
      [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
      [0,0,0,0, 0,0,0,0.75, 0,0,0,0, 0,0,0,0],
      [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      [0,0,0,0.45, 0,0,0,0, 0,0,0,0.45, 0,0,0,0],
    ],
  },
  hard: {
    name: 'Hard',
    steps: [
      [1,0,0.75,0, 1,0,0.75,0, 1,0,0.75,0, 1,0,0.75,0],
      [0,0,0,0, 1,0,0,0.45, 0,0,0,0, 1,0,0.45,0],
      [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0.45],
      [0.75,0,0.75,0, 0.75,0,0.75,0, 0.75,0,0.75,0, 0.75,0,0.75,0],
      [0,0,0,0, 0,0,0,0, 0.75,0,0,0, 0,0,0,0],
      [0,0,0,0.45, 0,0,0,0, 0,0,0,0.45, 0,0,0,0],
      [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      [0.45,0,0,0, 0.45,0,0,0, 0,0,0.75,0, 0.45,0,0,0],
    ],
  },
  industrial: {
    name: 'Industrial',
    steps: [
      [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0.75],
      [0,0,0.75,0, 0,0,0,0.75, 0,0,0.75,0, 0,0,0,0.75],
      [0,0,0,0, 1,0,0,0.75, 0,0,0,0, 1,0,0.75,1],
      [1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1],
      [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
      [0.75,0,0,0, 0.75,0,0,0, 0,0,0.75,0, 0.75,0,0,0],
      [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      [1,0,0,0, 0,1,0,0, 1,0,0,0, 0,0,1,0],
    ],
  },
};

// ─── Main component ────────────────────────────────────────────────────────────
export default function Creator() {
  const [tracks, setTracks] = useState<Track[]>(defaultTracks);
  const [bpm, setBpm] = useState(145);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const engine = useAudioEngine();
  const tracksRef = useRef(tracks);
  const bpmRef = useRef(bpm);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  const cycleStep = useCallback((ti: number, si: number) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== ti) return t;
      const cur = t.steps[si];
      const idx = VEL_LEVELS.indexOf(cur);
      const next = VEL_LEVELS[(idx + 1) % VEL_LEVELS.length];
      return { ...t, steps: t.steps.map((s, j) => j === si ? next : s) };
    }));
  }, []);

  const setParam = useCallback((ti: number, key: keyof VoiceParams, val: number) => {
    setTracks(prev => prev.map((t, i) => i === ti ? { ...t, params: { ...t.params, [key]: val } } : t));
  }, []);

  const toggleMute = useCallback((ti: number) => {
    setTracks(prev => prev.map((t, i) => i === ti ? { ...t, muted: !t.muted } : t));
  }, []);

  const randomizeVoice = useCallback((ti: number) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== ti) return t;
      const steps = t.steps.map(() => {
        const r = Math.random();
        return r < 0.55 ? 0 : r < 0.7 ? 0.45 : r < 0.85 ? 0.75 : 1.0;
      });
      const params: VoiceParams = {
        tune: Math.random(),
        decay: Math.random(),
        tone: Math.random(),
        level: 0.6 + Math.random() * 0.4,
      };
      return { ...t, steps, params };
    }));
  }, []);

  const randomizeAll = useCallback(() => {
    setTracks(prev => prev.map(t => {
      const steps = t.steps.map(() => {
        const r = Math.random();
        return r < 0.55 ? 0 : r < 0.7 ? 0.45 : r < 0.85 ? 0.75 : 1.0;
      });
      return { ...t, steps };
    }));
  }, []);

  const loadPreset = useCallback((key: string) => {
    const p = PRESETS[key];
    if (!p) return;
    setTracks(prev => prev.map((t, i) => ({
      ...t,
      steps: (p.steps[i] ?? Array(16).fill(0)) as number[],
    })));
  }, []);

  const clearAll = useCallback(() => {
    setTracks(prev => prev.map(t => ({ ...t, steps: Array(16).fill(0) })));
  }, []);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
      setCurrentStep(-1);
    } else {
      setIsPlaying(true);
      engine.start(
        () => ({ tracks: tracksRef.current, bpm: bpmRef.current }),
        step => setCurrentStep(step),
      );
    }
  }, [isPlaying, engine]);

  const handlePreview = useCallback((ti: number) => {
    const t = tracksRef.current[ti];
    engine.preview(t.id, t.params);
  }, [engine]);

  return (
    <section id="studio" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold tracking-widest mb-2 block" style={{ color: '#4a6cf7' }}>STUDIO</span>
            <h2 className="text-3xl font-black text-white">Drum Synth</h2>
            <p className="mt-1 text-sm" style={{ color: '#555' }}>
              8 synthesized voices · velocity-sensitive steps · 18 synthesis parameters
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button key={key} onClick={() => loadPreset(key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: '#222', color: '#888', border: '1px solid #2a2a2a' }}>
                {p.name}
              </button>
            ))}
            <button onClick={randomizeAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: '#222', color: '#888', border: '1px solid #2a2a2a' }}>
              <Shuffle size={11} /> Randomize
            </button>
            <button onClick={clearAll}
              className="px-3 py-1.5 rounded-lg text-xs transition-colors hover:text-white"
              style={{ color: '#555' }}>
              Clear
            </button>
          </div>
        </div>

        {/* Plugin body */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#111', border: '1px solid #222' }}>

          {/* Voice modules row */}
          <div className="grid border-b" style={{ gridTemplateColumns: `repeat(${tracks.length}, 1fr)`, borderColor: '#1e1e1e' }}>
            {tracks.map((t, ti) => (
              <div key={t.id}
                className="flex flex-col items-center py-4 px-2 gap-3"
                style={{ borderRight: ti < tracks.length - 1 ? '1px solid #1e1e1e' : 'none' }}>

                {/* Label + mute */}
                <div className="flex flex-col items-center gap-1 w-full">
                  <button
                    onClick={() => handlePreview(ti)}
                    className="text-xs font-black tracking-widest transition-opacity hover:opacity-80"
                    style={{ color: t.muted ? '#333' : t.color, fontSize: 10 }}>
                    {t.label}
                  </button>
                  <button
                    onClick={() => toggleMute(ti)}
                    className="rounded transition-colors"
                    style={{ color: t.muted ? '#e63946' : '#333', padding: 2 }}
                    title={t.muted ? 'Unmute' : 'Mute'}>
                    {t.muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                  </button>
                </div>

                {/* Knobs */}
                <div className="flex flex-col gap-2 items-center">
                  <Knob value={t.params.tune}  onChange={v => setParam(ti, 'tune', v)}  color={t.color} label="TUNE"  />
                  <Knob value={t.params.decay} onChange={v => setParam(ti, 'decay', v)} color={t.color} label="DECAY" />
                  <Knob value={t.params.tone}  onChange={v => setParam(ti, 'tone', v)}  color={t.color} label="TONE"  />
                  <Knob value={t.params.level} onChange={v => setParam(ti, 'level', v)} color={t.color} label="LEVEL" />
                </div>

                {/* Dice randomize */}
                <button
                  onClick={() => randomizeVoice(ti)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors hover:opacity-80"
                  style={{ background: '#1a1a1a', color: '#555', border: '1px solid #252525' }}
                  title="Randomize this voice">
                  <Shuffle size={9} />
                </button>

                {/* Active indicator */}
                <div className="rounded-full" style={{
                  width: 6, height: 6,
                  background: t.steps.some(s => s > 0) ? t.color : '#222',
                  boxShadow: t.steps.some(s => s > 0) ? `0 0 4px ${t.color}` : 'none',
                }} />
              </div>
            ))}
          </div>

          {/* Sequencer grid */}
          <div className="px-4 py-3">
            {/* Beat numbers */}
            <div className="flex mb-1" style={{ gap: 3, paddingLeft: 2 }}>
              {Array.from({ length: 16 }, (_, i) => (
                <div key={i} className="flex-1 text-center font-mono"
                  style={{ fontSize: 9, color: i % 4 === 0 ? '#444' : '#222', minWidth: 0 }}>
                  {i % 4 === 0 ? i + 1 : ''}
                </div>
              ))}
            </div>

            {/* Track rows */}
            <div className="flex flex-col gap-1">
              {tracks.map((t, ti) => (
                <div key={t.id} className="flex" style={{ gap: 3 }}>
                  {t.steps.map((vel, si) => (
                    <StepBtn
                      key={si}
                      value={vel}
                      onClick={() => cycleStep(ti, si)}
                      isCurrent={isPlaying && si === currentStep}
                      color={t.color}
                      groupStart={si % 4 === 0}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Transport */}
          <div className="flex items-center gap-5 px-4 py-3 border-t" style={{ borderColor: '#1a1a1a', background: '#0d0d0d' }}>
            {/* Play/Stop */}
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all"
              style={{ background: isPlaying ? '#e63946' : '#4a6cf7', color: '#fff', flexShrink: 0 }}>
              {isPlaying
                ? <><Square size={13} fill="currentColor" /> Stop</>
                : <><Play size={13} fill="currentColor" /> Play</>}
            </button>

            {/* BPM */}
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white text-sm w-8">{bpm}</span>
              <span className="text-xs" style={{ color: '#444' }}>BPM</span>
              <input type="range" min={100} max={180} step={1} value={bpm}
                onChange={e => setBpm(parseInt(e.target.value))}
                className="w-28" style={{ accentColor: '#4a6cf7' }} />
            </div>

            {/* Step dots */}
            <div className="flex gap-0.5 ml-auto">
              {Array.from({ length: 16 }, (_, i) => (
                <div key={i} className="rounded-full transition-all"
                  style={{
                    width: i % 4 === 0 ? 7 : 5,
                    height: i % 4 === 0 ? 7 : 5,
                    background: isPlaying && i === currentStep ? '#4a6cf7' : i % 4 === 0 ? '#2a2a2a' : '#1a1a1a',
                    boxShadow: isPlaying && i === currentStep ? '0 0 5px #4a6cf7' : 'none',
                  }} />
              ))}
            </div>

            {/* Velocity legend */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
              <span className="text-xs" style={{ color: '#333' }}>VEL</span>
              {[['soft', '#ffffff44'], ['med', '#ffffff99'], ['full', '#ffffff']].map(([l, c]) => (
                <div key={l} className="flex items-center gap-1">
                  <div className="rounded-sm w-3 h-3" style={{ background: c }} />
                  <span style={{ fontSize: 9, color: '#444' }}>{l}</span>
                </div>
              ))}
              <span style={{ fontSize: 9, color: '#333', marginLeft: 4 }}>← click to cycle</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
