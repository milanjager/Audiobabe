import { useState, useRef, useCallback, useEffect } from 'react';
import { useNeuralEngine, ROLE_SYNTH_OPTIONS } from '../hooks/useNeuralEngine';
import type { NStep, NTrack, ScaleMode, TrackRole } from '../hooks/useNeuralEngine';

const MELODIC_ROLES = new Set<TrackRole>(['bass', 'lead', 'chord', 'fx']);

// ─── Step Pad ─────────────────────────────────────────────────────────────────

function StepPad({ step, isCurrent, trackColor, groupStart, onClick, onRightClick }: {
  step: NStep; isCurrent: boolean; trackColor: string; groupStart: boolean;
  onClick: () => void; onRightClick: (e: React.MouseEvent) => void;
}) {
  const bg = step.active && isCurrent
    ? trackColor
    : step.active
    ? trackColor + '55'
    : isCurrent
    ? '#18182a'
    : '#0b0b16';

  const glow = step.active && isCurrent
    ? `0 0 14px ${trackColor}, 0 0 28px ${trackColor}66`
    : step.active
    ? `0 0 5px ${trackColor}55`
    : isCurrent
    ? `inset 0 0 6px ${trackColor}22`
    : undefined;

  return (
    <div
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onRightClick(e); }}
      title="Click: toggle · Right-click active step: param locks"
      style={{
        width: 30, height: 30,
        position: 'relative',
        background: bg,
        border: `1px solid ${step.active ? trackColor + '77' : '#181825'}`,
        borderRadius: 5,
        cursor: 'pointer',
        flexShrink: 0,
        boxShadow: glow,
        transition: 'box-shadow 0.06s, background 0.06s, border-color 0.06s',
        marginLeft: groupStart ? 8 : 2,
      }}
    >
      {step.active && step.probability < 100 && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${step.probability}%`,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: '0 0 4px 4px',
        }} />
      )}
      {step.locked && (
        <div style={{
          position: 'absolute', top: 3, right: 3,
          width: 4, height: 4, borderRadius: '50%',
          background: '#fff', boxShadow: '0 0 4px #fff',
        }} />
      )}
      {step.active && step.condition !== 'always' && (
        <div style={{
          position: 'absolute', bottom: 2, left: 2,
          fontSize: 5, color: '#ffffff88', fontFamily: 'monospace', lineHeight: 1,
        }}>{step.condition}</div>
      )}
    </div>
  );
}

// ─── Synth Type Cycle Button ──────────────────────────────────────────────────

function SynthTypeBtn({ role, current, color, onChange }: {
  role: TrackRole; current: string; color: string; onChange: (id: string) => void;
}) {
  const opts = ROLE_SYNTH_OPTIONS[role];
  const idx = Math.max(0, opts.findIndex(o => o.id === current));
  const label = opts[idx]?.label ?? opts[0].label;

  return (
    <button
      onClick={() => onChange(opts[(idx + 1) % opts.length].id)}
      title={`Sound: ${label} — click to cycle`}
      style={{
        width: 44, height: 18, flexShrink: 0,
        background: color + '18',
        border: `1px solid ${color}44`,
        borderRadius: 3,
        color, fontSize: 7, letterSpacing: '0.1em', fontWeight: 700,
        cursor: 'pointer', padding: 0,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >{label}</button>
  );
}

// ─── Track Row ────────────────────────────────────────────────────────────────

function TrackRow({
  track, ti, currentStep, isMelodic,
  onToggleStep, onRightClickStep, onMute,
  onPitchChange, onSynthChange, onFilterChange,
  onRandomize, onClear,
}: {
  track: NTrack; ti: number; currentStep: number; isMelodic: boolean;
  onToggleStep: (si: number) => void;
  onRightClickStep: (e: React.MouseEvent, si: number) => void;
  onMute: () => void;
  onPitchChange: (delta: number) => void;
  onSynthChange: (id: string) => void;
  onFilterChange: (freq: number) => void;
  onRandomize: () => void;
  onClear: () => void;
}) {
  void ti;
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const noteName = `${NOTE_NAMES[track.rootNote % 12]}${Math.floor(track.rootNote / 12) - 1}`;
  const activeCount = track.steps.filter(s => s.active).length;
  const isOdd = MELODIC_ROLES.has(track.role) ? 0 : 1;

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '4px 0',
      borderBottom: '1px solid #0d0d18',
      background: isOdd ? '#09090f' : '#0a0a14',
      gap: 4,
    }}>
      {/* Left controls panel */}
      <div style={{ width: 136, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3, padding: '0 6px 0 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: track.muted ? '#1a1a2a' : activeCount > 0 ? track.color : '#1a1a2a',
            boxShadow: !track.muted && activeCount > 0 ? `0 0 6px ${track.color}` : 'none',
            transition: 'all 0.2s',
          }} />
          <span style={{
            fontSize: 9, letterSpacing: '0.12em', fontWeight: 700,
            color: track.muted ? '#2a2a3a' : track.color,
            textTransform: 'uppercase', flex: 1,
            transition: 'color 0.2s',
          }}>{track.name}</span>
          <button onClick={onMute} style={{
            width: 18, height: 18, flexShrink: 0,
            background: track.muted ? track.color + '22' : 'transparent',
            border: `1px solid ${track.muted ? track.color : '#222232'}`,
            borderRadius: 3, cursor: 'pointer',
            color: track.muted ? track.color : '#333344',
            fontSize: 8, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>M</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <SynthTypeBtn role={track.role} current={track.synthType} color={track.color} onChange={onSynthChange} />
          <button onClick={onRandomize} title="Randomize steps" style={{
            width: 26, height: 18, background: 'transparent',
            border: '1px solid #1e1e2e', borderRadius: 3, cursor: 'pointer',
            color: '#333', fontSize: 7, fontWeight: 700, letterSpacing: '0.05em',
            transition: 'border-color 0.15s, color 0.15s',
          }}>RND</button>
          <button onClick={onClear} title="Clear pattern" style={{
            width: 24, height: 18, background: 'transparent',
            border: '1px solid #1e1e2e', borderRadius: 3, cursor: 'pointer',
            color: '#333', fontSize: 7, fontWeight: 700, letterSpacing: '0.05em',
          }}>CLR</button>
        </div>
      </div>

      {/* Step pads */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        {track.steps.map((step, si) => (
          <StepPad
            key={si}
            step={step}
            isCurrent={currentStep === si}
            trackColor={track.color}
            groupStart={si > 0 && si % 4 === 0}
            onClick={() => onToggleStep(si)}
            onRightClick={e => onRightClickStep(e, si)}
          />
        ))}
      </div>

      {/* Right controls */}
      <div style={{ width: 100, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px 0 4px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 6, color: '#2a2a3a', letterSpacing: '0.1em', marginBottom: 2, textTransform: 'uppercase' }}>FILT</div>
          <input
            type="range"
            min={80} max={18000}
            value={track.filterFreq}
            onChange={e => onFilterChange(Number(e.target.value))}
            style={{ width: '100%', height: 12, accentColor: track.color, cursor: 'pointer', margin: 0 }}
          />
        </div>

        {isMelodic && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <button onClick={() => onPitchChange(1)} style={{
              width: 16, height: 13, background: 'transparent',
              border: '1px solid #1e1e2e', borderRadius: 2, cursor: 'pointer',
              color: '#444', fontSize: 9, lineHeight: 1, padding: 0,
            }}>+</button>
            <div style={{ fontSize: 7, color: '#444', fontFamily: 'monospace', textAlign: 'center', width: 28 }}>{noteName}</div>
            <button onClick={() => onPitchChange(-1)} style={{
              width: 16, height: 13, background: 'transparent',
              border: '1px solid #1e1e2e', borderRadius: 2, cursor: 'pointer',
              color: '#444', fontSize: 9, lineHeight: 1, padding: 0,
            }}>−</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Param Lock Editor ────────────────────────────────────────────────────────

function ParamLockEditor({ step, track, isMelodic, onUpdate, onClose, pos }: {
  step: NStep; track: NTrack; isMelodic: boolean;
  onUpdate: (p: Partial<NStep>) => void;
  onClose: () => void;
  pos: { x: number; y: number };
}) {
  const CONDITIONS: NStep['condition'][] = ['always', '1:2', '1:4', 'fill'];

  return (
    <div style={{
      position: 'fixed',
      left: Math.min(pos.x, window.innerWidth - 244),
      top: Math.min(pos.y, window.innerHeight - 290),
      zIndex: 9000,
      background: '#0c0c1a',
      border: `1px solid ${track.color}44`,
      borderRadius: 10,
      padding: '14px 16px',
      width: 234,
      boxShadow: `0 0 32px ${track.color}18, 0 14px 44px #000d`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.14em', color: track.color, fontWeight: 700 }}>◆ PARAM LOCK · {track.name}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
      </div>

      <label style={{ fontSize: 8, color: '#555', display: 'block', marginBottom: 3 }}>
        PROBABILITY <span style={{ color: '#bbb' }}>{step.probability}%</span>
      </label>
      <input type="range" min={0} max={100} value={step.probability}
        onChange={e => onUpdate({ probability: Number(e.target.value) })}
        style={{ width: '100%', marginBottom: 12, accentColor: track.color }} />

      <div style={{ fontSize: 8, color: '#555', marginBottom: 5 }}>CONDITION TRIG</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {CONDITIONS.map(c => (
          <button key={c} onClick={() => onUpdate({ condition: c })} style={{
            flex: 1, padding: '5px 0',
            background: step.condition === c ? track.color + '2a' : 'transparent',
            border: `1px solid ${step.condition === c ? track.color : '#222230'}`,
            borderRadius: 4, color: step.condition === c ? track.color : '#3a3a4a',
            fontSize: 7, cursor: 'pointer', fontWeight: 700, letterSpacing: '0.06em',
          }}>{c.toUpperCase()}</button>
        ))}
      </div>

      {isMelodic && (
        <>
          <label style={{ fontSize: 8, color: '#555', display: 'block', marginBottom: 3 }}>
            PITCH <span style={{ color: '#bbb' }}>{step.pitchOffset > 0 ? '+' : ''}{step.pitchOffset} st</span>
          </label>
          <input type="range" min={-12} max={12} value={step.pitchOffset}
            onChange={e => onUpdate({ pitchOffset: Number(e.target.value) })}
            style={{ width: '100%', marginBottom: 12, accentColor: track.color }} />
        </>
      )}

      <label style={{ fontSize: 8, color: '#555', display: 'block', marginBottom: 3 }}>
        FILTER MOD <span style={{ color: '#bbb' }}>{step.filterMod > 0 ? '+' : ''}{step.filterMod.toFixed(1)}</span>
      </label>
      <input type="range" min={-2} max={2} step={0.1} value={step.filterMod}
        onChange={e => onUpdate({ filterMod: Number(e.target.value) })}
        style={{ width: '100%', marginBottom: 12, accentColor: track.color }} />

      <label style={{ fontSize: 8, color: '#555', display: 'block', marginBottom: 3 }}>
        DECAY MOD <span style={{ color: '#bbb' }}>{step.decayMod > 0 ? '+' : ''}{step.decayMod.toFixed(1)}</span>
      </label>
      <input type="range" min={-2} max={2} step={0.1} value={step.decayMod}
        onChange={e => onUpdate({ decayMod: Number(e.target.value) })}
        style={{ width: '100%', accentColor: track.color }} />

      <button
        onClick={() => onUpdate({ pitchOffset: 0, filterMod: 0, decayMod: 0, probability: 100, condition: 'always' })}
        style={{ marginTop: 12, width: '100%', background: 'transparent', border: '1px solid #1e1e2c', borderRadius: 5, color: '#444', fontSize: 8, cursor: 'pointer', padding: '5px 0', letterSpacing: '0.08em' }}
      >RESET ALL</button>
    </div>
  );
}

// ─── Webcam Panel ─────────────────────────────────────────────────────────────

function WebcamPanel({
  active, filter, reverb, delay, onEnable, onDisable,
  videoRef, displayRef,
}: {
  active: boolean; filter: number; reverb: number; delay: number;
  onEnable: () => void; onDisable: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  displayRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const zones = [
    { label: 'FILTER', sub: 'Left hand', value: filter, color: '#f97316' },
    { label: 'REVERB', sub: 'Both hands', value: reverb, color: '#a855f7' },
    { label: 'DELAY',  sub: 'Right hand', value: delay,  color: '#06b6d4' },
  ];

  return (
    <div style={{
      width: 214, flexShrink: 0,
      background: '#07070e',
      borderLeft: '1px solid #111118',
      display: 'flex', flexDirection: 'column',
      padding: '10px 10px',
      gap: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: active ? '#22c55e' : '#1a1a2a',
            boxShadow: active ? '0 0 7px #22c55e' : 'none',
            transition: 'all 0.3s',
          }} />
          <span style={{ fontSize: 9, letterSpacing: '0.14em', color: active ? '#22c55e' : '#333', fontWeight: 700 }}>
            MOTION CTRL
          </span>
        </div>
        {active && (
          <button onClick={onDisable} style={{
            background: 'transparent', border: '1px solid #2a2a3a',
            borderRadius: 3, color: '#444', fontSize: 7, cursor: 'pointer',
            padding: '2px 6px', letterSpacing: '0.08em',
          }}>OFF</button>
        )}
      </div>

      {/* Camera view */}
      <div style={{
        width: '100%', aspectRatio: '4/3',
        background: '#040408',
        border: `1px solid ${active ? '#22c55e33' : '#0f0f18'}`,
        borderRadius: 6, overflow: 'hidden', position: 'relative',
        transition: 'border-color 0.3s',
      }}>
        {active ? (
          <>
            <canvas ref={displayRef} width={194} height={146}
              style={{ width: '100%', height: '100%', display: 'block' }} />
            {/* Zone overlays */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
              {zones.map((z, i) => (
                <div key={i} style={{
                  flex: 1,
                  borderRight: i < 2 ? `1px solid ${z.color}33` : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3,
                }}>
                  <span style={{
                    fontSize: 7, color: z.color, fontWeight: 700,
                    background: '#00000099', padding: '1px 4px', borderRadius: 2,
                    opacity: z.value > 0.04 ? 1 : 0.35, transition: 'opacity 0.2s',
                  }}>{z.label[0]}</span>
                  <div style={{
                    position: 'absolute', bottom: 0,
                    left: `${i * 33.33}%`, width: '33.33%',
                    height: `${Math.round(z.value * 100 * 0.45)}%`,
                    background: z.color + '55',
                    transition: 'height 0.06s',
                  }} />
                </div>
              ))}
            </div>
          </>
        ) : (
          // Diagram + invite
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '6px 10px',
          }}>
            {/* Zone diagram */}
            <div style={{ display: 'flex', width: '100%', height: 44, borderRadius: 5, overflow: 'hidden', flexShrink: 0 }}>
              {zones.map((z, i) => (
                <div key={i} style={{
                  flex: 1,
                  background: z.color + '12',
                  borderRight: i < 2 ? `1px solid ${z.color}22` : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                }}>
                  <span style={{ fontSize: 9, color: z.color + 'bb' }}>
                    {i === 0 ? '🤚' : i === 1 ? '✋' : '👋'}
                  </span>
                  <span style={{ fontSize: 6, color: z.color + 'aa', letterSpacing: '0.1em', fontWeight: 700 }}>{z.label[0]}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 7, color: '#333', textAlign: 'center', lineHeight: 1.7, letterSpacing: '0.06em' }}>
              MOVE HANDS IN VIEW<br/>
              <span style={{ color: '#f97316' + 'aa' }}>L</span> FILTER ·{' '}
              <span style={{ color: '#a855f7' + 'aa' }}>C</span> REVERB ·{' '}
              <span style={{ color: '#06b6d4' + 'aa' }}>R</span> DELAY
            </div>
          </div>
        )}
      </div>

      {/* Hidden video */}
      <video ref={videoRef} autoPlay muted playsInline style={{ display: 'none', width: 1, height: 1 }} />

      {active ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {zones.map((z) => (
            <div key={z.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 8, color: z.color, fontWeight: 700, letterSpacing: '0.1em' }}>{z.label}</span>
                <span style={{ fontSize: 8, fontFamily: 'monospace', color: z.value > 0.04 ? z.color : '#2a2a3a' }}>
                  {Math.round(z.value * 100)}%
                </span>
              </div>
              <div style={{ height: 6, background: '#0b0b16', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${z.value * 100}%`,
                  background: `linear-gradient(to right, ${z.color}88, ${z.color})`,
                  boxShadow: z.value > 0.08 ? `0 0 8px ${z.color}88` : 'none',
                  transition: 'width 0.06s',
                }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <button
            onClick={onEnable}
            style={{
              width: '100%', padding: '10px 0',
              background: 'linear-gradient(135deg, #22c55e18, #22c55e0a)',
              border: '1px solid #22c55e44',
              borderRadius: 6,
              color: '#22c55e', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.14em', cursor: 'pointer',
              boxShadow: '0 0 14px #22c55e0a',
              transition: 'all 0.2s',
            }}
          >◎ ACTIVATE CAMERA</button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {zones.map(z => (
              <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 3, height: 28, background: z.color + '55', borderRadius: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 8, color: z.color, fontWeight: 700, letterSpacing: '0.1em' }}>{z.label}</div>
                  <div style={{ fontSize: 7, color: '#2e2e3e', letterSpacing: '0.06em', marginTop: 1 }}>{z.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            fontSize: 7, color: '#1e1e2e', lineHeight: 1.7,
            letterSpacing: '0.06em', borderTop: '1px solid #111118',
            paddingTop: 6,
          }}>
            Webcam detects motion in 3<br/>
            horizontal zones. Each zone<br/>
            modulates an FX parameter.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SCALE_OPTIONS: { key: number; mode: ScaleMode; label: string }[] = [
  { key: 9,  mode: 'phrygian',   label: 'A PHRY'  },
  { key: 9,  mode: 'minor',      label: 'A MIN'   },
  { key: 9,  mode: 'pentatonic', label: 'A PENT'  },
  { key: 0,  mode: 'minor',      label: 'C MIN'   },
  { key: 5,  mode: 'phrygian',   label: 'F PHRY'  },
  { key: 7,  mode: 'minor',      label: 'G MIN'   },
];

export default function NeuralSequencer() {
  const { state, start, stop, toggleStep, updateStep, updateTrack, updateMeta, randomize, clearTrack } = useNeuralEngine();

  const [scaleIdx, setScaleIdx] = useState(0);
  const [lockTarget, setLockTarget] = useState<{ ti: number; si: number; pos: { x: number; y: number } } | null>(null);
  const [bpmInput, setBpmInput] = useState(String(state.bpm));

  const videoRef   = useRef<HTMLVideoElement>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);
  const procRef    = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const rafRef     = useRef<number | null>(null);
  const smoothRef  = useRef({ filter: 0, reverb: 0, delay: 0 });

  const handleScaleChange = (idx: number) => {
    setScaleIdx(idx);
    const opt = SCALE_OPTIONS[idx];
    updateMeta({ scaleKey: opt.key, scaleMode: opt.mode });
  };

  const handleBpmChange = (delta: number) => {
    const next = Math.max(60, Math.min(200, state.bpm + delta));
    updateMeta({ bpm: next });
    setBpmInput(String(next));
  };

  const handleBpmBlur = (v: string) => {
    const parsed = parseInt(v);
    const safe = isNaN(parsed) ? state.bpm : Math.max(60, Math.min(200, parsed));
    updateMeta({ bpm: safe });
    setBpmInput(String(safe));
  };

  const handleRightClickStep = (e: React.MouseEvent, ti: number, si: number) => {
    if (!state.tracks[ti].steps[si].active) return;
    setLockTarget({ ti, si, pos: { x: e.clientX + 8, y: e.clientY + 8 } });
  };

  // ── Webcam processing ──
  const startWebcamLoop = useCallback(() => {
    const processFrame = () => {
      const video   = videoRef.current;
      const proc    = procRef.current;
      const display = displayRef.current;
      if (!video || !proc || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const W = 194, H = 146;
      const ctx2d = proc.getContext('2d');
      const dctx  = display?.getContext('2d');
      if (!ctx2d) return;

      ctx2d.save();
      ctx2d.translate(W, 0); ctx2d.scale(-1, 1);
      ctx2d.drawImage(video, 0, 0, W, H);
      ctx2d.restore();

      const frame = ctx2d.getImageData(0, 0, W, H).data;

      if (prevFrameRef.current) {
        const prev  = prevFrameRef.current;
        let z1 = 0, z2 = 0, z3 = 0;
        const third = Math.floor(W / 3);

        for (let i = 0; i < frame.length; i += 4) {
          const px = (i / 4) % W;
          const diff = (Math.abs(frame[i] - prev[i]) + Math.abs(frame[i+1] - prev[i+1]) + Math.abs(frame[i+2] - prev[i+2])) / (3 * 255);
          if (px < third) z1 += diff;
          else if (px < 2 * third) z2 += diff;
          else z3 += diff;
        }

        const zPx = third * H;
        const alpha = 0.12, sens = 10;
        const s = smoothRef.current;
        s.filter = s.filter * (1 - alpha) + Math.min(1, (z1 / zPx) * sens) * alpha;
        s.reverb = s.reverb * (1 - alpha) + Math.min(1, (z2 / zPx) * sens) * alpha;
        s.delay  = s.delay  * (1 - alpha) + Math.min(1, (z3 / zPx) * sens) * alpha;

        updateMeta({ webcamFilter: s.filter, webcamReverb: s.reverb, webcamDelay: s.delay });
      }
      prevFrameRef.current = new Uint8ClampedArray(frame);

      if (dctx) {
        dctx.drawImage(proc, 0, 0);
        const third = Math.floor(W / 3);
        const zoneColors = ['#f97316', '#a855f7', '#06b6d4'];
        zoneColors.forEach((c, i) => {
          dctx.fillStyle = c + '14';
          dctx.fillRect(i * third, 0, third, H);
        });
      }

      rafRef.current = requestAnimationFrame(processFrame);
    };
    rafRef.current = requestAnimationFrame(processFrame);
  }, [updateMeta]);

  const enableWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      updateMeta({ webcamActive: true });
      startWebcamLoop();
    } catch {
      alert('Camera access denied or unavailable.');
    }
  }, [updateMeta, startWebcamLoop]);

  const disableWebcam = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const vid = videoRef.current;
    if (vid?.srcObject) { (vid.srcObject as MediaStream).getTracks().forEach(t => t.stop()); vid.srcObject = null; }
    prevFrameRef.current = null;
    smoothRef.current = { filter: 0, reverb: 0, delay: 0 };
    updateMeta({ webcamActive: false, webcamFilter: 0, webcamReverb: 0, webcamDelay: 0 });
  }, [updateMeta]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const vid = videoRef.current;
    if (vid?.srcObject) (vid.srcObject as MediaStream).getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLockTarget(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const lockedStep  = lockTarget ? state.tracks[lockTarget.ti].steps[lockTarget.si] : null;
  const lockedTrack = lockTarget ? state.tracks[lockTarget.ti] : null;

  const stepLabels = ['1','','','','5','','','','9','','','','13','','',''];

  return (
    <section style={{
      background: '#07070d',
      borderTop: '1px solid #101018',
      borderBottom: '1px solid #101018',
      fontFamily: '"Space Grotesk", "IBM Plex Mono", monospace',
    }}>
      {/* Hidden processing canvas */}
      <canvas ref={procRef} width={194} height={146} style={{ display: 'none' }} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#090910',
        borderBottom: '1px solid #11111c',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: state.playing ? '#a855f7' : '#1a1028',
            boxShadow: state.playing ? '0 0 10px #a855f7, 0 0 20px #a855f744' : 'none',
            transition: 'all 0.3s',
          }} />
          <span style={{ fontSize: 11, letterSpacing: '0.28em', color: '#666', fontWeight: 700 }}>NEURAL SEQ</span>
        </div>

        {/* Loop dots */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: state.playing && (state.loopCount % 4) === i ? '#a855f7' : '#151525',
              boxShadow: state.playing && (state.loopCount % 4) === i ? '0 0 5px #a855f7' : 'none',
              transition: 'all 0.1s',
            }} />
          ))}
        </div>

        {/* BPM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 8, color: '#333', letterSpacing: '0.1em' }}>BPM</span>
          <button onClick={() => handleBpmChange(-1)} style={{ width: 20, height: 20, background: 'none', border: '1px solid #1a1a28', borderRadius: 3, color: '#555', cursor: 'pointer', fontSize: 11 }}>−</button>
          <input
            type="text" value={bpmInput}
            onChange={e => setBpmInput(e.target.value)}
            onBlur={e => handleBpmBlur(e.target.value)}
            style={{ width: 36, background: 'transparent', border: '1px solid #1a1a28', borderRadius: 3, color: '#ccc', fontSize: 13, fontFamily: 'monospace', textAlign: 'center', padding: '2px 0' }}
          />
          <button onClick={() => handleBpmChange(1)} style={{ width: 20, height: 20, background: 'none', border: '1px solid #1a1a28', borderRadius: 3, color: '#555', cursor: 'pointer', fontSize: 11 }}>+</button>
        </div>

        {/* Swing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 8, color: '#333', letterSpacing: '0.1em' }}>SWING</span>
          <input
            type="range" min={0} max={50} step={1} value={state.swing}
            onChange={e => updateMeta({ swing: Number(e.target.value) })}
            style={{ width: 70, height: 14, accentColor: '#a855f7', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 8, color: state.swing > 0 ? '#a855f7' : '#333', fontFamily: 'monospace', minWidth: 24 }}>
            {state.swing}%
          </span>
        </div>

        {/* Scale */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 8, color: '#333', letterSpacing: '0.1em' }}>SCALE</span>
          <select
            value={scaleIdx}
            onChange={e => handleScaleChange(Number(e.target.value))}
            style={{
              background: '#0d0d18', border: '1px solid #1a1a28', borderRadius: 4,
              color: '#777', fontSize: 8, padding: '3px 7px', cursor: 'pointer',
              letterSpacing: '0.1em',
            }}
          >
            {SCALE_OPTIONS.map((opt, i) => <option key={i} value={i}>{opt.label}</option>)}
          </select>
        </div>

        {/* Fill */}
        <button
          onPointerDown={() => updateMeta({ fillActive: true })}
          onPointerUp={() => updateMeta({ fillActive: false })}
          onPointerLeave={() => updateMeta({ fillActive: false })}
          style={{
            background: state.fillActive ? '#f9731622' : 'transparent',
            border: `1px solid ${state.fillActive ? '#f97316' : '#1e1e2c'}`,
            borderRadius: 4, color: state.fillActive ? '#f97316' : '#333',
            fontSize: 8, padding: '5px 10px', cursor: 'pointer',
            letterSpacing: '0.12em', fontWeight: 700,
            boxShadow: state.fillActive ? '0 0 10px #f9731644' : 'none',
            transition: 'all 0.1s',
          }}
        >FILL</button>

        {/* Play / Stop */}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={state.playing ? stop : start}
            style={{
              background: state.playing ? '#22c55e22' : '#22c55e',
              border: '1px solid #22c55e',
              borderRadius: 6, color: state.playing ? '#22c55e' : '#000',
              fontSize: 11, padding: '6px 22px', cursor: 'pointer',
              fontWeight: 700, letterSpacing: '0.1em',
              boxShadow: state.playing ? '0 0 12px #22c55e44' : '0 0 6px #22c55e22',
              transition: 'all 0.15s',
            }}
          >{state.playing ? '■ STOP' : '▶ PLAY'}</button>
        </div>
      </div>

      {/* ── Step number ruler ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', paddingLeft: 140, background: '#07070d', paddingRight: 8 }}>
        {stepLabels.map((label, i) => (
          <div key={i} style={{
            width: 30, flexShrink: 0,
            fontSize: 7, color: label ? '#252535' : 'transparent',
            textAlign: 'center', padding: '2px 0',
            marginLeft: i > 0 && i % 4 === 0 ? 8 : 2,
          }}>{label}</div>
        ))}
      </div>

      {/* ── Track grid + webcam panel ──────────────────────────────────────── */}
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Drums section header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#090912', padding: '3px 14px',
            borderBottom: '1px solid #0e0e18',
          }}>
            <span style={{ fontSize: 7, color: '#f97316', letterSpacing: '0.2em', fontWeight: 700, opacity: 0.6 }}>DRUMS</span>
            <div style={{ flex: 1, height: 1, background: '#141420' }} />
            <span style={{ fontSize: 7, color: '#2a2a3a', letterSpacing: '0.1em' }}>KICK · SNARE · HH-C · HH-O</span>
          </div>

          {state.tracks.slice(0, 4).map((track, ti) => (
            <TrackRow
              key={track.role}
              track={track} ti={ti} currentStep={state.currentStep}
              isMelodic={MELODIC_ROLES.has(track.role)}
              onToggleStep={si => toggleStep(ti, si)}
              onRightClickStep={(e, si) => handleRightClickStep(e, ti, si)}
              onMute={() => updateTrack(ti, { muted: !track.muted })}
              onPitchChange={delta => updateTrack(ti, { rootNote: Math.max(24, Math.min(84, track.rootNote + delta)) })}
              onSynthChange={id => updateTrack(ti, { synthType: id })}
              onFilterChange={freq => updateTrack(ti, { filterFreq: freq })}
              onRandomize={() => randomize(ti, 0.35)}
              onClear={() => clearTrack(ti)}
            />
          ))}

          {/* Synth section header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#090912', padding: '3px 14px',
            borderBottom: '1px solid #0e0e18', borderTop: '1px solid #0e0e18',
          }}>
            <span style={{ fontSize: 7, color: '#a855f7', letterSpacing: '0.2em', fontWeight: 700, opacity: 0.6 }}>SYNTH</span>
            <div style={{ flex: 1, height: 1, background: '#141420' }} />
            <span style={{ fontSize: 7, color: '#2a2a3a', letterSpacing: '0.1em' }}>BASS · LEAD · CHORD · FX</span>
          </div>

          {state.tracks.slice(4).map((track, idx) => {
            const ti = idx + 4;
            return (
              <TrackRow
                key={track.role}
                track={track} ti={ti} currentStep={state.currentStep}
                isMelodic={MELODIC_ROLES.has(track.role)}
                onToggleStep={si => toggleStep(ti, si)}
                onRightClickStep={(e, si) => handleRightClickStep(e, ti, si)}
                onMute={() => updateTrack(ti, { muted: !track.muted })}
                onPitchChange={delta => updateTrack(ti, { rootNote: Math.max(24, Math.min(84, track.rootNote + delta)) })}
                onSynthChange={id => updateTrack(ti, { synthType: id })}
                onFilterChange={freq => updateTrack(ti, { filterFreq: freq })}
                onRandomize={() => randomize(ti, 0.28)}
                onClear={() => clearTrack(ti)}
              />
            );
          })}

          {/* Bottom hint */}
          <div style={{ padding: '5px 14px', borderTop: '1px solid #0d0d18', background: '#07070d' }}>
            <span style={{ fontSize: 7, color: '#181828', letterSpacing: '0.08em' }}>
              CLICK = TOGGLE · RIGHT-CLICK ACTIVE = PARAM LOCK (PROB / CONDITION / PITCH / FILTER / DECAY) · SYNTH BTN = CYCLE PRESET
            </span>
          </div>
        </div>

        {/* Webcam panel */}
        <WebcamPanel
          active={state.webcamActive}
          filter={state.webcamFilter}
          reverb={state.webcamReverb}
          delay={state.webcamDelay}
          onEnable={enableWebcam}
          onDisable={disableWebcam}
          videoRef={videoRef}
          displayRef={displayRef}
        />
      </div>

      {/* Param lock overlay */}
      {lockTarget && lockedStep && lockedTrack && (
        <>
          <div onClick={() => setLockTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 8999 }} />
          <ParamLockEditor
            step={lockedStep} track={lockedTrack}
            isMelodic={MELODIC_ROLES.has(lockedTrack.role)}
            onUpdate={p => updateStep(lockTarget.ti, lockTarget.si, p)}
            onClose={() => setLockTarget(null)}
            pos={lockTarget.pos}
          />
        </>
      )}
    </section>
  );
}
