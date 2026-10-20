import { useState, useCallback, useRef } from 'react';
import { useElectribeEngine, OSC_TYPES, MOD_TYPES, IFX_TYPES } from '../hooks/useElectribeEngine';
import type { E2Part } from '../hooks/useElectribeEngine';

const C = {
  body: '#181818',
  panel: '#1f1f1f',
  section: '#191919',
  border: '#2c2c2c',
  borderLight: '#383838',
  knobTrack: '#2e2e2e',
  knobArc: '#4a9eff',
  display: '#0a0a0a',
  displayGreen: '#00ff88',
  label: '#555',
  labelBright: '#888',
  text: '#ccc',
} as const;

// Draggable knob
function Knob({
  value, onChange, label, accent = C.knobArc, size = 42,
}: {
  value: number; onChange: (v: number) => void; label: string; accent?: string; size?: number;
}) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startV = useRef(0);
  const angle = -135 + value * 270;
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const rad = (a: number) => (a * Math.PI) / 180;

  const arc = () => {
    const sa = -135; const ea = angle;
    if (Math.abs(ea - sa) < 1) return '';
    const sx = cx + r * Math.cos(rad(sa - 90));
    const sy = cy + r * Math.sin(rad(sa - 90));
    const ex = cx + r * Math.cos(rad(ea - 90));
    const ey = cy + r * Math.sin(rad(ea - 90));
    return `M${sx},${sy} A${r},${r} 0 ${Math.abs(ea - sa) > 180 ? 1 : 0} 1 ${ex},${ey}`;
  };

  const dx = cx + (r + 1) * Math.cos(rad(angle - 90));
  const dy = cy + (r + 1) * Math.sin(rad(angle - 90));

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true; startY.current = e.clientY; startV.current = value;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      onChange(Math.max(0, Math.min(1, startV.current + (startY.current - ev.clientY) / 130)));
    };
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    e.preventDefault();
  };

  return (
    <div onMouseDown={onMouseDown} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'ns-resize', userSelect: 'none' }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.knobTrack} strokeWidth={3} />
        {arc() && <path d={arc()} fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" />}
        <circle cx={cx} cy={cy} r={r - 6} fill="#262626" stroke="#303030" strokeWidth={1} />
        <circle cx={dx} cy={dy} r={2} fill="#d0d0d0" />
      </svg>
      <span style={{ fontSize: 7.5, color: C.label, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

// Section wrapper
function Section({ title, children, accent = '#444' }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: C.section, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 7, letterSpacing: '0.18em', color: accent, fontWeight: 800, textTransform: 'uppercase' }}>{title}</span>
      {children}
    </div>
  );
}

// Small display showing selected item from a list
function SelectDisplay({ index, items, color = C.displayGreen }: { index: number; items: readonly string[]; color?: string }) {
  return (
    <div style={{ background: C.display, border: `1px solid #1a1a1a`, borderRadius: 4, padding: '3px 8px', minWidth: 90, textAlign: 'center' }}>
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: '#444', letterSpacing: '0.1em' }}>
        {String(index + 1).padStart(2, '0')} / {items.length}
      </div>
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 700, color, letterSpacing: '0.04em', marginTop: 1 }}>
        {items[index] ?? '---'}
      </div>
    </div>
  );
}

// Filter type toggle buttons
function FilterTypeButtons({ value, onChange }: { value: 0 | 1 | 2; onChange: (v: 0 | 1 | 2) => void }) {
  const labels: [string, 0 | 1 | 2][] = [['LPF', 0], ['HPF', 1], ['BPF', 2]];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
      <span style={{ fontSize: 7, color: C.label, letterSpacing: '0.08em', textTransform: 'uppercase' }}>TYPE</span>
      {labels.map(([lbl, v]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          style={{
            padding: '3px 7px', border: `1px solid ${value === v ? '#4a9eff88' : C.border}`,
            borderRadius: 3, cursor: 'pointer', fontSize: 8, fontWeight: 700, letterSpacing: '0.04em',
            background: value === v ? '#4a9eff22' : C.section,
            color: value === v ? '#4a9eff' : C.label,
            transition: 'all 0.1s', width: 36,
          }}
        >{lbl}</button>
      ))}
    </div>
  );
}

// Toggle button
function ToggleBtn({ label, active, onClick, accentColor = '#4a9eff' }: { label: string; active: boolean; onClick: () => void; accentColor?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 8px', border: `1px solid ${active ? accentColor + '88' : C.border}`,
        borderRadius: 3, cursor: 'pointer', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.08em',
        background: active ? accentColor + '22' : C.section,
        color: active ? accentColor : C.label,
        transition: 'all 0.1s', textTransform: 'uppercase',
      }}
    >{label}</button>
  );
}

export default function ElectribeSynth() {
  const { state, setState, start, stop, triggerPad, updatePart, updateBpm } = useElectribeEngine();
  const [recActive, setRecActive] = useState(false);
  const [gateArp, setGateArp] = useState(false);
  const [touchScale, setTouchScale] = useState(false);
  const [masterFxOn, setMasterFxOn] = useState(false);
  const [touchXY, setTouchXY] = useState<{ x: number; y: number } | null>(null);
  const bpmDrag = useRef({ dragging: false, startY: 0, startBpm: 128 });

  const sp = state.parts[state.selectedPart];

  const selectPart = useCallback((id: number) => {
    setState(prev => ({ ...prev, selectedPart: id }));
  }, [setState]);

  const toggleStep = useCallback((i: number) => {
    const part = state.parts[state.selectedPart];
    const newSteps = [...part.steps];
    newSteps[i] = !newSteps[i];
    updatePart(state.selectedPart, { steps: newSteps });
  }, [state.parts, state.selectedPart, updatePart]);

  const upd = useCallback((key: keyof E2Part, val: number | boolean) => {
    updatePart(state.selectedPart, { [key]: val } as Partial<E2Part>);
  }, [state.selectedPart, updatePart]);

  const handleOscKnob = (val: number) => {
    const idx = Math.round(val * (OSC_TYPES.length - 1));
    upd('oscTypeIndex', idx);
  };
  const handleModKnob = (val: number) => {
    const idx = Math.round(val * (MOD_TYPES.length - 1));
    upd('modType', idx);
  };
  const handleIfxKnob = (val: number) => {
    const idx = Math.round(val * (IFX_TYPES.length - 1));
    upd('ifxType', idx);
  };

  const handleBpmMouseDown = (e: React.MouseEvent) => {
    bpmDrag.current = { dragging: true, startY: e.clientY, startBpm: state.bpm };
    const onMove = (ev: MouseEvent) => {
      if (!bpmDrag.current.dragging) return;
      const d = (bpmDrag.current.startY - ev.clientY) * 0.4;
      updateBpm(Math.max(20, Math.min(300, Math.round((bpmDrag.current.startBpm + d) * 10) / 10)));
    };
    const onUp = () => { bpmDrag.current.dragging = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    e.preventDefault();
  };

  const handleTouchPad = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    setTouchXY({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
  };

  const btn: React.CSSProperties = {
    padding: '6px 12px', border: `1px solid ${C.border}`,
    borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.05em', background: C.panel, color: C.labelBright,
    transition: 'all 0.1s',
  };

  return (
    <section style={{ background: '#0e0e0e', padding: '40px 16px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', background: C.body, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>

        {/* ── HEADER ── */}
        <div style={{ background: '#111', borderBottom: `1px solid ${C.border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.35em', color: '#777' }}>KORG</span>
            <span style={{ fontSize: 17, fontWeight: 300, letterSpacing: '0.15em', color: '#bbb' }}>electribe 2</span>
          </div>
          <div style={{ flex: 1 }} />

          {/* BPM */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 8, color: C.label, letterSpacing: '0.1em' }}>BPM</span>
            <div
              onMouseDown={handleBpmMouseDown}
              style={{ background: C.display, border: `1px solid #1c1c1c`, borderRadius: 4, padding: '4px 10px', cursor: 'ns-resize', userSelect: 'none' }}
            >
              <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 20, color: C.displayGreen, letterSpacing: '0.04em' }}>
                {state.bpm.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Transport: ● REC  ■ STOP  ▶ PLAY  TAP */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setRecActive(r => !r)}
              style={{ ...btn, background: recActive ? '#3a1010' : C.panel, color: recActive ? '#ff4444' : C.labelBright, borderColor: recActive ? '#ff444455' : C.border }}
            >● REC</button>
            <button
              onClick={() => { stop(); setRecActive(false); }}
              style={{ ...btn }}
            >■ STOP</button>
            <button
              onClick={() => state.playing ? stop() : start()}
              style={{ ...btn, background: state.playing ? '#0d2a1a' : C.panel, color: state.playing ? '#00ff88' : C.labelBright, borderColor: state.playing ? '#00ff8855' : C.border }}
            >{state.playing ? '▶ PAUSE' : '▶ PLAY'}</button>
            <button
              onMouseDown={() => {
                const now = performance.now();
                updateBpm(Math.round(60000 / Math.max(200, now)));
              }}
              style={{ ...btn }}
            >TAP</button>
          </div>
        </div>

        {/* ── EDIT SECTIONS + TOUCHPAD ── */}
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 8, borderBottom: `1px solid ${C.border}` }}>

          {/* OSCILLATOR */}
          <Section title="Oscillator" accent="#9333ea">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Knob
                value={sp.oscTypeIndex / (OSC_TYPES.length - 1)}
                onChange={handleOscKnob}
                label="OSCILLATOR"
                accent="#9333ea"
              />
              <SelectDisplay index={sp.oscTypeIndex} items={OSC_TYPES} color="#9333ea" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Knob value={sp.pitch} onChange={v => upd('pitch', v)} label="PITCH/GLIDE" accent="#9333ea" />
              <Knob value={sp.oscEdit} onChange={v => upd('oscEdit', v)} label="EDIT" accent="#9333ea" />
            </div>
          </Section>

          {/* FILTER */}
          <Section title="Filter" accent="#0891b2">
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                <Knob value={sp.cutoff} onChange={v => upd('cutoff', v)} label="CUTOFF" accent="#0891b2" />
                <Knob value={sp.resonance} onChange={v => upd('resonance', v)} label="RESONANCE" accent="#0891b2" />
                <Knob value={sp.egInt} onChange={v => upd('egInt', v)} label="EG INT" accent="#0891b2" />
              </div>
              <FilterTypeButtons
                value={sp.filterType}
                onChange={v => updatePart(state.selectedPart, { filterType: v })}
              />
            </div>
          </Section>

          {/* MODULATION */}
          <Section title="Modulation" accent="#d97706">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Knob
                value={sp.modType / (MOD_TYPES.length - 1)}
                onChange={handleModKnob}
                label="MOD TYPE"
                accent="#d97706"
              />
              <SelectDisplay index={sp.modType} items={MOD_TYPES} color="#d97706" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Knob value={sp.modDepth} onChange={v => upd('modDepth', v)} label="DEPTH" accent="#d97706" />
              <Knob value={sp.modSpeed} onChange={v => upd('modSpeed', v)} label="SPEED" accent="#d97706" />
            </div>
          </Section>

          {/* AMP/EG */}
          <Section title="Amp / EG" accent="#16a34a">
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              <Knob value={sp.level}  onChange={v => upd('level', v)}  label="LEVEL"   accent="#16a34a" />
              <Knob value={sp.pan}    onChange={v => upd('pan', v)}    label="PAN"     accent="#16a34a" />
              <Knob value={sp.attack} onChange={v => upd('attack', v)} label="ATTACK"  accent="#16a34a" />
              <Knob value={sp.decay}  onChange={v => upd('decay', v)}  label="DECAY/R" accent="#16a34a" />
            </div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
              <ToggleBtn label="AMP EG"   active={sp.ampEg}    onClick={() => upd('ampEg', !sp.ampEg)}    accentColor="#16a34a" />
              <ToggleBtn label="MFX SEND" active={sp.mfxSend}  onClick={() => upd('mfxSend', !sp.mfxSend)} accentColor="#16a34a" />
            </div>
          </Section>

          {/* INSERT FX */}
          <Section title="Insert FX" accent="#dc2626">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Knob
                value={sp.ifxType / (IFX_TYPES.length - 1)}
                onChange={handleIfxKnob}
                label="INSERT FX"
                accent="#dc2626"
              />
              <SelectDisplay index={sp.ifxType} items={IFX_TYPES} color="#dc2626" />
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Knob value={sp.ifxEdit} onChange={v => upd('ifxEdit', v)} label="EDIT" accent="#dc2626" />
              <ToggleBtn label="IFX ON" active={sp.ifxOn} onClick={() => upd('ifxOn', !sp.ifxOn)} accentColor="#dc2626" />
            </div>
          </Section>

          {/* TOUCHPAD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 110 }}>
            <span style={{ fontSize: 7, letterSpacing: '0.18em', color: '#555', fontWeight: 800, textTransform: 'uppercase' }}>Touchpad</span>
            <div
              onMouseMove={e => { if (e.buttons > 0) handleTouchPad(e); }}
              onMouseDown={handleTouchPad}
              onMouseLeave={() => setTouchXY(null)}
              style={{
                flex: 1, background: '#111', border: `1px solid ${C.border}`, borderRadius: 6,
                cursor: 'crosshair', position: 'relative', minHeight: 80, overflow: 'hidden',
              }}
            >
              {/* Grid lines */}
              {[25, 50, 75].map(p => (
                <div key={p} style={{ position: 'absolute', top: `${p}%`, left: 0, right: 0, height: 1, background: '#1e1e1e' }} />
              ))}
              {[25, 50, 75].map(p => (
                <div key={p} style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, width: 1, background: '#1e1e1e' }} />
              ))}
              {touchXY && (
                <div style={{
                  position: 'absolute',
                  left: `${touchXY.x * 100}%`,
                  top: `${(1 - touchXY.y) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 10, height: 10, borderRadius: '50%',
                  background: gateArp ? '#d97706' : masterFxOn ? '#9333ea' : '#00ff88',
                  boxShadow: `0 0 8px ${gateArp ? '#d97706' : masterFxOn ? '#9333ea' : '#00ff88'}`,
                }} />
              )}
              <span style={{ position: 'absolute', bottom: 3, right: 5, fontSize: 6, color: '#333', letterSpacing: '0.08em' }}>X/Y</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <ToggleBtn label="GATE ARP"  active={gateArp}    onClick={() => setGateArp(v => !v)}    accentColor="#d97706" />
              <ToggleBtn label="TOUCH SCALE" active={touchScale} onClick={() => setTouchScale(v => !v)} accentColor="#0891b2" />
              <ToggleBtn label="MASTER FX" active={masterFxOn} onClick={() => setMasterFxOn(v => !v)} accentColor="#9333ea" />
            </div>
          </div>
        </div>

        {/* ── PART GRID + PAD GRID ── */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
          {/* Part list (16 parts) */}
          <div style={{ padding: '12px 10px', borderRight: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, alignContent: 'start' }}>
            <div style={{ gridColumn: '1/-1', fontSize: 7, letterSpacing: '0.18em', color: '#555', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>Parts</div>
            {state.parts.map(part => (
              <button
                key={part.id}
                onClick={() => selectPart(part.id)}
                onContextMenu={e => { e.preventDefault(); updatePart(part.id, { active: !part.active }); }}
                title="Click = select | Right-click = mute"
                style={{
                  background: state.selectedPart === part.id ? '#2a2a2a' : '#1b1b1b',
                  border: `1px solid ${state.selectedPart === part.id ? '#fff' : part.color + '55'}`,
                  borderRadius: 4, padding: '5px 3px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  opacity: part.active ? 1 : 0.35, minWidth: 42,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: part.color, display: 'block', boxShadow: state.selectedPart === part.id ? `0 0 4px ${part.color}` : 'none' }} />
                <span style={{ fontSize: 7, color: state.selectedPart === part.id ? '#fff' : '#777', letterSpacing: '0.03em', fontWeight: 600 }}>{part.name}</span>
                <span style={{ fontSize: 6, color: part.mode === 'drum' ? '#ff7744aa' : '#4488ffaa', letterSpacing: '0.04em' }}>{part.mode === 'drum' ? 'DR' : 'SY'}</span>
              </button>
            ))}
          </div>

          {/* Trigger pad 4×4 */}
          <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 7, letterSpacing: '0.18em', color: '#555', fontWeight: 800, textTransform: 'uppercase' }}>Trigger Pads</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
              {state.parts.map(part => {
                const hit = part.steps[state.currentStep] && state.playing;
                const sel = state.selectedPart === part.id;
                return (
                  <div
                    key={part.id}
                    onClick={() => { triggerPad(part.id); selectPart(part.id); }}
                    style={{
                      aspectRatio: '1',
                      background: hit ? part.color + 'cc' : part.color + '1a',
                      border: `${sel ? 2 : 1}px solid ${sel ? '#fff' : part.color + '77'}`,
                      borderRadius: 5, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                      transition: 'background 0.06s', userSelect: 'none',
                      boxShadow: hit ? `0 0 10px ${part.color}88` : 'none',
                    }}
                  >
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: hit ? '#fff' : part.color, letterSpacing: '0.04em' }}>{part.name}</span>
                    <span style={{ fontSize: 6.5, color: hit ? '#ffffffaa' : '#ffffff33', textTransform: 'uppercase' }}>
                      {part.mode === 'drum' ? part.drumVoice.replace('_', ' ') : OSC_TYPES[part.oscTypeIndex]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── STEP SEQUENCER ── */}
        <div style={{ padding: '12px 20px 18px', background: '#141414' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 8, color: C.label, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Step Sequencer — {sp.name} &nbsp;
              <span style={{ color: sp.color }}>{sp.mode === 'drum' ? sp.drumVoice.replace('_', ' ').toUpperCase() : OSC_TYPES[sp.oscTypeIndex]}</span>
            </span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 8, color: sp.color }}>{sp.steps.filter(Boolean).length}/16</span>
          </div>

          {/* Beat labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 3, marginBottom: 3 }}>
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} style={{ fontSize: 7, color: i % 4 === 0 ? '#444' : '#2a2a2a', textAlign: 'center' }}>
                {i % 4 === 0 ? Math.floor(i / 4) + 1 : '·'}
              </span>
            ))}
          </div>

          {/* Steps */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 3 }}>
            {sp.steps.map((on, i) => {
              const cur = state.currentStep === i && state.playing;
              const vel = sp.stepVelocity[i];
              return (
                <div
                  key={i}
                  onClick={() => toggleStep(i)}
                  style={{
                    height: 44,
                    background: on ? sp.color + (cur ? 'ff' : 'bb') : cur ? '#242424' : '#1a1a1a',
                    border: `1px solid ${cur ? '#fff5' : on ? sp.color + '77' : '#252525'}`,
                    borderRadius: 4, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                    overflow: 'hidden', position: 'relative',
                    boxShadow: cur ? `0 0 6px ${sp.color}88` : 'none',
                    transition: 'background 0.05s',
                  }}
                >
                  <div style={{ width: '100%', height: `${vel * 65}%`, background: on ? '#fff3' : '#fff1', borderRadius: '0 0 3px 3px' }} />
                  {i % 4 === 0 && (
                    <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', width: 3, height: 3, borderRadius: '50%', background: on ? '#fff6' : '#2e2e2e' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Routing badge */}
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 7.5, color: C.label, letterSpacing: '0.08em' }}>SIGNAL:</span>
            {sp.mode === 'drum' ? (
              <span style={{ fontSize: 7.5, color: '#ff8844', background: '#ff884412', padding: '2px 8px', borderRadius: 3, letterSpacing: '0.07em' }}>
                ELECTRIBE 2 → TEKNO ({sp.drumVoice.replace('_', ' ').toUpperCase()})
              </span>
            ) : (
              <span style={{ fontSize: 7.5, color: '#4499ff', background: '#4499ff12', padding: '2px 8px', borderRadius: 3, letterSpacing: '0.07em' }}>
                ELECTRIBE 2 → MONOLOGUE (MIDI {sp.midiNote})
              </span>
            )}
            <span style={{ fontSize: 7.5, color: '#888', background: '#88888812', padding: '2px 8px', borderRadius: 3, letterSpacing: '0.07em' }}>
              + INTERNAL: {OSC_TYPES[sp.oscTypeIndex]} {sp.ifxOn ? `· IFX: ${IFX_TYPES[sp.ifxType]}` : ''}
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
