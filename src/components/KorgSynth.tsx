import { useState, useRef, useCallback, useEffect } from 'react';
import { useKorgEngine, defaultKorgParams } from '../hooks/useKorgEngine';
import type { KorgParams } from '../hooks/useKorgEngine';

// ─── Color scheme ──────────────────────────────────────────────────────────────
const BODY_BG = '#0d1b2a';
const PANEL_BG = '#111e2d';
const ACCENT_BLUE = '#1a3a5c';
const KNOB_FILL = '#d4b896';
const LABEL_COLOR = '#8aa0b4';
const VALUE_COLOR = '#c8dce8';
const ACCENT_ORANGE = '#e8952a';
const WHITE_KEY_COLOR = '#e8e4d9';
const BLACK_KEY_COLOR = '#1a1a22';
const ACTIVE_KEY_COLOR = '#3b82f6';
const SECTION_BORDER = '1px solid #1a2f45';

// ─── KnobCtrl ──────────────────────────────────────────────────────────────────
function KnobCtrl({
  value, onChange, label, size = 48, color = KNOB_FILL, bipolar = false,
}: {
  value: number; onChange: (v: number) => void;
  label: string; size?: number; color?: string; bipolar?: boolean;
}) {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const angle = bipolar
    ? (value - 0.5) * 270
    : -135 + value * 270;

  const r = size / 2 - 5;
  const cx = size / 2;
  const cy = size / 2;
  const rad = (a: number) => (a * Math.PI) / 180;

  const arcPath = () => {
    const startA = bipolar ? -90 : -135;
    const endA = bipolar ? angle - 90 : angle;
    if (Math.abs(endA - startA) < 1) return '';
    const sx = cx + r * Math.cos(rad(startA - 90));
    const sy = cy + r * Math.sin(rad(startA - 90));
    const ex = cx + r * Math.cos(rad(endA - 90));
    const ey = cy + r * Math.sin(rad(endA - 90));
    const large = Math.abs(endA - startA) > 180 ? 1 : 0;
    const sweep = endA > startA ? 1 : 0;
    return `M${sx},${sy} A${r},${r} 0 ${large} ${sweep} ${ex},${ey}`;
  };

  const dotAngle = bipolar ? angle - 90 : angle;
  const dotX = cx + (r + 1) * Math.cos(rad(dotAngle - 90));
  const dotY = cy + (r + 1) * Math.sin(rad(dotAngle - 90));

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
  };

  return (
    <div className="flex flex-col items-center gap-1 cursor-ns-resize select-none" onMouseDown={onMouseDown}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0a1520" strokeWidth={4} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#162535" strokeWidth={3} />
        {arcPath() && (
          <path d={arcPath()} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        )}
        <circle cx={cx} cy={cy} r={r - 7} fill="#0d1b2a" />
        <circle cx={dotX} cy={dotY} r={2.5} fill={color} />
      </svg>
      <span style={{ fontSize: 8, color: LABEL_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
    </div>
  );
}

// ─── WaveSelect ────────────────────────────────────────────────────────────────
const WAVE_ICONS: Record<string, string> = {
  saw: 'M1,10 L7,2 L7,10 L13,2 L13,10 L19,2',
  tri: 'M1,10 L5,2 L10,10 L15,2 L19,10',
  sq: 'M1,10 L1,2 L7,2 L7,10 L13,10 L13,2 L19,2 L19,10',
  noise: 'M1,6 L3,3 L5,9 L7,4 L9,8 L11,2 L13,9 L15,5 L17,7 L19,6',
  sh: 'M1,6 L1,3 L5,3 L5,6 L5,9 L9,9 L9,6 L9,3 L13,3 L13,9 L17,9 L17,4',
};

function WaveSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <span style={{ fontSize: 8, color: LABEL_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>WAVE</span>
      <div className="flex flex-col gap-0.5">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              width: 32, height: 20,
              background: value === opt.value ? ACCENT_BLUE : '#0a1520',
              border: `1px solid ${value === opt.value ? '#2a5a8c' : '#162535'}`,
              borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 20 12" width={22} height={12}>
              <path d={WAVE_ICONS[opt.value] ?? ''} fill="none" stroke={value === opt.value ? KNOB_FILL : '#3a5570'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── OctaveSelect ──────────────────────────────────────────────────────────────
function OctaveSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const opts = [-2, -1, 0, 1, 2];
  return (
    <div className="flex flex-col gap-1">
      <span style={{ fontSize: 8, color: LABEL_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>OCT</span>
      <div className="flex flex-col gap-1 items-center">
        {opts.slice().reverse().map(v => (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              width: 12, height: 12, borderRadius: '50%',
              background: value === v ? KNOB_FILL : '#0a1520',
              border: `1px solid ${value === v ? KNOB_FILL : '#2a3f55'}`,
              cursor: 'pointer',
            }}
            title={`Octave ${v > 0 ? '+' : ''}${v}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── SynthSection ──────────────────────────────────────────────────────────────
function SynthSection({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <div style={{
      borderRight: SECTION_BORDER,
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      flex: flex ? 1 : undefined,
    }}>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: LABEL_COLOR, textTransform: 'uppercase', borderBottom: '1px solid #1a2f45', paddingBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Toggle Button ─────────────────────────────────────────────────────────────
function ToggleBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 8px',
        borderRadius: 3,
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        background: active ? ACCENT_BLUE : '#0a1520',
        color: active ? VALUE_COLOR : '#3a5570',
        border: `1px solid ${active ? '#2a5a8c' : '#162535'}`,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

// ─── Piano Keyboard ────────────────────────────────────────────────────────────
const WHITE_KEY_W = 30;
const WHITE_KEY_H = 100;
const BLACK_KEY_W = 19;
const BLACK_KEY_H = 62;

// Notes per octave: C=0 D=2 E=4 F=5 G=7 A=9 B=11
// Black keys after C, D, F, G, A (indices 0,2,5,7,9 in semitones)
const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const BLACK_POSITIONS: number[] = [0.67, 1.67, 3.67, 4.67, 5.67]; // fractional white-key positions

function KorgKeyboard({
  activeKeys,
  onNoteOn,
  onNoteOff,
}: {
  activeKeys: Set<number>;
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
}) {
  // C3 = midi 48, we do C3 to C5 (25 keys = 2 octaves + C)
  const START_OCTAVE = 3;
  const START_MIDI = 48; // C3

  // Build white key list
  const whiteKeys: { midi: number; label: string }[] = [];
  for (let oct = 0; oct < 2; oct++) {
    WHITE_SEMITONES.forEach((semi, i) => {
      const midi = START_MIDI + oct * 12 + semi;
      const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      const octave = START_OCTAVE + oct;
      const label = i === 0 ? `${noteNames[i]}${octave}` : '';
      whiteKeys.push({ midi, label });
    });
  }
  // Add top C (C5)
  whiteKeys.push({ midi: START_MIDI + 24, label: 'C5' });

  const totalWhite = whiteKeys.length; // 15
  const containerW = totalWhite * WHITE_KEY_W;

  // Build black key list
  const blackKeys: { midi: number; leftPx: number }[] = [];
  for (let oct = 0; oct < 2; oct++) {
    const blackSemis = [1, 3, 6, 8, 10]; // C# D# F# G# A#
    BLACK_POSITIONS.forEach((pos, i) => {
      const midi = START_MIDI + oct * 12 + blackSemis[i];
      const leftPx = (oct * 7 + pos) * WHITE_KEY_W - BLACK_KEY_W / 2;
      blackKeys.push({ midi, leftPx });
    });
  }

  const handleNoteOn = (midi: number, e: React.MouseEvent) => {
    e.preventDefault();
    onNoteOn(midi);
  };
  const handleNoteOff = (midi: number) => {
    onNoteOff(midi);
  };

  return (
    <div style={{ position: 'relative', width: containerW, height: WHITE_KEY_H, userSelect: 'none' }}>
      {/* White keys */}
      {whiteKeys.map((key, i) => (
        <div
          key={key.midi}
          onMouseDown={e => handleNoteOn(key.midi, e)}
          onMouseUp={() => handleNoteOff(key.midi)}
          onMouseLeave={() => handleNoteOff(key.midi)}
          style={{
            position: 'absolute',
            left: i * WHITE_KEY_W,
            top: 0,
            width: WHITE_KEY_W - 1,
            height: WHITE_KEY_H,
            background: activeKeys.has(key.midi) ? ACTIVE_KEY_COLOR : WHITE_KEY_COLOR,
            border: `1px solid ${activeKeys.has(key.midi) ? ACTIVE_KEY_COLOR : '#aaa'}`,
            borderRadius: '0 0 4px 4px',
            cursor: 'pointer',
            zIndex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: 4,
            transition: 'background 0.05s',
          }}
        >
          {key.label && (
            <span style={{ fontSize: 8, color: activeKeys.has(key.midi) ? '#fff' : '#888', pointerEvents: 'none' }}>
              {key.label}
            </span>
          )}
        </div>
      ))}
      {/* Black keys */}
      {blackKeys.map(key => (
        <div
          key={key.midi}
          onMouseDown={e => handleNoteOn(key.midi, e)}
          onMouseUp={() => handleNoteOff(key.midi)}
          onMouseLeave={() => handleNoteOff(key.midi)}
          style={{
            position: 'absolute',
            left: key.leftPx,
            top: 0,
            width: BLACK_KEY_W,
            height: BLACK_KEY_H,
            background: activeKeys.has(key.midi) ? ACTIVE_KEY_COLOR : BLACK_KEY_COLOR,
            border: `1px solid ${activeKeys.has(key.midi) ? ACTIVE_KEY_COLOR : '#000'}`,
            borderRadius: '0 0 3px 3px',
            cursor: 'pointer',
            zIndex: 2,
            transition: 'background 0.05s',
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function KorgSynth() {
  const [params, setParams] = useState<KorgParams>(defaultKorgParams);
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const engine = useKorgEngine();

  const updateParam = useCallback(<K extends keyof KorgParams>(key: K, val: KorgParams[K]) => {
    setParams(prev => {
      const next = { ...prev, [key]: val };
      engine.updateParams({ [key]: val });
      return next;
    });
  }, [engine]);

  useEffect(() => {
    engine.updateParams(params);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNoteOn = useCallback((midi: number) => {
    engine.noteOn(midi);
    setActiveKeys(prev => new Set([...prev, midi]));
  }, [engine]);

  const handleNoteOff = useCallback((midi: number) => {
    engine.noteOff(midi);
    setActiveKeys(prev => { const s = new Set(prev); s.delete(midi); return s; });
  }, [engine]);

  const vco1WaveOpts = [
    { value: 'saw', label: 'SAW' },
    { value: 'tri', label: 'TRI' },
    { value: 'sq', label: 'SQ' },
    { value: 'noise', label: 'NS' },
  ];
  const vco2WaveOpts = vco1WaveOpts;
  const lfoWaveOpts = [
    { value: 'tri', label: 'TRI' },
    { value: 'saw', label: 'SAW' },
    { value: 'sq', label: 'SQ' },
    { value: 'sh', label: 'S&H' },
  ];

  return (
    <section id="korg" className="py-16 px-4" style={{ background: '#080f17' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: KNOB_FILL, textTransform: 'uppercase' }}>
            KORG MONOLOGUE
          </span>
        </div>

        {/* Main body */}
        <div style={{ borderRadius: 12, overflow: 'hidden', background: BODY_BG, border: '2px solid #1a2f45' }}>

          {/* Control panel */}
          <div style={{ display: 'flex', alignItems: 'stretch', background: PANEL_BG, borderBottom: '2px solid #1a2f45', overflowX: 'auto' }}>

            {/* Korg branding */}
            <div style={{ width: 88, padding: '14px 12px', borderRight: SECTION_BORDER, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.1em', color: ACCENT_ORANGE, lineHeight: 1 }}>KORG</div>
                <div style={{ fontSize: 9, color: LABEL_COLOR, letterSpacing: '0.15em', marginTop: 3, fontStyle: 'italic' }}>monologue</div>
              </div>
              <div>
                <div style={{ background: ACCENT_BLUE, borderRadius: 3, padding: '2px 7px', display: 'inline-block', marginBottom: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: VALUE_COLOR, letterSpacing: '0.1em' }}>BL</span>
                </div>
                <div style={{ width: '100%', height: 2, background: `linear-gradient(to right, ${ACCENT_ORANGE}, transparent)`, borderRadius: 1 }} />
              </div>
            </div>

            {/* VCO 1 */}
            <SynthSection label="VCO 1">
              <WaveSelect value={params.vco1Wave} onChange={v => updateParam('vco1Wave', v as KorgParams['vco1Wave'])} options={vco1WaveOpts} />
              <KnobCtrl value={params.vco1Shape} onChange={v => updateParam('vco1Shape', v)} label="SHAPE" />
              <KnobCtrl value={params.vco1Level} onChange={v => updateParam('vco1Level', v)} label="LEVEL" />
            </SynthSection>

            {/* VCO 2 */}
            <SynthSection label="VCO 2">
              <OctaveSelect value={params.vco2Octave} onChange={v => updateParam('vco2Octave', v as 0|1|2|3)} />
              <WaveSelect value={params.vco2Wave} onChange={v => updateParam('vco2Wave', v as KorgParams['vco2Wave'])} options={vco2WaveOpts} />
              <KnobCtrl value={params.vco2Pitch / 2 + 0.5} onChange={v => updateParam('vco2Pitch', (v - 0.5) * 2)} label="PITCH" bipolar />
              <KnobCtrl value={params.vco2Shape} onChange={v => updateParam('vco2Shape', v)} label="SHAPE" />
              <KnobCtrl value={params.vco2Level} onChange={v => updateParam('vco2Level', v)} label="LEVEL" />
              <div className="flex flex-col gap-1" style={{ marginTop: 4 }}>
                <ToggleBtn active={params.vco2Mode !== 'off'} onClick={() => updateParam('vco2Mode', params.vco2Mode === 'off' ? 'sync' : params.vco2Mode === 'sync' ? 'ring' : 'off')} label={params.vco2Mode === 'off' ? 'FREE' : params.vco2Mode.toUpperCase()} />
              </div>
            </SynthSection>

            {/* Filter */}
            <SynthSection label="FILTER">
              <KnobCtrl value={params.filterCutoff} onChange={v => updateParam('filterCutoff', v)} label="CUTOFF" color="#7ec8e3" />
              <KnobCtrl value={params.filterRes} onChange={v => updateParam('filterRes', v)} label="RESO" color="#7ec8e3" />
              <KnobCtrl value={params.egInt / 2 + 0.5} onChange={v => updateParam('egInt', (v - 0.5) * 2)} label="EG INT" color="#7ec8e3" bipolar />
              <KnobCtrl value={params.filterKeytrack} onChange={v => updateParam('filterKeytrack', v)} label="KEY TRK" color="#7ec8e3" />
              <KnobCtrl value={params.drive} onChange={v => updateParam('drive', v)} label="DRIVE" color="#e87e3e" />
            </SynthSection>

            {/* AMP EG */}
            <SynthSection label="AMP EG">
              <KnobCtrl value={params.egAttack} onChange={v => updateParam('egAttack', v)} label="ATTACK" color="#a78bfa" />
              <KnobCtrl value={params.egDecay} onChange={v => updateParam('egDecay', v)} label="DECAY" color="#a78bfa" />
              <KnobCtrl value={params.egInt} onChange={v => updateParam('egInt', v)} label="INT" color="#a78bfa" />
            </SynthSection>

            {/* LFO */}
            <SynthSection label="LFO">
              <WaveSelect value={params.lfoWave} onChange={v => updateParam('lfoWave', v as KorgParams['lfoWave'])} options={lfoWaveOpts} />
              <KnobCtrl value={params.lfoRate} onChange={v => updateParam('lfoRate', v)} label="RATE" color="#4ade80" />
              <KnobCtrl value={params.lfoInt} onChange={v => updateParam('lfoInt', v)} label="INT" color="#4ade80" />
              <div className="flex flex-col gap-1" style={{ marginTop: 4 }}>
                <span style={{ fontSize: 8, color: LABEL_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>TARGET</span>
                {(['pitch', 'cutoff', 'shape'] as const).map(t => (
                  <ToggleBtn key={t} active={params.lfoTarget === t} onClick={() => updateParam('lfoTarget', t)} label={t.toUpperCase()} />
                ))}
              </div>
            </SynthSection>

            {/* Delay */}
            <SynthSection label="DELAY">
              <KnobCtrl value={params.delayTime} onChange={v => updateParam('delayTime', v)} label="TIME" color="#f59e0b" />
              <KnobCtrl value={params.delayFeedback} onChange={v => updateParam('delayFeedback', v)} label="FEEDBK" color="#f59e0b" />
              <KnobCtrl value={params.delayMix} onChange={v => updateParam('delayMix', v)} label="MIX" color="#f59e0b" />
            </SynthSection>

            {/* Master */}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 70 }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: LABEL_COLOR, textTransform: 'uppercase', borderBottom: '1px solid #1a2f45', paddingBottom: 4, width: '100%', textAlign: 'center' }}>
                MASTER
              </div>
              <KnobCtrl value={params.masterVol} onChange={v => updateParam('masterVol', v)} label="VOLUME" size={56} color={KNOB_FILL} />
            </div>
          </div>

          {/* Keyboard area */}
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', background: '#0a1520', borderTop: '1px solid #0d1b2a' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {/* LED strip above keyboard */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {Array.from({ length: 25 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 6, height: 6,
                      borderRadius: '50%',
                      background: activeKeys.size > 0 && i % 12 === 0 ? '#00d4ff' : '#0d2035',
                      boxShadow: activeKeys.size > 0 && i % 12 === 0 ? '0 0 6px #00d4ff' : 'none',
                      transition: 'background 0.1s',
                    }}
                  />
                ))}
              </div>
              <KorgKeyboard activeKeys={activeKeys} onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
              <div style={{ fontSize: 9, color: '#2a4560', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Click keys to play · Drag knobs to adjust
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
