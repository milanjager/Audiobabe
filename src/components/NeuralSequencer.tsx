import { useState, useRef, useCallback, useEffect } from 'react';
import { useNeuralEngine } from '../hooks/useNeuralEngine';
import type { NStep, NTrack, ScaleMode } from '../hooks/useNeuralEngine';

// ─── Step Pad ─────────────────────────────────────────────────────────────────

function StepPad({
  step, isCurrent, trackColor, groupStart,
  onClick, onRightClick,
}: {
  step: NStep; isCurrent: boolean; trackColor: string; groupStart: boolean;
  onClick: () => void; onRightClick: (e: React.MouseEvent) => void;
}) {
  const glow = isCurrent ? `0 0 10px ${trackColor}, 0 0 20px ${trackColor}88` : undefined;

  return (
    <div
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onRightClick(e); }}
      title="Click to toggle · Right-click for param locks"
      style={{
        width: 26, height: 26,
        position: 'relative',
        background: isCurrent && step.active ? trackColor + 'cc' : '#0b0b14',
        border: `1px solid ${step.active ? trackColor + (isCurrent ? 'ff' : '55') : '#1d1d2e'}`,
        borderRadius: 4,
        cursor: 'pointer',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: glow,
        transition: 'box-shadow 0.08s, background 0.08s',
        marginLeft: groupStart ? 6 : 2,
      }}
    >
      {/* Probability fill bar */}
      {step.active && !isCurrent && (
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: `${step.probability}%`,
          background: trackColor + '55',
          transition: 'height 0.15s',
        }} />
      )}
      {/* Parameter lock dot */}
      {step.locked && (
        <div style={{
          position: 'absolute', top: 2, right: 2,
          width: 4, height: 4, borderRadius: '50%',
          background: '#fff',
          boxShadow: `0 0 4px #fff`,
        }} />
      )}
      {/* Condition badge */}
      {step.active && step.condition !== 'always' && (
        <div style={{
          position: 'absolute', bottom: 1, left: 1,
          fontSize: 5, color: '#ffffff99', lineHeight: 1,
          fontFamily: 'monospace',
        }}>{step.condition}</div>
      )}
    </div>
  );
}

// ─── Track Row ────────────────────────────────────────────────────────────────

function TrackRow({
  track, currentStep, isMelodic,
  onToggleStep, onRightClickStep, onMute, onPitchChange,
}: {
  track: NTrack; currentStep: number; isMelodic: boolean;
  onToggleStep: (si: number) => void;
  onRightClickStep: (e: React.MouseEvent, si: number) => void;
  onMute: () => void;
  onPitchChange: (delta: number) => void;
}) {
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const noteName = `${NOTE_NAMES[track.rootNote % 12]}${Math.floor(track.rootNote / 12) - 1}`;

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '3px 0',
      borderBottom: `1px solid #0f0f1a`,
      background: '#0c0c16',
    }}>
      {/* Track label */}
      <div style={{
        width: 56, flexShrink: 0,
        fontSize: 9, letterSpacing: '0.12em', fontWeight: 700,
        color: track.muted ? '#333' : track.color,
        textAlign: 'right', paddingRight: 8,
        textTransform: 'uppercase',
        transition: 'color 0.2s',
      }}>{track.name}</div>

      {/* Mute button */}
      <button
        onClick={onMute}
        style={{
          width: 20, height: 20, flexShrink: 0,
          background: track.muted ? track.color + '33' : 'transparent',
          border: `1px solid ${track.muted ? track.color : '#2a2a3a'}`,
          borderRadius: 3, cursor: 'pointer',
          color: track.muted ? track.color : '#3a3a4a',
          fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        title={track.muted ? 'Unmute' : 'Mute'}
      >M</button>

      {/* Steps */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, paddingLeft: 4 }}>
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

      {/* Root note for melodic tracks */}
      {isMelodic && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, paddingRight: 8, flexShrink: 0 }}>
          <button
            onClick={() => onPitchChange(-1)}
            style={{ width: 14, height: 14, background: 'transparent', border: '1px solid #2a2a3a', borderRadius: 2, cursor: 'pointer', color: '#555', fontSize: 9 }}
          >−</button>
          <div style={{ width: 30, textAlign: 'center', fontSize: 9, color: '#666', fontFamily: 'monospace' }}>{noteName}</div>
          <button
            onClick={() => onPitchChange(1)}
            style={{ width: 14, height: 14, background: 'transparent', border: '1px solid #2a2a3a', borderRadius: 2, cursor: 'pointer', color: '#555', fontSize: 9 }}
          >+</button>
        </div>
      )}
    </div>
  );
}

// ─── Param Lock Editor ────────────────────────────────────────────────────────

function ParamLockEditor({
  step, track, isMelodic,
  onUpdate, onClose, pos,
}: {
  step: NStep; track: NTrack; isMelodic: boolean;
  onUpdate: (p: Partial<NStep>) => void;
  onClose: () => void;
  pos: { x: number; y: number };
}) {
  const CONDITIONS: NStep['condition'][] = ['always', '1:2', '1:4', 'fill'];

  return (
    <div style={{
      position: 'fixed',
      left: Math.min(pos.x, window.innerWidth - 240),
      top: Math.min(pos.y, window.innerHeight - 260),
      zIndex: 9000,
      background: '#0f0f1c',
      border: `1px solid ${track.color}44`,
      borderRadius: 8,
      padding: '12px 14px',
      width: 220,
      boxShadow: `0 0 24px ${track.color}22, 0 8px 32px #000a`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.15em', color: track.color, fontWeight: 700 }}>PARAM LOCK</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
      </div>

      {/* Probability */}
      <label style={{ fontSize: 9, color: '#555', display: 'block', marginBottom: 4 }}>
        PROBABILITY <span style={{ color: '#aaa' }}>{step.probability}%</span>
      </label>
      <input type="range" min={0} max={100} value={step.probability}
        onChange={e => onUpdate({ probability: Number(e.target.value) })}
        style={{ width: '100%', marginBottom: 10, accentColor: track.color }} />

      {/* Condition */}
      <div style={{ fontSize: 9, color: '#555', marginBottom: 6 }}>CONDITION</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {CONDITIONS.map(c => (
          <button key={c} onClick={() => onUpdate({ condition: c })} style={{
            flex: 1, padding: '4px 0',
            background: step.condition === c ? track.color + '33' : 'transparent',
            border: `1px solid ${step.condition === c ? track.color : '#2a2a3a'}`,
            borderRadius: 3, color: step.condition === c ? track.color : '#444',
            fontSize: 8, cursor: 'pointer', fontWeight: 700,
          }}>{c.toUpperCase()}</button>
        ))}
      </div>

      {/* Pitch offset (melodic only) */}
      {isMelodic && (
        <>
          <label style={{ fontSize: 9, color: '#555', display: 'block', marginBottom: 4 }}>
            PITCH <span style={{ color: '#aaa' }}>{step.pitchOffset > 0 ? '+' : ''}{step.pitchOffset} st</span>
          </label>
          <input type="range" min={-12} max={12} value={step.pitchOffset}
            onChange={e => onUpdate({ pitchOffset: Number(e.target.value) })}
            style={{ width: '100%', marginBottom: 10, accentColor: track.color }} />
        </>
      )}

      {/* Filter mod */}
      <label style={{ fontSize: 9, color: '#555', display: 'block', marginBottom: 4 }}>
        FILTER MOD <span style={{ color: '#aaa' }}>{step.filterMod > 0 ? '+' : ''}{step.filterMod.toFixed(1)}</span>
      </label>
      <input type="range" min={-2} max={2} step={0.1} value={step.filterMod}
        onChange={e => onUpdate({ filterMod: Number(e.target.value) })}
        style={{ width: '100%', marginBottom: 10, accentColor: track.color }} />

      {/* Decay mod */}
      <label style={{ fontSize: 9, color: '#555', display: 'block', marginBottom: 4 }}>
        DECAY MOD <span style={{ color: '#aaa' }}>{step.decayMod > 0 ? '+' : ''}{step.decayMod.toFixed(1)}</span>
      </label>
      <input type="range" min={-2} max={2} step={0.1} value={step.decayMod}
        onChange={e => onUpdate({ decayMod: Number(e.target.value) })}
        style={{ width: '100%', accentColor: track.color }} />

      <button onClick={() => onUpdate({ pitchOffset: 0, filterMod: 0, decayMod: 0, probability: 100, condition: 'always' })}
        style={{ marginTop: 10, width: '100%', background: 'transparent', border: '1px solid #2a2a3a', borderRadius: 4, color: '#555', fontSize: 9, cursor: 'pointer', padding: '4px 0' }}>
        RESET ALL
      </button>
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
    { label: 'FILTER', value: filter, color: '#f97316' },
    { label: 'REVERB', value: reverb, color: '#a855f7' },
    { label: 'DELAY',  value: delay,  color: '#06b6d4' },
  ];

  return (
    <div style={{
      width: 210, flexShrink: 0,
      background: '#08080f',
      borderLeft: '1px solid #14141f',
      display: 'flex', flexDirection: 'column',
      padding: '10px 10px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.15em', color: active ? '#22c55e' : '#444', fontWeight: 700 }}>
          {active ? '● MOTION' : '○ MOTION'}
        </span>
        <button
          onClick={active ? onDisable : onEnable}
          style={{
            background: active ? '#22c55e22' : 'transparent',
            border: `1px solid ${active ? '#22c55e' : '#2a2a3a'}`,
            borderRadius: 4, color: active ? '#22c55e' : '#555',
            fontSize: 8, cursor: 'pointer', padding: '3px 8px',
            letterSpacing: '0.1em',
          }}
        >{active ? 'DISABLE' : 'ENABLE CAM'}</button>
      </div>

      {/* Camera display */}
      <div style={{
        width: '100%', aspectRatio: '16/9',
        background: '#040408',
        border: '1px solid #141420',
        borderRadius: 4,
        overflow: 'hidden', position: 'relative',
        marginBottom: 8,
      }}>
        {active ? (
          <canvas ref={displayRef} width={190} height={107}
            style={{ width: '100%', height: '100%', display: 'block' }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 6,
          }}>
            {/* Camera icon */}
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none">
              <path d="M23 7l-7 5 7 5V7z" stroke="#2a2a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="1" y="5" width="15" height="14" rx="2" stroke="#2a2a3a" strokeWidth="2"/>
            </svg>
            <span style={{ fontSize: 8, color: '#2a2a3a', letterSpacing: '0.12em' }}>MOVE HANDS</span>
            <span style={{ fontSize: 8, color: '#2a2a3a', letterSpacing: '0.12em' }}>TO CONTROL</span>
          </div>
        )}
        {/* Zone overlay labels */}
        {active && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', pointerEvents: 'none' }}>
            {zones.map((z, i) => (
              <div key={i} style={{
                flex: 1,
                borderRight: i < 2 ? `1px solid ${z.color}33` : 'none',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                paddingBottom: 3,
              }}>
                <span style={{ fontSize: 7, color: z.color + '99', letterSpacing: '0.1em', fontWeight: 700 }}>{z.label[0]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden video element */}
      <video ref={videoRef} autoPlay muted playsInline
        style={{ display: 'none', width: 1, height: 1 }} />

      {/* Zone meters */}
      {zones.map((z, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 8, color: '#444', letterSpacing: '0.1em' }}>{z.label}</span>
            <span style={{ fontSize: 8, color: active ? z.color : '#2a2a3a', fontFamily: 'monospace' }}>
              {Math.round(z.value * 100)}%
            </span>
          </div>
          <div style={{ height: 4, background: '#0f0f1a', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${z.value * 100}%`,
              background: z.color,
              borderRadius: 2,
              boxShadow: active && z.value > 0.05 ? `0 0 6px ${z.color}` : 'none',
              transition: 'width 0.08s',
            }} />
          </div>
        </div>
      ))}

      {active && (
        <div style={{ marginTop: 6, fontSize: 8, color: '#2a2a3a', lineHeight: 1.5, letterSpacing: '0.08em' }}>
          LEFT → FILTER CUTOFF<br/>
          CENTER → REVERB MIX<br/>
          RIGHT → DELAY SEND
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SCALE_OPTIONS: { key: number; mode: ScaleMode; label: string }[] = [
  { key: 9,  mode: 'minor',      label: 'A MIN' },
  { key: 9,  mode: 'phrygian',   label: 'A PHRY' },
  { key: 9,  mode: 'pentatonic', label: 'A PENT' },
  { key: 0,  mode: 'minor',      label: 'C MIN' },
  { key: 5,  mode: 'phrygian',   label: 'F PHRY' },
  { key: 7,  mode: 'minor',      label: 'G MIN' },
];

const MELODIC_ROLES = new Set(['bass', 'lead', 'chord', 'fx']);

export default function NeuralSequencer() {
  const { state, start, stop, toggleStep, updateStep, updateTrack, updateMeta } = useNeuralEngine();

  const [scaleIdx, setScaleIdx] = useState(1); // A Phrygian default
  const [lockTarget, setLockTarget] = useState<{ ti: number; si: number; pos: { x: number; y: number } } | null>(null);

  // Webcam refs
  const videoRef   = useRef<HTMLVideoElement>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);
  const procRef    = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const rafRef     = useRef<number | null>(null);
  const smoothRef  = useRef({ filter: 0, reverb: 0, delay: 0 });

  // BPM input state
  const [bpmInput, setBpmInput] = useState(String(state.bpm));

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

  const handleRightClickStep = (e: React.MouseEvent, ti: number, si: number) => {
    const step = state.tracks[ti].steps[si];
    if (!step.active) return;
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

      const W = 190, H = 107;
      const ctx2d = proc.getContext('2d');
      const dctx  = display?.getContext('2d');
      if (!ctx2d) return;

      // Mirror and draw
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

      // Copy to display canvas with zone overlay
      if (dctx) {
        dctx.drawImage(proc, 0, 0);
        const third = Math.floor(W / 3);
        const zoneColors = ['#f97316', '#a855f7', '#06b6d4'];
        zoneColors.forEach((c, i) => {
          dctx.fillStyle = c + '18';
          dctx.fillRect(i * third, 0, third, H);
        });
      }

      rafRef.current = requestAnimationFrame(processFrame);
    };
    rafRef.current = requestAnimationFrame(processFrame);
  }, [updateMeta]);

  const enableWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 180 } });
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

  // Close lock editor on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLockTarget(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const lockedStep = lockTarget ? state.tracks[lockTarget.ti].steps[lockTarget.si] : null;
  const lockedTrack = lockTarget ? state.tracks[lockTarget.ti] : null;

  // Step position indicators (groups of 4)
  const stepLabels = ['1','','','','5','','','','9','','','','13','','',''];

  return (
    <section style={{
      background: '#07070d',
      borderTop: '1px solid #111118',
      borderBottom: '1px solid #111118',
      fontFamily: '"Space Grotesk", "IBM Plex Mono", monospace',
    }}>
      {/* Hidden processing canvas */}
      <canvas ref={procRef} width={190} height={107} style={{ display: 'none' }} />

      {/* Title bar */}
      <div style={{
        background: '#0a0a12',
        borderBottom: '1px solid #12121e',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        {/* Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: state.playing ? '#22c55e' : '#1a3a1a',
            boxShadow: state.playing ? '0 0 8px #22c55e' : 'none',
            transition: 'all 0.3s',
          }} />
          <span style={{ fontSize: 11, letterSpacing: '0.25em', color: '#888', fontWeight: 700 }}>NEURAL SEQ</span>
        </div>

        {/* Loop counter dots */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: state.playing && (state.loopCount % 4) === i ? '#a855f7' : '#1a1a2a',
              transition: 'background 0.1s',
            }} />
          ))}
        </div>

        {/* BPM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em' }}>BPM</span>
          <button onClick={() => handleBpmChange(-1)} style={{ background: 'none', border: '1px solid #1e1e2e', borderRadius: 2, color: '#555', cursor: 'pointer', fontSize: 10, padding: '1px 5px' }}>−</button>
          <input
            type="text" value={bpmInput}
            onChange={e => setBpmInput(e.target.value)}
            onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v)) { updateMeta({ bpm: Math.max(60, Math.min(200, v)) }); setBpmInput(String(Math.max(60, Math.min(200, v)))); } else setBpmInput(String(state.bpm)); }}
            style={{ width: 36, background: 'transparent', border: '1px solid #1e1e2e', borderRadius: 3, color: '#ccc', fontSize: 13, fontFamily: 'monospace', textAlign: 'center', padding: '2px 0' }}
          />
          <button onClick={() => handleBpmChange(1)} style={{ background: 'none', border: '1px solid #1e1e2e', borderRadius: 2, color: '#555', cursor: 'pointer', fontSize: 10, padding: '1px 5px' }}>+</button>
        </div>

        {/* Scale selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em' }}>SCALE</span>
          <select
            value={scaleIdx}
            onChange={e => handleScaleChange(Number(e.target.value))}
            style={{
              background: '#0f0f1c', border: '1px solid #1e1e2e', borderRadius: 3,
              color: '#888', fontSize: 9, padding: '3px 6px', cursor: 'pointer',
              letterSpacing: '0.1em',
            }}
          >
            {SCALE_OPTIONS.map((opt, i) => (
              <option key={i} value={i}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Fill button */}
        <button
          onPointerDown={() => updateMeta({ fillActive: true })}
          onPointerUp={() => updateMeta({ fillActive: false })}
          onPointerLeave={() => updateMeta({ fillActive: false })}
          style={{
            background: state.fillActive ? '#f9731633' : 'transparent',
            border: `1px solid ${state.fillActive ? '#f97316' : '#2a2a3a'}`,
            borderRadius: 4, color: state.fillActive ? '#f97316' : '#444',
            fontSize: 9, padding: '4px 10px', cursor: 'pointer',
            letterSpacing: '0.12em', fontWeight: 700,
            transition: 'all 0.1s',
          }}
        >FILL</button>

        {/* Transport */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={state.playing ? stop : start}
            style={{
              background: state.playing ? '#22c55e22' : '#22c55e',
              border: `1px solid #22c55e`,
              borderRadius: 5, color: state.playing ? '#22c55e' : '#000',
              fontSize: 11, padding: '5px 18px', cursor: 'pointer',
              fontWeight: 700, letterSpacing: '0.1em',
              boxShadow: state.playing ? '0 0 10px #22c55e44' : 'none',
              transition: 'all 0.15s',
            }}
          >{state.playing ? '■ STOP' : '▶ PLAY'}</button>
        </div>
      </div>

      {/* Step position labels */}
      <div style={{ display: 'flex', paddingLeft: 84, background: '#08080e', paddingRight: 8 }}>
        {stepLabels.map((label, i) => (
          <div key={i} style={{
            width: 26, flexShrink: 0,
            fontSize: 7, color: '#2a2a3a',
            textAlign: 'center', padding: '2px 0',
            marginLeft: i > 0 && i % 4 === 0 ? 6 : 2,
          }}>{label}</div>
        ))}
      </div>

      {/* Track grid + webcam */}
      <div style={{ display: 'flex' }}>
        {/* Tracks */}
        <div style={{ flex: 1 }}>
          {/* Drum separator */}
          <div style={{ background: '#0a0a12', padding: '3px 14px 3px 0', borderBottom: '1px solid #0f0f1a' }}>
            <span style={{ fontSize: 8, color: '#2a2a3a', letterSpacing: '0.15em' }}>── DRUMS ──────────────────────────────────────</span>
          </div>
          {state.tracks.slice(0, 4).map((track, ti) => (
            <TrackRow
              key={track.role} track={track} currentStep={state.currentStep}
              isMelodic={MELODIC_ROLES.has(track.role)}
              onToggleStep={si => toggleStep(ti, si)}
              onRightClickStep={(e, si) => handleRightClickStep(e, ti, si)}
              onMute={() => updateTrack(ti, { muted: !track.muted })}
              onPitchChange={delta => updateTrack(ti, { rootNote: Math.max(24, Math.min(84, track.rootNote + delta)) })}
            />
          ))}

          {/* Synth separator */}
          <div style={{ background: '#0a0a12', padding: '3px 14px 3px 0', borderBottom: '1px solid #0f0f1a' }}>
            <span style={{ fontSize: 8, color: '#2a2a3a', letterSpacing: '0.15em' }}>── SYNTH ─────────────────────────────────────</span>
          </div>
          {state.tracks.slice(4).map((track, idx) => {
            const ti = idx + 4;
            return (
              <TrackRow
                key={track.role} track={track} currentStep={state.currentStep}
                isMelodic={MELODIC_ROLES.has(track.role)}
                onToggleStep={si => toggleStep(ti, si)}
                onRightClickStep={(e, si) => handleRightClickStep(e, ti, si)}
                onMute={() => updateTrack(ti, { muted: !track.muted })}
                onPitchChange={delta => updateTrack(ti, { rootNote: Math.max(24, Math.min(84, track.rootNote + delta)) })}
              />
            );
          })}

          {/* Instruction hint */}
          <div style={{ padding: '6px 14px', borderTop: '1px solid #0f0f1a', background: '#08080e' }}>
            <span style={{ fontSize: 8, color: '#222230', letterSpacing: '0.1em' }}>
              CLICK = TOGGLE STEP · RIGHT-CLICK ACTIVE STEP = PARAM LOCK (PITCH / FILTER / DECAY / PROBABILITY / CONDITION)
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

      {/* Param lock editor overlay */}
      {lockTarget && lockedStep && lockedTrack && (
        <>
          <div onClick={() => setLockTarget(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 8999 }} />
          <ParamLockEditor
            step={lockedStep}
            track={lockedTrack}
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
