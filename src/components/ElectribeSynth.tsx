import { useState, useCallback, useRef } from 'react';
import { useElectribeEngine } from '../hooks/useElectribeEngine';

const BODY = '#161616';
const PANEL = '#1e1e1e';
const KNOB_TRACK = '#2a2a2a';
const KNOB_DOT = '#c8c8c8';
const LABEL = '#606060';
const DISPLAY_BG = '#0a0a0a';
const DISPLAY_TEXT = '#00ff88';
const BORDER = '#2a2a2a';

function KnobCtrl({
  value, onChange, label, size = 44,
}: {
  value: number; onChange: (v: number) => void; label: string; size?: number;
}) {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const angle = -135 + value * 270;
  const r = size / 2 - 5;
  const cx = size / 2;
  const cy = size / 2;
  const toRad = (a: number) => (a * Math.PI) / 180;

  const arcPath = () => {
    const startA = -135;
    const endA = angle;
    if (Math.abs(endA - startA) < 1) return '';
    const sx = cx + r * Math.cos(toRad(startA - 90));
    const sy = cy + r * Math.sin(toRad(startA - 90));
    const ex = cx + r * Math.cos(toRad(endA - 90));
    const ey = cy + r * Math.sin(toRad(endA - 90));
    const large = Math.abs(endA - startA) > 180 ? 1 : 0;
    return `M${sx},${sy} A${r},${r} 0 ${large} 1 ${ex},${ey}`;
  };

  const dotX = cx + (r + 1) * Math.cos(toRad(angle - 90));
  const dotY = cy + (r + 1) * Math.sin(toRad(angle - 90));

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      onChange(Math.max(0, Math.min(1, startVal.current + (startY.current - ev.clientY) / 120)));
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  };

  return (
    <div
      onMouseDown={onMouseDown}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'ns-resize', userSelect: 'none', minWidth: size }}
    >
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={KNOB_TRACK} strokeWidth={4} />
        {arcPath() && <path d={arcPath()} fill="none" stroke="#4a9eff" strokeWidth={2.5} strokeLinecap="round" />}
        <circle cx={cx} cy={cy} r={r - 7} fill="#282828" />
        <circle cx={cx} cy={cy} r={r - 7} fill="none" stroke="#333" strokeWidth={1} />
        <circle cx={dotX} cy={dotY} r={2} fill={KNOB_DOT} />
      </svg>
      <span style={{ fontSize: 8, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>{label}</span>
    </div>
  );
}

export default function ElectribeSynth() {
  const { state, start, stop, triggerPad, updatePart, updateBpm, setState } = useElectribeEngine();
  const [recActive, setRecActive] = useState(false);
  const bpmDrag = useRef({ dragging: false, startY: 0, startBpm: 120 });

  const selectedPart = state.parts[state.selectedPart];

  const selectPart = useCallback((id: number) => {
    setState(prev => ({ ...prev, selectedPart: id }));
  }, [setState]);

  const toggleStep = useCallback((stepIdx: number) => {
    const part = state.parts[state.selectedPart];
    const newSteps = [...part.steps];
    newSteps[stepIdx] = !newSteps[stepIdx];
    updatePart(state.selectedPart, { steps: newSteps });
  }, [state.parts, state.selectedPart, updatePart]);

  const handleKnob = useCallback((key: string, val: number) => {
    updatePart(state.selectedPart, { [key]: val });
  }, [state.selectedPart, updatePart]);

  const handleBpmMouseDown = (e: React.MouseEvent) => {
    bpmDrag.current = { dragging: true, startY: e.clientY, startBpm: state.bpm };
    const onMove = (ev: MouseEvent) => {
      if (!bpmDrag.current.dragging) return;
      const delta = (bpmDrag.current.startY - ev.clientY) * 0.5;
      updateBpm(Math.max(60, Math.min(200, bpmDrag.current.startBpm + delta)));
    };
    const onUp = () => {
      bpmDrag.current.dragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  };

  const knobDefs = [
    { key: 'oscType', label: 'OSC TYPE', value: selectedPart.oscType },
    { key: 'edit1',   label: 'EDIT 1',   value: selectedPart.edit1 },
    { key: 'edit2',   label: 'EDIT 2',   value: selectedPart.edit2 },
    { key: 'cutoff',  label: 'CUTOFF',   value: selectedPart.cutoff },
    { key: 'peak',    label: 'PEAK',     value: selectedPart.peak },
    { key: 'modType', label: 'MOD FX',   value: selectedPart.modType },
    { key: 'modDepth',label: 'DEPTH',    value: selectedPart.modDepth },
    { key: 'level',   label: 'VOL',      value: selectedPart.level },
  ];

  const btnBase: React.CSSProperties = {
    padding: '6px 14px',
    border: '1px solid #333',
    borderRadius: 3,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.05em',
    background: '#1e1e1e',
    color: '#888',
    transition: 'all 0.1s',
  };

  return (
    <section style={{ background: '#0e0e0e', padding: '40px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', background: BODY, borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}` }}>

        {/* Header */}
        <div style={{ background: '#121212', borderBottom: `1px solid ${BORDER}`, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.3em', color: '#888' }}>KORG</span>
            <span style={{ fontSize: 16, fontWeight: 300, letterSpacing: '0.15em', color: '#ccc' }}>electribe 2</span>
          </div>

          <div style={{ flex: 1 }} />

          {/* BPM display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: LABEL, letterSpacing: '0.1em' }}>BPM</span>
            <div
              onMouseDown={handleBpmMouseDown}
              style={{ background: DISPLAY_BG, border: '1px solid #1a1a1a', borderRadius: 4, padding: '4px 10px', cursor: 'ns-resize', userSelect: 'none' }}
            >
              <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 18, color: DISPLAY_TEXT, letterSpacing: '0.05em' }}>
                {state.bpm.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <button onClick={() => updateBpm(Math.min(200, state.bpm + 1))} style={{ ...btnBase, padding: '1px 6px', fontSize: 9 }}>▲</button>
              <button onClick={() => updateBpm(Math.max(60, state.bpm - 1))} style={{ ...btnBase, padding: '1px 6px', fontSize: 9 }}>▼</button>
            </div>
          </div>

          {/* Transport */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => state.playing ? stop() : start()}
              style={{ ...btnBase, background: state.playing ? '#1a3a1a' : '#1e1e1e', color: state.playing ? '#00ff88' : '#888', borderColor: state.playing ? '#00ff8844' : '#333' }}
            >
              {state.playing ? '■ STOP' : '▶ PLAY'}
            </button>
            <button
              onClick={() => setRecActive(r => !r)}
              style={{ ...btnBase, background: recActive ? '#3a1a1a' : '#1e1e1e', color: recActive ? '#ff4444' : '#888', borderColor: recActive ? '#ff444444' : '#333' }}
            >
              ● REC
            </button>
          </div>
        </div>

        {/* Knob row */}
        <div style={{ background: PANEL, borderBottom: `1px solid ${BORDER}`, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          {knobDefs.map(k => (
            <KnobCtrl key={k.key} value={k.value} onChange={v => handleKnob(k.key, v)} label={k.label} />
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', minWidth: 60 }}>
            <span style={{ fontSize: 8, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.06em' }}>PART</span>
            <div style={{ background: DISPLAY_BG, border: '1px solid #1a1a1a', borderRadius: 3, padding: '3px 8px' }}>
              <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 14, color: selectedPart.color }}>
                {String(state.selectedPart + 1).padStart(2, '0')}
              </span>
            </div>
            <span style={{ fontSize: 7, color: LABEL }}>{selectedPart.mode.toUpperCase()}</span>
          </div>
        </div>

        {/* Main body: part select + pad grid */}
        <div style={{ display: 'flex', gap: 0 }}>
          {/* Part select */}
          <div style={{ padding: '16px 12px', borderRight: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, alignContent: 'start', minWidth: 220 }}>
            {state.parts.map(part => (
              <button
                key={part.id}
                onClick={() => selectPart(part.id)}
                style={{
                  background: state.selectedPart === part.id ? '#282828' : '#1a1a1a',
                  border: `1px solid ${state.selectedPart === part.id ? '#fff' : part.color + '66'}`,
                  borderRadius: 4,
                  padding: '5px 4px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  opacity: part.active ? 1 : 0.4,
                  minWidth: 44,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: part.color, display: 'block' }} />
                <span style={{ fontSize: 7, color: state.selectedPart === part.id ? '#fff' : '#888', letterSpacing: '0.04em', fontWeight: 600 }}>{part.name}</span>
              </button>
            ))}
          </div>

          {/* Pad grid */}
          <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {state.parts.map(part => {
                const isActive = part.steps[state.currentStep] && state.playing;
                const isSelected = state.selectedPart === part.id;
                return (
                  <div
                    key={part.id}
                    onClick={() => { triggerPad(part.id); selectPart(part.id); }}
                    style={{
                      aspectRatio: '1',
                      background: isActive ? part.color + 'cc' : part.color + '22',
                      border: `${isSelected ? 2 : 1.5}px solid ${isSelected ? '#ffffff' : part.color + '99'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      transition: 'background 0.05s',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? '#fff' : part.color, letterSpacing: '0.05em' }}>{part.name}</span>
                    <span style={{ fontSize: 7, color: isActive ? '#ffffff99' : '#ffffff44', textTransform: 'uppercase' }}>{part.synthEngine}</span>
                    <span style={{
                      fontSize: 6, fontWeight: 700, letterSpacing: '0.08em',
                      color: part.mode === 'drum' ? '#ff8844' : '#44aaff',
                      background: part.mode === 'drum' ? '#ff884420' : '#44aaff20',
                      padding: '1px 4px', borderRadius: 2,
                    }}>
                      {part.mode.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step sequencer */}
        <div style={{ padding: '12px 20px 20px', borderTop: `1px solid ${BORDER}`, background: '#131313' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 8, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase' }}>PATTERN — {selectedPart.name}</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontSize: 8, color: selectedPart.color, letterSpacing: '0.1em' }}>
              {selectedPart.steps.filter(Boolean).length} / 16
            </span>
          </div>

          {/* Beat group labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 3, marginBottom: 3 }}>
            {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(n => (
              <span key={n} style={{ fontSize: 7, color: n % 4 === 1 ? '#555' : '#333', textAlign: 'center' }}>
                {n % 4 === 1 ? String(Math.ceil(n / 4)) : '·'}
              </span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 3 }}>
            {selectedPart.steps.map((on, i) => {
              const isCurrent = state.currentStep === i && state.playing;
              const vel = selectedPart.stepVelocity[i];
              return (
                <div
                  key={i}
                  onClick={() => toggleStep(i)}
                  style={{
                    height: 44,
                    background: on ? selectedPart.color + (isCurrent ? 'ff' : 'cc') : isCurrent ? '#2a2a2a' : '#1a1a1a',
                    border: `1px solid ${isCurrent ? '#ffffff66' : on ? selectedPart.color + '88' : '#2a2a2a'}`,
                    borderRadius: 4,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: isCurrent ? `0 0 6px ${selectedPart.color}88` : 'none',
                    transition: 'background 0.05s',
                  }}
                >
                  {/* velocity bar */}
                  <div style={{
                    width: '100%',
                    height: `${vel * 60}%`,
                    background: on ? '#ffffff22' : '#ffffff10',
                    borderRadius: '0 0 3px 3px',
                  }} />
                  {/* beat marker */}
                  {i % 4 === 0 && (
                    <div style={{
                      position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)',
                      width: 3, height: 3, borderRadius: '50%',
                      background: on ? '#ffffff66' : '#333',
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Routing info */}
          <div style={{ marginTop: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 8, color: LABEL }}>ROUTE:</span>
            {selectedPart.mode === 'drum' ? (
              <span style={{ fontSize: 8, color: '#ff8844', background: '#ff884415', padding: '2px 8px', borderRadius: 3, letterSpacing: '0.08em' }}>
                → TEKNO DRUM ENGINE ({selectedPart.drumVoice.toUpperCase()})
              </span>
            ) : (
              <span style={{ fontSize: 8, color: '#44aaff', background: '#44aaff15', padding: '2px 8px', borderRadius: 3, letterSpacing: '0.08em' }}>
                → KORG MONOLOGUE (NOTE {selectedPart.midiNote})
              </span>
            )}
            <span style={{ fontSize: 8, color: '#888', background: '#88888815', padding: '2px 8px', borderRadius: 3 }}>
              + E2 INTERNAL SYNTH ({selectedPart.synthEngine.toUpperCase()})
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
