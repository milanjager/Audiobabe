import { useState, useRef, useCallback, useEffect } from 'react';
import { useKorgEngine, defaultKorgParams } from '../hooks/useKorgEngine';
import type { KorgParams } from '../hooks/useKorgEngine';

// ─── Colors — dark anodized navy-blue metallic ─────────────────────────────────
const BODY_BG = '#0f1a27';
const PANEL_BG = '#131f2e';
const KNOB_FILL = '#d4b896';
const LABEL_COLOR = '#6a8aaa';
const VALUE_COLOR = '#b8d0e4';
const ACCENT_ORANGE = '#e8952a';
const SECTION_BORDER = '1px solid #1c2f42';
const WHITE_KEY_COLOR = '#e8e4d8';
const BLACK_KEY_COLOR = '#14202d';
const ACTIVE_KEY = '#3b82f6';

// ─── KnobCtrl ──────────────────────────────────────────────────────────────────
function KnobCtrl({
  value, onChange, label, size = 46, color = KNOB_FILL, bipolar = false,
}: {
  value: number; onChange: (v: number) => void;
  label: string; size?: number; color?: string; bipolar?: boolean;
}) {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const normAngle = bipolar ? (value - 0.5) * 270 : -135 + value * 270;
  const r = size / 2 - 5;
  const cx = size / 2, cy = size / 2;
  const toRad = (a: number) => (a * Math.PI) / 180;

  const arcPath = () => {
    const startA = bipolar ? -90 : -135;
    const endA = bipolar ? normAngle - 90 : normAngle;
    if (Math.abs(endA - startA) < 1) return '';
    const sx = cx + r * Math.cos(toRad(startA - 90));
    const sy = cy + r * Math.sin(toRad(startA - 90));
    const ex = cx + r * Math.cos(toRad(endA - 90));
    const ey = cy + r * Math.sin(toRad(endA - 90));
    const large = Math.abs(endA - startA) > 180 ? 1 : 0;
    const sweep = endA > startA ? 1 : 0;
    return `M${sx},${sy} A${r},${r} 0 ${large} ${sweep} ${ex},${ey}`;
  };

  const dotAngle = bipolar ? normAngle - 90 : normAngle;
  const dotX = cx + (r + 1) * Math.cos(toRad(dotAngle - 90));
  const dotY = cy + (r + 1) * Math.sin(toRad(dotAngle - 90));

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
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'ns-resize', userSelect: 'none', minWidth: size }}
      onMouseDown={onMouseDown}
    >
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#091421" strokeWidth={5} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#182a3d" strokeWidth={3} />
        {arcPath() && <path d={arcPath()} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />}
        <circle cx={cx} cy={cy} r={r - 8} fill={BODY_BG} />
        <circle cx={dotX} cy={dotY} r={2.5} fill={color} />
      </svg>
      <span style={{ fontSize: 7.5, color: LABEL_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
    </div>
  );
}

// ─── WaveSelect ────────────────────────────────────────────────────────────────
const WAVE_SVG: Record<string, string> = {
  saw:   'M1,10 L7,2 L7,10 L13,2 L13,10 L19,2',
  tri:   'M1,10 L6,2 L11,10 L16,2 L19,5',
  sq:    'M1,10 L1,2 L8,2 L8,10 L14,10 L14,2 L19,2',
  noise: 'M1,7 L3,4 L5,10 L7,3 L9,9 L11,2 L13,8 L15,5 L17,9 L19,6',
};

function WaveSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 7.5, color: LABEL_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>WAVE</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            style={{
              width: 30, height: 18,
              background: value === opt ? '#1c3550' : '#0a1825',
              border: `1px solid ${value === opt ? '#2a5a8c' : '#1c2f42'}`,
              borderRadius: 3, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <svg viewBox="0 0 20 12" width={20} height={12}>
              <path d={WAVE_SVG[opt] ?? ''} fill="none"
                stroke={value === opt ? KNOB_FILL : '#385870'}
                strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── OctaveSelect (4-pos: 16'/8'/4'/2') ───────────────────────────────────────
const OCT_LABELS = ["16'", "8'", "4'", "2'"];

function OctaveSelect({ value, onChange }: { value: 0|1|2|3; onChange: (v: 0|1|2|3) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
      <span style={{ fontSize: 7.5, color: LABEL_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>OCTAVE</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {([3, 2, 1, 0] as const).map(v => (
          <button key={v} onClick={() => onChange(v)} title={OCT_LABELS[v]}
            style={{
              width: 28, height: 14, borderRadius: 2,
              background: value === v ? KNOB_FILL : '#0a1825',
              border: `1px solid ${value === v ? KNOB_FILL : '#1c2f42'}`,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <span style={{ fontSize: 7, color: value === v ? '#0d1b2a' : '#385870', fontWeight: 700 }}>{OCT_LABELS[v]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Switch (multi-position) ───────────────────────────────────────────────────
function SwitchCtrl<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void;
  options: { value: T; label: string }[]; label: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
      <span style={{ fontSize: 7.5, color: LABEL_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {options.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            style={{
              padding: '2px 7px', borderRadius: 2, fontSize: 7.5, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
              background: value === opt.value ? '#1c3550' : '#0a1825',
              color: value === opt.value ? VALUE_COLOR : '#385870',
              border: `1px solid ${value === opt.value ? '#2a5a8c' : '#1c2f42'}`,
              minWidth: 32, textAlign: 'center', whiteSpace: 'nowrap',
            }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Sect({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRight: SECTION_BORDER, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
      <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.2em', color: LABEL_COLOR, textTransform: 'uppercase', borderBottom: '1px solid #1c2f42', paddingBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Piano keyboard ────────────────────────────────────────────────────────────
const WK_W = 28, WK_H = 92, BK_W = 17, BK_H = 58;
const WHITE_SEMIS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_FRAC  = [0.65, 1.65, 3.65, 4.65, 5.65];
const BLACK_SEMIS = [1,    3,    6,    8,    10  ];

function KorgKeyboard({ activeKeys, onNoteOn, onNoteOff }: {
  activeKeys: Set<number>;
  onNoteOn: (m: number) => void;
  onNoteOff: (m: number) => void;
}) {
  const START = 48; // C3

  const whites: { midi: number; label: string }[] = [];
  for (let oct = 0; oct < 2; oct++) {
    WHITE_SEMIS.forEach((semi, i) => {
      whites.push({ midi: START + oct * 12 + semi, label: i === 0 ? `C${3 + oct}` : '' });
    });
  }
  whites.push({ midi: START + 24, label: 'C5' });

  const blacks: { midi: number; left: number }[] = [];
  for (let oct = 0; oct < 2; oct++) {
    BLACK_FRAC.forEach((frac, i) => {
      blacks.push({ midi: START + oct * 12 + BLACK_SEMIS[i], left: (oct * 7 + frac) * WK_W - BK_W / 2 });
    });
  }

  return (
    <div style={{ position: 'relative', width: whites.length * WK_W, height: WK_H, userSelect: 'none' }}>
      {whites.map((k, i) => (
        <div key={k.midi}
          onMouseDown={e => { e.preventDefault(); onNoteOn(k.midi); }}
          onMouseUp={() => onNoteOff(k.midi)}
          onMouseLeave={() => onNoteOff(k.midi)}
          style={{
            position: 'absolute', left: i * WK_W, top: 0,
            width: WK_W - 1, height: WK_H,
            background: activeKeys.has(k.midi) ? ACTIVE_KEY : WHITE_KEY_COLOR,
            border: `1px solid ${activeKeys.has(k.midi) ? ACTIVE_KEY : '#9ab'}`,
            borderRadius: '0 0 4px 4px', cursor: 'pointer', zIndex: 1,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4,
          }}>
          {k.label && (
            <span style={{ fontSize: 7, color: activeKeys.has(k.midi) ? '#fff' : '#8aa', pointerEvents: 'none' }}>
              {k.label}
            </span>
          )}
        </div>
      ))}
      {blacks.map(k => (
        <div key={k.midi}
          onMouseDown={e => { e.preventDefault(); onNoteOn(k.midi); }}
          onMouseUp={() => onNoteOff(k.midi)}
          onMouseLeave={() => onNoteOff(k.midi)}
          style={{
            position: 'absolute', left: k.left, top: 0,
            width: BK_W, height: BK_H,
            background: activeKeys.has(k.midi) ? ACTIVE_KEY : BLACK_KEY_COLOR,
            border: '1px solid #000',
            borderRadius: '0 0 3px 3px', cursor: 'pointer', zIndex: 2,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function KorgSynth() {
  const [params, setParams] = useState<KorgParams>(defaultKorgParams);
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const engine = useKorgEngine();

  const up = useCallback(<K extends keyof KorgParams>(key: K, val: KorgParams[K]) => {
    setParams(prev => ({ ...prev, [key]: val }));
    engine.updateParams({ [key]: val } as Partial<KorgParams>);
  }, [engine]);

  useEffect(() => { engine.updateParams(params); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const noteOn = useCallback((midi: number) => {
    engine.noteOn(midi);
    setActiveKeys(prev => new Set([...prev, midi]));
  }, [engine]);

  const noteOff = useCallback((midi: number) => {
    engine.noteOff(midi);
    setActiveKeys(prev => { const s = new Set(prev); s.delete(midi); return s; });
  }, [engine]);

  return (
    <section id="korg" className="py-16 px-4" style={{ background: '#080f17' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: KNOB_FILL, textTransform: 'uppercase' }}>KORG MONOLOGUE</span>
          <span style={{ fontSize: 10, color: LABEL_COLOR, marginLeft: 12, letterSpacing: '0.08em' }}>— analog synthesizer</span>
        </div>

        {/* Body */}
        <div style={{ borderRadius: 14, overflow: 'hidden', background: BODY_BG, border: '2px solid #1c2f42', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>

          {/* Accent bar */}
          <div style={{ height: 5, background: `linear-gradient(to right, ${ACCENT_ORANGE} 0%, #b06218 40%, transparent 100%)` }} />

          {/* Control panel */}
          <div style={{ display: 'flex', alignItems: 'stretch', background: PANEL_BG, borderBottom: '2px solid #1c2f42', overflowX: 'auto' }}>

            {/* Branding */}
            <div style={{ width: 82, padding: '12px 10px', borderRight: SECTION_BORDER, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: '0.08em', color: ACCENT_ORANGE, lineHeight: 1 }}>KORG</div>
                <div style={{ fontSize: 9, color: LABEL_COLOR, letterSpacing: '0.14em', marginTop: 4, fontStyle: 'italic' }}>monologue</div>
              </div>
              <div>
                <div style={{ background: '#1a3a5c', borderRadius: 3, padding: '2px 7px', display: 'inline-block' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: VALUE_COLOR, letterSpacing: '0.1em' }}>BL</span>
                </div>
              </div>
            </div>

            {/* VCO 1: wave + shape (no octave/pitch per Monologue spec) */}
            <Sect label="VCO 1">
              <WaveSelect
                value={params.vco1Wave}
                onChange={v => up('vco1Wave', v as KorgParams['vco1Wave'])}
                options={['saw', 'tri', 'sq']}
              />
              <KnobCtrl value={params.vco1Shape} onChange={v => up('vco1Shape', v)} label="SHAPE" />
            </Sect>

            {/* VCO 2: octave (4-pos), pitch, wave (saw/tri/noise), mode, shape */}
            <Sect label="VCO 2">
              <OctaveSelect
                value={params.vco2Octave}
                onChange={v => up('vco2Octave', v)}
              />
              <KnobCtrl
                value={params.vco2Pitch / 2 + 0.5}
                onChange={v => up('vco2Pitch', (v - 0.5) * 2)}
                label="PITCH" bipolar
              />
              <WaveSelect
                value={params.vco2Wave}
                onChange={v => up('vco2Wave', v as KorgParams['vco2Wave'])}
                options={['saw', 'tri', 'noise']}
              />
              <KnobCtrl value={params.vco2Shape} onChange={v => up('vco2Shape', v)} label="SHAPE" />
              <SwitchCtrl
                value={params.vco2Mode}
                onChange={v => up('vco2Mode', v)}
                options={[{ value: 'off', label: 'OFF' }, { value: 'sync', label: 'SYNC' }, { value: 'ring', label: 'RING' }]}
                label="MODE"
              />
            </Sect>

            {/* Mixer: VCO1 + VCO2 levels */}
            <Sect label="MIXER">
              <KnobCtrl value={params.vco1Level} onChange={v => up('vco1Level', v)} label="VCO1" />
              <KnobCtrl value={params.vco2Level} onChange={v => up('vco2Level', v)} label="VCO2" />
            </Sect>

            {/* Filter */}
            <Sect label="FILTER">
              <KnobCtrl value={params.filterCutoff} onChange={v => up('filterCutoff', v)} label="CUTOFF" color="#7ec8e3" size={50} />
              <KnobCtrl value={params.filterRes} onChange={v => up('filterRes', v)} label="RESO" color="#7ec8e3" />
              <KnobCtrl value={params.filterKeytrack} onChange={v => up('filterKeytrack', v)} label="KEY TRK" color="#7ec8e3" />
            </Sect>

            {/* Drive — separate section */}
            <Sect label="DRIVE">
              <KnobCtrl value={params.drive} onChange={v => up('drive', v)} label="DRIVE" color="#e87e3e" size={52} />
            </Sect>

            {/* EG — Attack + Decay only (Monologue is 2/3 stage) */}
            <Sect label="EG">
              <SwitchCtrl
                value={params.egType}
                onChange={v => up('egType', v)}
                options={[{ value: 'ad', label: 'A/D' }, { value: 'agd', label: 'A•D' }, { value: 'gate', label: 'GATE' }]}
                label="TYPE"
              />
              <KnobCtrl value={params.egAttack} onChange={v => up('egAttack', v)} label="ATTACK" color="#a78bfa" />
              <KnobCtrl value={params.egDecay} onChange={v => up('egDecay', v)} label="DECAY" color="#a78bfa" />
              <KnobCtrl value={params.egInt} onChange={v => up('egInt', v)} label="INT" color="#a78bfa" />
              <SwitchCtrl
                value={params.egTarget}
                onChange={v => up('egTarget', v)}
                options={[{ value: 'cutoff', label: 'FILT' }, { value: 'pitch', label: 'PITCH' }, { value: 'pitch2', label: 'P.2' }]}
                label="TARGET"
              />
            </Sect>

            {/* LFO */}
            <Sect label="LFO">
              <WaveSelect
                value={params.lfoWave}
                onChange={v => up('lfoWave', v as KorgParams['lfoWave'])}
                options={['tri', 'saw', 'sq']}
              />
              <SwitchCtrl
                value={params.lfoMode}
                onChange={v => up('lfoMode', v)}
                options={[{ value: 'fast', label: 'FAST' }, { value: 'slow', label: 'SLOW' }, { value: 'oneshot', label: '1-SHT' }]}
                label="MODE"
              />
              <KnobCtrl value={params.lfoRate} onChange={v => up('lfoRate', v)} label="RATE" color="#4ade80" />
              <KnobCtrl value={params.lfoInt} onChange={v => up('lfoInt', v)} label="INT" color="#4ade80" />
              <SwitchCtrl
                value={params.lfoTarget}
                onChange={v => up('lfoTarget', v)}
                options={[{ value: 'cutoff', label: 'FILT' }, { value: 'pitch', label: 'PITCH' }, { value: 'shape', label: 'SHPE' }]}
                label="TARGET"
              />
            </Sect>

            {/* Delay — bonus feature */}
            <Sect label="DELAY ✦">
              <KnobCtrl value={params.delayTime} onChange={v => up('delayTime', v)} label="TIME" color="#f59e0b" />
              <KnobCtrl value={params.delayFeedback} onChange={v => up('delayFeedback', v)} label="FEEDBK" color="#f59e0b" />
              <KnobCtrl value={params.delayMix} onChange={v => up('delayMix', v)} label="MIX" color="#f59e0b" />
            </Sect>

            {/* Master volume */}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 68 }}>
              <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.2em', color: LABEL_COLOR, textTransform: 'uppercase', borderBottom: '1px solid #1c2f42', paddingBottom: 4, width: '100%', textAlign: 'center' }}>
                MASTER
              </div>
              <KnobCtrl value={params.masterVol} onChange={v => up('masterVol', v)} label="VOLUME" size={54} color={KNOB_FILL} />
            </div>
          </div>

          {/* Keyboard */}
          <div style={{ padding: '16px 20px 22px', background: '#0a1520', display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              {/* LED strip */}
              <div style={{ display: 'flex', gap: 5 }}>
                {Array.from({ length: 25 }, (_, i) => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: activeKeys.size > 0 && i % 5 === 0 ? '#00d4ff' : '#0c1e30',
                    boxShadow: activeKeys.size > 0 && i % 5 === 0 ? '0 0 5px #00d4ff' : 'none',
                    transition: 'all 0.08s',
                  }} />
                ))}
              </div>
              <KorgKeyboard activeKeys={activeKeys} onNoteOn={noteOn} onNoteOff={noteOff} />
              <div style={{ fontSize: 8, color: '#243545', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Click keys to play · Drag knobs up/down · ✦ Delay is a bonus feature
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
