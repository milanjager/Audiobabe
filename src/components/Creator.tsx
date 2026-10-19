import { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Square, RotateCcw, Shuffle, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { useAudioEngine, defaultVoices, VOICE_PARAM_LABELS, EFFECTS_LABELS } from '../hooks/useAudioEngine';
import type { Voice, SynthParams, SynthType } from '../hooks/useAudioEngine';

// ─── Hex geometry ─────────────────────────────────────────────────────────────
const HEX_W = 104;
const HEX_H = HEX_W * (Math.sqrt(3) / 2); // ≈90
const COL_STEP = HEX_W * 0.75;             // ≈78
const ODD_OFFSET = HEX_H / 2;              // ≈45

function hexTop(col: number, row: number) {
  return row * HEX_H + (col % 2 === 1 ? ODD_OFFSET : 0);
}
function hexLeft(col: number) {
  return col * COL_STEP;
}
const NUM_COLS = 6;
const NUM_ROWS = 3;
const GRID_W = (NUM_COLS - 1) * COL_STEP + HEX_W;
const GRID_H = (NUM_ROWS - 1) * HEX_H + ODD_OFFSET + HEX_H;

// ─── Waveform illustrations per synth type ─────────────────────────────────────
const WAVE_PATHS: Record<SynthType, string> = {
  kick:    'M2,10 C8,-8 18,-12 24,0 C30,12 44,13 62,13',
  snare:   'M2,0 L6,-9 10,8 14,-8 18,7 22,-7 26,8 30,-8 34,6 38,-6 42,7 46,-7 50,6 54,-5 58,4 62,-2',
  hat_c:   'M2,2 L5,-5 7,5 9,-5 11,5 13,-5 15,5 17,-5 19,5 21,-5 23,5 25,-4 28,4 30,-5 33,5 36,-4 39,4 42,-5 45,5 48,-4 51,4 54,-5 57,4 60,-3',
  hat_o:   'M2,2 L5,-7 8,6 11,-7 14,7 17,-6 20,8 23,-7 26,7 29,-6 33,7 37,-5 42,5 47,-4 52,4 57,-3 62,2',
  tom:     'M2,5 C14,-16 24,-16 32,0 C40,16 52,14 62,5',
  clap:    'M2,0 L8,-14 11,10 14,-11 17,8 20,-9 23,7 26,-6 29,5 32,-4 35,3 38,-2 42,2 52,0 62,0',
  rimshot: 'M2,0 L6,-18 8,14 10,-14 12,10 15,0 62,0',
  conga:   'M2,4 C12,-16 22,-16 32,0 C42,16 52,12 62,4',
  ride:    'M2,3 L5,-4 8,5 11,-4 15,5 19,-4 23,5 27,-3 31,4 35,-4 39,4 43,-3 47,4 51,-3 55,4 59,-2 62,2',
  tonal:   'M2,0 C12,-14 22,-14 32,0 C42,14 52,14 62,0',
  cowbell: 'M2,4 C8,-8 12,8 18,-8 C24,8 30,-8 36,8 C42,-8 48,8 54,-6 62,0',
  block:   'M4,-12 L4,12 L8,12 L8,-12 M14,-12 L14,8 L18,8 L18,-12 M24,-12 L24,12',
  crash:   'M2,0 L6,-16 9,12 13,-14 17,11 21,-12 25,10 30,-10 35,8 40,-7 45,5 50,-4 55,3 59,-2 62,0',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function HexPad({ voice, selected, active, onClick }: {
  voice: Voice; selected: boolean; active: boolean; onClick: () => void;
}) {
  const clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
  const path = WAVE_PATHS[voice.synthType];

  return (
    <div
      className="absolute cursor-pointer group"
      style={{ width: HEX_W, height: HEX_H, top: hexTop(voice.col, voice.row), left: hexLeft(voice.col) }}
      onClick={onClick}
    >
      {/* Hex shape */}
      <div
        className="w-full h-full flex flex-col items-center justify-center relative transition-all duration-150"
        style={{
          clipPath,
          background: selected ? `${voice.color}18` : active ? `${voice.color}10` : '#1e1e26',
          outline: `2px solid ${selected ? voice.color : voice.muted ? '#333' : voice.color + '60'}`,
          outlineOffset: selected ? -2 : -3,
          filter: selected ? `drop-shadow(0 0 6px ${voice.color}66)` : 'none',
        }}
      >
        {/* Pencil icon */}
        <div className="absolute top-1.5 left-4 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: voice.color }}>
          <Pencil size={9} />
        </div>

        {/* Waveform SVG */}
        <svg viewBox="0 0 64 20" width="55%" height="40%" preserveAspectRatio="none" style={{ opacity: selected ? 0.9 : 0.55 }}>
          <path
            d={path}
            fill="none"
            stroke={voice.color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Label below hex */}
      <div
        className="absolute w-full text-center text-xs font-medium tracking-wide"
        style={{
          bottom: -18,
          fontSize: 10,
          color: selected ? voice.color : voice.muted ? '#444' : '#777',
          letterSpacing: '0.06em',
        }}
      >
        {voice.label}
      </div>
    </div>
  );
}

// Vertical slider with fill from bottom
function VertSlider({ value, onChange, label, color = '#3b82f6', trackH = 88 }: {
  value: number; onChange: (v: number) => void; label: string; color?: string; trackH?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    const rect = trackRef.current!.getBoundingClientRect();
    const update = (clientY: number) => {
      const ratio = 1 - (clientY - rect.top) / rect.height;
      onChange(Math.max(0, Math.min(1, ratio)));
    };
    update(e.clientY);
    const onMove = (ev: MouseEvent) => { if (isDragging.current) update(ev.clientY); };
    const onUp = () => { isDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="flex flex-col items-center gap-1.5 select-none" style={{ width: 32 }}>
      <div
        ref={trackRef}
        className="relative w-3 rounded-full cursor-ns-resize"
        style={{ height: trackH, background: '#2a2a35' }}
        onMouseDown={handleMouseDown}
      >
        {/* Fill */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{ height: `${value * 100}%`, background: `linear-gradient(to top, ${color}, ${color}99)` }}
        />
        {/* Handle */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            bottom: `calc(${value * 100}% - 6px)`,
            width: 14, height: 5,
            background: '#d1d5db',
            boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
          }}
        />
      </div>
      <span className="text-center uppercase" style={{ fontSize: 9, color: '#555', letterSpacing: '0.05em', lineHeight: 1.2 }}>
        {label}
      </span>
    </div>
  );
}

// Circular dial
function Dial({ value, onChange, size = 56, label, color = '#3b82f6' }: {
  value: number; onChange: (v: number) => void; size?: number; label?: string; color?: string;
}) {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const angle = -135 + value * 270;
  const r = size / 2 - 5;
  const cx = size / 2;
  const cy = size / 2;
  const rad = (a: number) => (a * Math.PI) / 180;

  const arcPath = () => {
    const startA = -135, endA = angle;
    const sx = cx + r * Math.cos(rad(startA - 90)), sy = cy + r * Math.sin(rad(startA - 90));
    const ex = cx + r * Math.cos(rad(endA - 90)), ey = cy + r * Math.sin(rad(endA - 90));
    const large = endA - startA > 180 ? 1 : 0;
    return `M${sx},${sy} A${r},${r} 0 ${large} 1 ${ex},${ey}`;
  };

  const dotX = cx + (r + 1) * Math.cos(rad(angle - 90));
  const dotY = cy + (r + 1) * Math.sin(rad(angle - 90));

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      onChange(Math.max(0, Math.min(1, startVal.current + (startY.current - ev.clientY) / 100)));
    };
    const onUp = () => { isDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="flex flex-col items-center gap-1 cursor-ns-resize select-none" onMouseDown={onMouseDown}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e1e2a" strokeWidth={4} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2a38" strokeWidth={3} />
        <path d={arcPath()} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={r - 6} fill="#1a1a24" />
        <circle cx={dotX} cy={dotY} r={3} fill={color} />
      </svg>
      {label && <span style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>}
    </div>
  );
}

// Step button
function StepBtn({ value, active, onClick, color }: { value: number; active: boolean; onClick: () => void; color: string }) {
  const VEL = [0, 0.45, 0.75, 1.0];
  const bg = value === 0 ? (active ? '#2a2a3a' : '#1c1c26') : `${color}${Math.round((0.4 + value * 0.6) * 255).toString(16).padStart(2, '0')}`;
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded transition-all"
      style={{
        height: 28, minWidth: 0,
        background: bg,
        border: `1px solid ${value > 0 ? 'transparent' : active ? '#333' : '#1e1e2a'}`,
        boxShadow: active && value > 0 ? `0 0 5px ${color}55` : 'none',
        transform: active ? 'scaleY(1.1)' : 'scale(1)',
      }}
      title={`Velocity: ${['Off','Soft','Mid','Full'][VEL.indexOf(value)]}`}
    />
  );
}

// ─── Presets ────────────────────────────────────────────────────────────────────
const PRESETS: Record<string, { name: string; steps: Record<string, number[]> }> = {
  'Massive Analog Drums': {
    name: 'Massive Analog Drums',
    steps: {
      kick_a:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      snare_a: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat_a:   [0.75,0,0.75,0, 0.75,0,0.75,0, 0.75,0,0.75,0, 0.75,0,0.75,0],
      hat_op:  [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1],
      clap:    [0,0,0,0, 0.75,0,0,0, 0,0,0,0, 0.75,0,0,0.45],
    },
  },
  'Hard Tekno': {
    name: 'Hard Tekno',
    steps: {
      kick_a:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      kick_b:  [0,0,0,1, 0,0,0,1, 0,0,0,1, 0,0,0,1],
      snare_b: [0,0,0,0, 1,0,0,0.45, 0,0,0,0, 1,0,0.45,0],
      hat_a:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      hat_op:  [0,0,0,0, 0,0,0.75,0, 0,0,0,0, 0,0,0.75,0],
      rimshot: [0,0.45,0,0, 0,0.45,0,0, 0,0.45,0,0, 0,0.45,0,0.75],
    },
  },
  'Industrial': {
    name: 'Industrial',
    steps: {
      kick_a:  [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0.75],
      snare_a: [0,0,0.75,0, 0,0,0,0.75, 0,0,0.75,0, 0,0,0,0.75],
      clap:    [0,0,0,0, 1,0,0,0.75, 0,0,0,0, 1,0,0.75,1],
      hat_b:   [1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1],
      crash:   [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      cowbell: [0,0,0.45,0, 0,0,0.45,0, 0,0,0.45,0, 0,0.75,0,0.45],
    },
  },
};

// ─── Main component ────────────────────────────────────────────────────────────
export default function Creator() {
  const [voices, setVoices] = useState<Voice[]>(defaultVoices);
  const [selectedId, setSelectedId] = useState('kick_a');
  const [bpm, setBpm] = useState(145);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [view, setView] = useState<'pads' | 'seq'>('pads');
  const [presetName, setPresetName] = useState('Massive Analog Drums');
  const [activeBottomLeft, setActiveBottomLeft] = useState<'synth' | 'fx'>('synth');
  const [masterCutoff, setMasterCutoff] = useState(0.7);
  const [masterComp, setMasterComp] = useState(0.3);
  const [masterLevel, setMasterLevel] = useState(0.85);

  const engine = useAudioEngine();
  const voicesRef = useRef(voices);
  const bpmRef = useRef(bpm);
  useEffect(() => { voicesRef.current = voices; }, [voices]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  // Bridge: receive drum triggers from Electribe 2 via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const { drumVoice, velocity } = (e as CustomEvent<{ drumVoice: SynthType; velocity: number }>).detail;
      const voice = voicesRef.current.find(v => v.synthType === drumVoice) ?? voicesRef.current[0];
      if (voice) engine.preview({ ...voice, params: { ...voice.params, level: voice.params.level * velocity } });
    };
    window.addEventListener('audiobabe:drum', handler as EventListener);
    return () => window.removeEventListener('audiobabe:drum', handler as EventListener);
  }, [engine]);

  const selectedVoice = voices.find(v => v.id === selectedId) ?? voices[0];

  // Helpers
  const updateVoice = useCallback((id: string, updater: (v: Voice) => Voice) => {
    setVoices(prev => prev.map(v => v.id === id ? updater(v) : v));
  }, []);

  const setParam = useCallback((key: keyof SynthParams, val: number) => {
    updateVoice(selectedId, v => ({ ...v, params: { ...v.params, [key]: val } }));
  }, [selectedId, updateVoice]);

  const cycleStep = useCallback((voiceId: string, si: number) => {
    const VEL = [0, 0.45, 0.75, 1.0];
    updateVoice(voiceId, v => {
      const cur = v.steps[si];
      const idx = VEL.findIndex(x => Math.abs(x - cur) < 0.01);
      const next = VEL[(idx + 1) % VEL.length];
      return { ...v, steps: v.steps.map((s, j) => j === si ? next : s) };
    });
  }, [updateVoice]);

  const toggleMute = useCallback((id: string) => {
    updateVoice(id, v => ({ ...v, muted: !v.muted }));
  }, [updateVoice]);

  const toggleSolo = useCallback((id: string) => {
    updateVoice(id, v => ({ ...v, solo: !v.solo }));
  }, [updateVoice]);

  const randomizeVoice = useCallback((id: string) => {
    updateVoice(id, v => ({
      ...v,
      steps: v.steps.map(() => { const r = Math.random(); return r < 0.6 ? 0 : r < 0.75 ? 0.45 : r < 0.9 ? 0.75 : 1.0; }),
    }));
  }, [updateVoice]);

  const randomizeAll = useCallback(() => {
    setVoices(prev => prev.map(v => ({
      ...v,
      steps: v.steps.map(() => { const r = Math.random(); return r < 0.6 ? 0 : r < 0.75 ? 0.45 : r < 0.9 ? 0.75 : 1.0; }),
    })));
  }, []);

  const loadPreset = useCallback((name: string) => {
    const p = PRESETS[name];
    if (!p) return;
    setPresetName(name);
    setVoices(prev => prev.map(v => ({
      ...v,
      steps: p.steps[v.id] ?? Array(16).fill(0),
    })));
  }, []);

  const clearAll = useCallback(() => {
    setVoices(prev => prev.map(v => ({ ...v, steps: Array(16).fill(0) })));
  }, []);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
      setCurrentStep(-1);
    } else {
      setIsPlaying(true);
      engine.start(
        () => ({ voices: voicesRef.current, bpm: bpmRef.current }),
        s => setCurrentStep(s),
      );
    }
  }, [isPlaying, engine]);

  const navigatePreset = useCallback((dir: 1 | -1) => {
    const keys = Object.keys(PRESETS);
    const idx = keys.indexOf(presetName);
    const next = keys[(idx + dir + keys.length) % keys.length];
    loadPreset(next);
  }, [presetName, loadPreset]);

  const p = selectedVoice.params;

  return (
    <section id="studio" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <span className="text-xs font-bold tracking-widest" style={{ color: '#4a6cf7' }}>STUDIO</span>
        </div>

        {/* ── Plugin shell ── */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#15151c', border: '1px solid #222' }}>

          {/* Top toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b" style={{ background: '#111118', borderColor: '#1e1e28' }}>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {['⚙', '↺', '↻'].map((s, i) => (
                  <button key={i} className="w-6 h-6 rounded flex items-center justify-center text-xs transition-colors hover:text-white" style={{ color: '#555', background: '#1a1a22' }}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="h-4 w-px" style={{ background: '#2a2a35' }} />
              {/* Preset nav */}
              <div className="flex items-center gap-2">
                <button onClick={() => navigatePreset(-1)} className="hover:text-white transition-colors" style={{ color: '#555' }}><ChevronLeft size={14} /></button>
                <span className="text-xs font-medium" style={{ color: '#ccc', minWidth: 160, textAlign: 'center' }}>{presetName}</span>
                <button onClick={() => navigatePreset(1)} className="hover:text-white transition-colors" style={{ color: '#555' }}><ChevronRight size={14} /></button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={randomizeAll} className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:text-white" style={{ color: '#555' }}>
                <Shuffle size={11} /> Randomize
              </button>
              <button onClick={clearAll} className="px-2 py-1 rounded text-xs transition-colors hover:text-white" style={{ color: '#555' }}>
                Clear
              </button>
              <div className="h-4 w-px" style={{ background: '#2a2a35' }} />
              {/* Pads / Seq toggle */}
              {(['pads', 'seq'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                  style={{ background: view === v ? '#4a6cf7' : 'transparent', color: view === v ? '#fff' : '#555' }}>
                  {v === 'pads' ? 'Pads' : 'Seq'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Main area ── */}
          <div style={{ minHeight: 300 }}>
            {view === 'pads' ? (
              /* Hex pad view */
              <div className="flex">
                {/* Hex grid */}
                <div className="flex-1 p-6 overflow-x-auto">
                  <div className="relative mx-auto" style={{ width: GRID_W, height: GRID_H + 24 }}>
                    {voices.map(voice => (
                      <HexPad
                        key={voice.id}
                        voice={voice}
                        selected={selectedId === voice.id}
                        active={isPlaying && voice.steps[currentStep] > 0 && !voice.muted}
                        onClick={() => { setSelectedId(voice.id); engine.preview(voice); }}
                      />
                    ))}
                  </div>
                </div>

                {/* Branding panel */}
                <div className="hidden lg:flex flex-col items-end justify-between p-6 flex-shrink-0" style={{ width: 180, borderLeft: '1px solid #1e1e28' }}>
                  <div />
                  <div className="text-right">
                    <div className="font-black text-white" style={{ fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1 }}>tekno</div>
                    <div className="text-xs tracking-widest mt-0.5" style={{ color: '#555' }}>drum synthesizer</div>
                    {/* Abstract hex art */}
                    <svg width={120} height={100} className="mt-4 ml-auto opacity-20">
                      {[
                        [60, 30, 28], [32, 52, 20], [88, 52, 20],
                        [50, 72, 14], [72, 72, 14], [80, 35, 10],
                      ].map(([cx, cy, r], i) => {
                        const pts = Array.from({length:6},(_,j)=>{
                          const a=(Math.PI/3)*j-Math.PI/6;
                          return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;
                        }).join(' ');
                        const colors = ['#f59e0b','#84cc16','#06b6d4','#818cf8','#ec4899','#4ade80'];
                        return <polygon key={i} points={pts} fill="none" stroke={colors[i]} strokeWidth={1.5} />;
                      })}
                    </svg>
                    <div className="font-bold text-xs mt-3 tracking-widest" style={{ color: '#333' }}>TEKNO BABE.</div>
                  </div>
                </div>
              </div>
            ) : (
              /* Sequencer view */
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-0.5">
                    {Array.from({length:16},(_,i) => (
                      <div key={i} className="flex-1 text-center font-mono" style={{ fontSize: 9, color: i%4===0 ? '#555':'#2a2a35', minWidth: 0 }}>
                        {i%4===0 ? i+1 : ''}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {voices.map(v => (
                    <div key={v.id} className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedId(v.id); engine.preview(v); }}
                        className="flex-shrink-0 text-right text-xs font-bold tracking-wide transition-opacity hover:opacity-80"
                        style={{ width: 60, color: v.muted ? '#333' : v.color, fontSize: 9 }}>
                        {v.label}
                      </button>
                      <div className="flex flex-1 gap-0.5">
                        {v.steps.map((vel, si) => (
                          <StepBtn key={si} value={vel} active={isPlaying && si===currentStep} onClick={() => cycleStep(v.id, si)} color={v.color} />
                        ))}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => toggleMute(v.id)} className="text-xs px-1 rounded" style={{ fontSize: 9, background: v.muted ? '#e63946' : '#1e1e26', color: v.muted ? '#fff' : '#555' }}>M</button>
                        <button onClick={() => toggleSolo(v.id)} className="text-xs px-1 rounded" style={{ fontSize: 9, background: v.solo ? '#f59e0b' : '#1e1e26', color: v.solo ? '#000' : '#555' }}>S</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom control strip ── */}
          <div className="border-t grid" style={{ borderColor: '#1e1e28', gridTemplateColumns: '1fr 1fr auto 1fr' }}>

            {/* Synthesize panel */}
            <div className="p-4 border-r" style={{ borderColor: '#1e1e28' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium tracking-widest" style={{ color: '#888' }}>synthesize</span>
                </div>
                <div className="flex gap-2">
                  {(['synth','fx'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveBottomLeft(tab)}
                      className="text-xs px-2 py-0.5 rounded transition-colors"
                      style={{ background: activeBottomLeft === tab ? '#2a2a3a' : 'transparent', color: activeBottomLeft === tab ? '#aaa' : '#444' }}>
                      {tab === 'synth' ? 'synth' : 'fx'}
                    </button>
                  ))}
                  <button onClick={() => randomizeVoice(selectedId)} className="text-xs transition-colors hover:text-white" style={{ color: '#444' }} title="Randomize voice">
                    <Shuffle size={11} />
                  </button>
                </div>
              </div>

              {activeBottomLeft === 'synth' ? (() => {
                const pl = VOICE_PARAM_LABELS[selectedVoice.synthType];
                return (
                  <div className="flex gap-3 justify-center">
                    <VertSlider value={p.tone}  onChange={v => setParam('tone',v)}  label={pl[0]} color={selectedVoice.color} />
                    <VertSlider value={p.pitch} onChange={v => setParam('pitch',v)} label={pl[1]} color={selectedVoice.color} />
                    <VertSlider value={p.decay} onChange={v => setParam('decay',v)} label={pl[2]} color={selectedVoice.color} />
                    <VertSlider value={p.slap}  onChange={v => setParam('slap',v)}  label={pl[3]} color={selectedVoice.color} />
                    <VertSlider value={p.pulse} onChange={v => setParam('pulse',v)} label={pl[4]} color={selectedVoice.color} />
                  </div>
                );
              })() : (() => {
                const el = EFFECTS_LABELS[selectedVoice.synthType];
                // map effects label positions to params: [sub/dispers/ring/wash/exciter → drive], exciter, tilt/satur, satur/comp, reverb
                return (
                  <div className="flex gap-3 justify-center">
                    <VertSlider value={p.drive}   onChange={v => setParam('drive',v)}   label={el[0]} color={selectedVoice.color} />
                    <VertSlider value={p.exciter} onChange={v => setParam('exciter',v)} label={el[1]} color={selectedVoice.color} />
                    <VertSlider value={p.satur}   onChange={v => setParam('satur',v)}   label={el[2]} color={selectedVoice.color} />
                    <VertSlider value={p.comp}    onChange={v => setParam('comp',v)}    label={el[3]} color={selectedVoice.color} />
                    <VertSlider value={p.reverb}  onChange={v => setParam('reverb',v)}  label={el[4]} color={selectedVoice.color} />
                  </div>
                );
              })()}
            </div>

            {/* Voice panel */}
            <div className="p-4 border-r flex flex-col" style={{ borderColor: '#1e1e28', minWidth: 160 }}>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => { const idx = voices.findIndex(v=>v.id===selectedId); setSelectedId(voices[(idx-1+voices.length)%voices.length].id); }} style={{ color: '#444' }}><ChevronLeft size={13} /></button>
                <span className="text-xs font-bold tracking-widest text-white">{selectedVoice.label}</span>
                <button onClick={() => { const idx = voices.findIndex(v=>v.id===selectedId); setSelectedId(voices[(idx+1)%voices.length].id); }} style={{ color: '#444' }}><ChevronRight size={13} /></button>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Dial value={p.pan} onChange={v => setParam('pan', v)} size={48} label="pan" color={selectedVoice.color} />
                <VertSlider value={p.level} onChange={v => setParam('level', v)} label="level" color={selectedVoice.color} trackH={72} />
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => toggleSolo(selectedId)} className="w-7 h-5 rounded text-xs font-bold transition-colors"
                    style={{ background: selectedVoice.solo ? '#f59e0b' : '#1e1e2a', color: selectedVoice.solo ? '#000' : '#555', border: '1px solid #2a2a35', fontSize: 9 }}>S</button>
                  <button onClick={() => toggleMute(selectedId)} className="w-7 h-5 rounded text-xs font-bold transition-colors"
                    style={{ background: selectedVoice.muted ? '#e63946' : '#1e1e2a', color: selectedVoice.muted ? '#fff' : '#555', border: '1px solid #2a2a35', fontSize: 9 }}>M</button>
                </div>
                <Dial value={p.humanize} onChange={v => setParam('humanize', v)} size={48} label="human" color="#4a6cf7" />
              </div>

              <div className="flex justify-center mt-2">
                <button onClick={() => randomizeVoice(selectedId)}
                  className="text-xs px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors hover:opacity-80"
                  style={{ background: '#1e1e2a', color: '#555', border: '1px solid #2a2a35' }}>
                  <RotateCcw size={10} /> rand
                </button>
              </div>
            </div>

            {/* Master panel */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium tracking-widest" style={{ color: '#888' }}>master</span>
              </div>

              {/* Seq/Mix/Level tabs */}
              <div className="flex gap-1 mb-3 flex-wrap">
                {['seq','mix','reverb','human','master'].map(t => (
                  <button key={t} onClick={() => t === 'seq' && setView(v => v === 'seq' ? 'pads' : 'seq')}
                    className="px-2 py-0.5 rounded text-xs transition-colors"
                    style={{
                      background: (t === 'seq' && view === 'seq') ? '#4a6cf7' : '#1e1e2a',
                      color: (t === 'seq' && view === 'seq') ? '#fff' : '#555',
                      border: '1px solid #2a2a35',
                    }}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 justify-start">
                <VertSlider value={0.5}          onChange={() => {}}                        label="cal"  color="#4a6cf7" trackH={72} />
                <VertSlider value={masterCutoff} onChange={v => setMasterCutoff(v)}        label="cut"  color="#4a6cf7" trackH={72} />
                <VertSlider value={p.humanize}   onChange={v => setParam('humanize', v)}   label="hum"  color="#4a6cf7" trackH={72} />
                <VertSlider value={masterComp}   onChange={v => setMasterComp(v)}          label="lim"  color="#4a6cf7" trackH={72} />
                <VertSlider value={0.6}          onChange={() => {}}                        label="clip" color="#4a6cf7" trackH={72} />
                <VertSlider value={masterLevel}  onChange={v => setMasterLevel(v)}         label="lvl"  color="#4a6cf7" trackH={72} />
              </div>
            </div>
          </div>

          {/* Transport bar */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t" style={{ borderColor: '#1e1e28', background: '#0f0f16' }}>
            <button onClick={handlePlay}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-xs transition-all flex-shrink-0"
              style={{ background: isPlaying ? '#e63946' : '#4a6cf7', color: '#fff' }}>
              {isPlaying ? <><Square size={11} fill="currentColor" />Stop</> : <><Play size={11} fill="currentColor" />Play</>}
            </button>

            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-white">{bpm}</span>
              <span className="text-xs" style={{ color: '#444' }}>BPM</span>
              <input type="range" min={100} max={180} step={1} value={bpm}
                onChange={e => setBpm(parseInt(e.target.value))}
                className="w-24" style={{ accentColor: '#4a6cf7' }} />
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-0.5 ml-auto">
              {Array.from({length:16}, (_,i) => (
                <div key={i} className="rounded-full transition-all" style={{
                  width: i%4===0 ? 7 : 5, height: i%4===0 ? 7 : 5,
                  background: isPlaying && i===currentStep ? '#4a6cf7' : i%4===0 ? '#2a2a35' : '#1a1a22',
                  boxShadow: isPlaying && i===currentStep ? '0 0 4px #4a6cf7' : 'none',
                }} />
              ))}
            </div>

            <span className="text-xs hidden sm:block" style={{ color: '#333' }}>Click pads to preview · Seq view for step editing</span>
          </div>
        </div>
      </div>
    </section>
  );
}
