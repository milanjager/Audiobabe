import { useState, useRef, useCallback, useEffect } from 'react';
import { useNeuralEngine, ROLE_SYNTH_OPTIONS } from '../hooks/useNeuralEngine';
import type { NStep, NTrack, ScaleMode, TrackRole } from '../hooks/useNeuralEngine';

const MELODIC_ROLES = new Set<TrackRole>(['bass', 'lead', 'chord', 'fx']);
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// ─── Step Pad ─────────────────────────────────────────────────────────────────

function StepPad({ step, isCurrent, trackColor, groupStart, onClick, onRightClick }: {
  step: NStep; isCurrent: boolean; trackColor: string; groupStart: boolean;
  onClick: () => void; onRightClick: (e: React.MouseEvent) => void;
}) {
  const bg = step.active && isCurrent ? trackColor
    : step.active ? trackColor + '55'
    : isCurrent ? '#18182a'
    : '#0b0b16';

  const glow = step.active && isCurrent ? `0 0 14px ${trackColor}, 0 0 28px ${trackColor}66`
    : step.active ? `0 0 5px ${trackColor}55`
    : isCurrent ? `inset 0 0 6px ${trackColor}22`
    : undefined;

  return (
    <div
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onRightClick(e); }}
      style={{
        width: 30, height: 30, position: 'relative',
        background: bg,
        border: `1px solid ${step.active ? trackColor + '77' : '#181825'}`,
        borderRadius: 5, cursor: 'pointer', flexShrink: 0,
        boxShadow: glow,
        transition: 'box-shadow 0.06s, background 0.06s',
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

// ─── Track Row ─────────────────────────────────────────────────────────────────

function TrackRow({
  track, currentStep, isSelected,
  onToggleStep, onRightClickStep, onMute, onSelect, onRandomize, onClear,
}: {
  track: NTrack; currentStep: number; isSelected: boolean;
  onToggleStep: (si: number) => void;
  onRightClickStep: (e: React.MouseEvent, si: number) => void;
  onMute: () => void; onSelect: () => void;
  onRandomize: () => void; onClear: () => void;
}) {
  const activeCount = track.steps.filter(s => s.active).length;

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '3px 0',
      borderBottom: '1px solid #0a0a14',
      background: isSelected ? track.color + '07' : '#07070d',
      borderLeft: `3px solid ${isSelected ? track.color : 'transparent'}`,
      transition: 'border-color 0.15s, background 0.15s',
      gap: 3,
    }}>
      {/* Track label */}
      <div
        onClick={onSelect}
        title="Click to edit synth parameters"
        style={{
          width: 104, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '0 4px 0 6px', cursor: 'pointer',
        }}
      >
        <div style={{
          width: 4, height: 28, borderRadius: 2, flexShrink: 0,
          background: track.muted ? '#1a1a2a' : track.color,
          boxShadow: !track.muted && activeCount > 0 ? `0 0 5px ${track.color}aa` : 'none',
          transition: 'all 0.2s',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 8, letterSpacing: '0.12em', fontWeight: 700, color: track.muted ? '#252535' : track.color, textTransform: 'uppercase', transition: 'color 0.2s' }}>{track.name}</div>
          <div style={{ fontSize: 6, color: '#1e1e2e', letterSpacing: '0.06em', marginTop: 1 }}>{track.synthType.toUpperCase()}</div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onMute(); }}
          style={{
            width: 18, height: 18, flexShrink: 0,
            background: track.muted ? track.color + '22' : 'transparent',
            border: `1px solid ${track.muted ? track.color + '66' : '#161626'}`,
            borderRadius: 3, cursor: 'pointer',
            color: track.muted ? track.color : '#222232',
            fontSize: 7, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >M</button>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        {track.steps.map((step, si) => (
          <StepPad
            key={si} step={step}
            isCurrent={currentStep === si}
            trackColor={track.color}
            groupStart={si > 0 && si % 4 === 0}
            onClick={() => onToggleStep(si)}
            onRightClick={e => onRightClickStep(e, si)}
          />
        ))}
      </div>

      {/* RND / CLR */}
      <div style={{ width: 52, flexShrink: 0, display: 'flex', gap: 3, padding: '0 5px 0 3px' }}>
        <button onClick={onRandomize} title="Randomize" style={{
          width: 22, height: 18, background: 'transparent',
          border: '1px solid #141424', borderRadius: 3, cursor: 'pointer',
          color: '#1e1e2e', fontSize: 6, fontWeight: 700,
        }}>RND</button>
        <button onClick={onClear} title="Clear" style={{
          width: 22, height: 18, background: 'transparent',
          border: '1px solid #141424', borderRadius: 3, cursor: 'pointer',
          color: '#1e1e2e', fontSize: 6, fontWeight: 700,
        }}>CLR</button>
      </div>
    </div>
  );
}

// ─── Synth Editor ─────────────────────────────────────────────────────────────

function SynthEditor({ track, onUpdate }: {
  track: NTrack;
  onUpdate: (p: Partial<NTrack>) => void;
}) {
  const opts = ROLE_SYNTH_OPTIONS[track.role];
  const noteName = `${NOTE_NAMES[track.rootNote % 12]}${Math.floor(track.rootNote / 12) - 1}`;

  const sliders: { label: string; key: keyof NTrack; min: number; max: number; step: number; fmt: (v: number) => string; color: string }[] = [
    { label: 'FILTER', key: 'filterFreq', min: 80, max: 18000, step: 1, fmt: v => `${Math.round(v)}Hz`, color: '#06b6d4' },
    { label: 'RESONANCE', key: 'filterRes', min: 0.1, max: 20, step: 0.1, fmt: v => v.toFixed(1), color: '#06b6d4' },
    { label: 'ATTACK', key: 'attack', min: 0.001, max: 0.4, step: 0.001, fmt: v => `${Math.round(v * 1000)}ms`, color: '#22c55e' },
    { label: 'DECAY', key: 'decay', min: 0.01, max: 2, step: 0.01, fmt: v => `${Math.round(v * 1000)}ms`, color: '#22c55e' },
    { label: 'VOLUME', key: 'volume', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v * 100)}%`, color: track.color },
    { label: 'REVERB SEND', key: 'reverbSend', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v * 100)}%`, color: '#a855f7' },
    { label: 'DELAY SEND', key: 'delaySend', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v * 100)}%`, color: '#f97316' },
  ];

  return (
    <div style={{ padding: '10px 12px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 4, height: 14, borderRadius: 2, background: track.color, boxShadow: `0 0 6px ${track.color}` }} />
        <span style={{ fontSize: 10, letterSpacing: '0.16em', color: track.color, fontWeight: 700 }}>{track.name}</span>
        <span style={{ fontSize: 6, color: '#1e1e2e', marginLeft: 'auto', letterSpacing: '0.12em' }}>SYNTH EDITOR</span>
      </div>

      {/* Oscillator type */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 7, color: '#2a2a3a', letterSpacing: '0.14em', marginBottom: 5 }}>OSCILLATOR</div>
        <div style={{ display: 'flex', gap: 3 }}>
          {opts.map(o => (
            <button key={o.id} onClick={() => onUpdate({ synthType: o.id })} style={{
              flex: 1, padding: '5px 2px',
              background: track.synthType === o.id ? track.color + '22' : 'transparent',
              border: `1px solid ${track.synthType === o.id ? track.color : '#1a1a2a'}`,
              borderRadius: 4,
              color: track.synthType === o.id ? track.color : '#2a2a3a',
              fontSize: 8, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.12s',
            }}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Root note for melodic tracks */}
      {MELODIC_ROLES.has(track.role) && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 7, color: '#2a2a3a', letterSpacing: '0.12em' }}>ROOT NOTE</span>
            <span style={{ fontSize: 8, color: '#888', fontFamily: 'monospace' }}>{noteName}</span>
          </div>
          <input type="range" min={24} max={84} value={track.rootNote}
            onChange={e => onUpdate({ rootNote: Number(e.target.value) })}
            style={{ width: '100%', height: 12, accentColor: track.color, cursor: 'pointer', margin: 0 }} />
        </div>
      )}

      {/* Parameter sliders */}
      {sliders.map(s => (
        <div key={s.key} style={{ marginBottom: 9 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 7, color: '#2a2a3a', letterSpacing: '0.1em' }}>{s.label}</span>
            <span style={{ fontSize: 7, color: '#444', fontFamily: 'monospace' }}>{s.fmt(track[s.key] as number)}</span>
          </div>
          <input type="range"
            min={s.min} max={s.max} step={s.step}
            value={track[s.key] as number}
            onChange={e => onUpdate({ [s.key]: Number(e.target.value) } as Partial<NTrack>)}
            style={{ width: '100%', height: 12, accentColor: s.color, cursor: 'pointer', margin: 0 }} />
        </div>
      ))}
    </div>
  );
}

// ─── Mixer Channel ─────────────────────────────────────────────────────────────

function MixerChannel({ track, isSelected, onSelect, onMute, onVolumeChange }: {
  track: NTrack; isSelected: boolean;
  onSelect: () => void; onMute: () => void; onVolumeChange: (v: number) => void;
}) {
  const activeCount = track.steps.filter(s => s.active).length;

  return (
    <div
      onClick={onSelect}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '6px 4px',
        background: isSelected ? track.color + '0a' : 'transparent',
        borderTop: `2px solid ${isSelected ? track.color : 'transparent'}`,
        cursor: 'pointer', transition: 'all 0.15s', minWidth: 44,
      }}
    >
      <div style={{ fontSize: 6, color: track.muted ? '#1e1e2e' : track.color, letterSpacing: '0.1em', fontWeight: 700 }}>{track.name}</div>
      <div style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: !track.muted && activeCount > 0 ? track.color : '#111120',
        boxShadow: !track.muted && activeCount > 0 ? `0 0 5px ${track.color}` : 'none',
        transition: 'all 0.1s',
      }} />
      {/* Vertical fader */}
      <div style={{ position: 'relative', width: 20, height: 56, flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: '#0b0b16', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${track.volume * 100}%`,
            background: track.muted ? '#161626' : `linear-gradient(to top, ${track.color}cc, ${track.color}55)`,
            borderRadius: '0 0 3px 3px', transition: 'height 0.05s',
          }} />
        </div>
        <input
          type="range" min={0} max={1} step={0.01} value={track.volume}
          onChange={e => { e.stopPropagation(); onVolumeChange(Number(e.target.value)); }}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer',
            writingMode: 'vertical-lr', direction: 'rtl',
          } as React.CSSProperties}
        />
      </div>
      <div style={{ fontSize: 6, color: '#252535', fontFamily: 'monospace' }}>{Math.round(track.volume * 100)}</div>
      <button
        onClick={e => { e.stopPropagation(); onMute(); }}
        style={{
          width: 22, height: 14,
          background: track.muted ? track.color + '22' : 'transparent',
          border: `1px solid ${track.muted ? track.color + '55' : '#141424'}`,
          borderRadius: 2, cursor: 'pointer',
          color: track.muted ? track.color : '#1e1e2e',
          fontSize: 6, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >M</button>
    </div>
  );
}

// ─── Param Lock Editor ─────────────────────────────────────────────────────────

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
            fontSize: 7, cursor: 'pointer', fontWeight: 700,
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
  active, filter, reverb, delay, onEnable, onDisable, videoRef, displayRef,
}: {
  active: boolean; filter: number; reverb: number; delay: number;
  onEnable: () => void; onDisable: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  displayRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const zones = [
    { label: 'FILTER', sub: 'Left hand',  value: filter, color: '#f97316' },
    { label: 'REVERB', sub: 'Both hands', value: reverb, color: '#a855f7' },
    { label: 'DELAY',  sub: 'Right hand', value: delay,  color: '#06b6d4' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '10px', gap: 8, flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: active ? '#22c55e' : '#1a1a2a',
            boxShadow: active ? '0 0 7px #22c55e' : 'none',
            transition: 'all 0.3s',
          }} />
          <span style={{ fontSize: 8, letterSpacing: '0.14em', color: active ? '#22c55e' : '#2a2a3a', fontWeight: 700 }}>MOTION CTRL</span>
        </div>
        {active && (
          <button onClick={onDisable} style={{
            background: 'transparent', border: '1px solid #2a2a3a',
            borderRadius: 3, color: '#444', fontSize: 7, cursor: 'pointer', padding: '2px 6px',
          }}>OFF</button>
        )}
      </div>

      <div style={{
        width: '100%', aspectRatio: '4/3',
        background: '#040408',
        border: `1px solid ${active ? '#22c55e33' : '#0f0f18'}`,
        borderRadius: 6, overflow: 'hidden', position: 'relative',
        transition: 'border-color 0.3s',
      }}>
        {active ? (
          <>
            <canvas ref={displayRef} width={194} height={146} style={{ width: '100%', height: '100%', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
              {zones.map((z, i) => (
                <div key={i} style={{
                  flex: 1,
                  borderRight: i < 2 ? `1px solid ${z.color}33` : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3,
                }}>
                  <span style={{ fontSize: 7, color: z.color, fontWeight: 700, background: '#00000099', padding: '1px 4px', borderRadius: 2, opacity: z.value > 0.04 ? 1 : 0.35 }}>{z.label[0]}</span>
                  <div style={{
                    position: 'absolute', bottom: 0,
                    left: `${i * 33.33}%`, width: '33.33%',
                    height: `${Math.round(z.value * 100 * 0.45)}%`,
                    background: z.color + '55', transition: 'height 0.06s',
                  }} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '6px 10px' }}>
            <div style={{ display: 'flex', width: '100%', height: 44, borderRadius: 5, overflow: 'hidden', flexShrink: 0 }}>
              {zones.map((z, i) => (
                <div key={i} style={{
                  flex: 1, background: z.color + '12',
                  borderRight: i < 2 ? `1px solid ${z.color}22` : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                }}>
                  <span style={{ fontSize: 10, color: z.color + 'bb' }}>{i === 0 ? '🤚' : i === 1 ? '✋' : '👋'}</span>
                  <span style={{ fontSize: 6, color: z.color + 'aa', letterSpacing: '0.1em', fontWeight: 700 }}>{z.label[0]}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 7, color: '#2a2a3a', textAlign: 'center', lineHeight: 1.7, letterSpacing: '0.06em' }}>
              MOVE HANDS IN VIEW<br/>
              <span style={{ color: '#f97316aa' }}>L</span> FILTER ·{' '}
              <span style={{ color: '#a855f7aa' }}>C</span> REVERB ·{' '}
              <span style={{ color: '#06b6d4aa' }}>R</span> DELAY
            </div>
          </div>
        )}
      </div>

      <video ref={videoRef} autoPlay muted playsInline style={{ display: 'none', width: 1, height: 1 }} />

      {active ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {zones.map(z => (
            <div key={z.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 8, color: z.color, fontWeight: 700, letterSpacing: '0.1em' }}>{z.label}</span>
                <span style={{ fontSize: 8, fontFamily: 'monospace', color: z.value > 0.04 ? z.color : '#2a2a3a' }}>{Math.round(z.value * 100)}%</span>
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
          <button onClick={onEnable} style={{
            width: '100%', padding: '10px 0',
            background: 'linear-gradient(135deg, #22c55e18, #22c55e0a)',
            border: '1px solid #22c55e44', borderRadius: 6,
            color: '#22c55e', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', cursor: 'pointer',
          }}>◎ ACTIVATE CAMERA</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {zones.map(z => (
              <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 3, height: 28, background: z.color + '55', borderRadius: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 8, color: z.color, fontWeight: 700, letterSpacing: '0.1em' }}>{z.label}</div>
                  <div style={{ fontSize: 7, color: '#2a2a3a', letterSpacing: '0.06em', marginTop: 1 }}>{z.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Scale options ─────────────────────────────────────────────────────────────

const SCALE_OPTIONS: { key: number; mode: ScaleMode; label: string }[] = [
  { key: 9, mode: 'phrygian',   label: 'A PHRY' },
  { key: 9, mode: 'minor',      label: 'A MIN'  },
  { key: 9, mode: 'pentatonic', label: 'A PENT' },
  { key: 0, mode: 'minor',      label: 'C MIN'  },
  { key: 5, mode: 'phrygian',   label: 'F PHRY' },
  { key: 7, mode: 'minor',      label: 'G MIN'  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NeuralSequencer() {
  const {
    state, start, stop, toggleStep, updateStep, updateTrack, updateMeta,
    randomize, clearTrack, switchPattern, copyPattern, setGlobalFX,
  } = useNeuralEngine();

  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [rightPanel, setRightPanel] = useState<'synth' | 'webcam'>('synth');
  const [copyFromPattern, setCopyFromPattern] = useState<number | null>(null);
  const [scaleIdx, setScaleIdx] = useState(0);
  const [lockTarget, setLockTarget] = useState<{ ti: number; si: number; pos: { x: number; y: number } } | null>(null);
  const [bpmInput, setBpmInput] = useState(String(state.bpm));

  const videoRef    = useRef<HTMLVideoElement>(null);
  const displayRef  = useRef<HTMLCanvasElement>(null);
  const procRef     = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const rafRef      = useRef<number | null>(null);
  const smoothRef   = useRef({ filter: 0, reverb: 0, delay: 0 });

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

  const handlePatternClick = (idx: number) => {
    if (copyFromPattern !== null) {
      if (idx !== copyFromPattern) copyPattern(copyFromPattern, idx);
      setCopyFromPattern(null);
    } else {
      switchPattern(idx);
    }
  };

  const handleSelectTrack = (ti: number) => {
    setSelectedTrack(prev => prev === ti ? null : ti);
    if (rightPanel !== 'synth') setRightPanel('synth');
  };

  // Webcam
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
        const sm = smoothRef.current;
        sm.filter = sm.filter * (1 - alpha) + Math.min(1, (z1 / zPx) * sens) * alpha;
        sm.reverb = sm.reverb * (1 - alpha) + Math.min(1, (z2 / zPx) * sens) * alpha;
        sm.delay  = sm.delay  * (1 - alpha) + Math.min(1, (z3 / zPx) * sens) * alpha;
        updateMeta({ webcamFilter: sm.filter, webcamReverb: sm.reverb, webcamDelay: sm.delay });
      }
      prevFrameRef.current = new Uint8ClampedArray(frame);
      if (dctx) {
        dctx.drawImage(proc, 0, 0);
        const third = Math.floor(W / 3);
        ['#f97316', '#a855f7', '#06b6d4'].forEach((c, i) => {
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
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLockTarget(null); setCopyFromPattern(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const lockedStep  = lockTarget ? state.tracks[lockTarget.ti].steps[lockTarget.si] : null;
  const lockedTrack = lockTarget ? state.tracks[lockTarget.ti] : null;
  const stepLabels  = ['1','','','','5','','','','9','','','','13','','',''];

  const PATTERN_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7'];

  return (
    <section style={{
      background: '#07070d',
      borderTop: '1px solid #101018',
      borderBottom: '1px solid #101018',
      fontFamily: '"Space Grotesk", "IBM Plex Mono", monospace',
    }}>
      <canvas ref={procRef} width={194} height={146} style={{ display: 'none' }} />

      {/* ── HEADER ──────────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#080810',
        borderBottom: '1px solid #111120',
        padding: '7px 14px',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: state.playing ? '#a855f7' : '#151525',
            boxShadow: state.playing ? '0 0 10px #a855f7, 0 0 22px #a855f744' : 'none',
            transition: 'all 0.3s',
          }} />
          <span style={{ fontSize: 11, letterSpacing: '0.26em', color: '#444', fontWeight: 700 }}>NEURAL SEQ</span>
        </div>

        <div style={{ width: 1, height: 18, background: '#151525', flexShrink: 0 }} />

        {/* Pattern bank */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 6, color: '#252535', letterSpacing: '0.14em', marginRight: 3, fontWeight: 700 }}>PATTERN</span>
          {['A', 'B', 'C', 'D'].map((lbl, i) => {
            const isCurrent  = state.currentPattern === i;
            const isCopyDest = copyFromPattern !== null && copyFromPattern !== i;
            const pc = PATTERN_COLORS[i];
            return (
              <button key={i} onClick={() => handlePatternClick(i)} style={{
                width: 28, height: 24,
                background: isCurrent ? pc + '22' : isCopyDest ? '#ffffff0a' : 'transparent',
                border: `1px solid ${isCurrent ? pc : isCopyDest ? '#ffffff33' : '#181828'}`,
                borderRadius: 4,
                color: isCurrent ? pc : isCopyDest ? '#777' : '#2a2a3a',
                fontSize: 10, fontWeight: 700, cursor: 'pointer',
                boxShadow: isCurrent ? `0 0 8px ${pc}44` : isCopyDest ? '0 0 5px #ffffff18' : 'none',
                transition: 'all 0.12s',
              }}>{lbl}</button>
            );
          })}
          <button
            onClick={() => setCopyFromPattern(prev => prev === null ? state.currentPattern : null)}
            title="Copy current pattern to another slot — click CPY then choose destination"
            style={{
              padding: '0 7px', height: 24,
              background: copyFromPattern !== null ? '#ffffff0a' : 'transparent',
              border: `1px solid ${copyFromPattern !== null ? '#ffffff33' : '#111120'}`,
              borderRadius: 4,
              color: copyFromPattern !== null ? '#888' : '#1e1e2e',
              fontSize: 7, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em',
              transition: 'all 0.12s',
            }}
          >{copyFromPattern !== null ? '✕ CPY' : 'CPY'}</button>
        </div>

        <div style={{ width: 1, height: 18, background: '#151525', flexShrink: 0 }} />

        {/* BPM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 7, color: '#252535', letterSpacing: '0.1em' }}>BPM</span>
          <button onClick={() => handleBpmChange(-1)} style={{ width: 18, height: 18, background: 'none', border: '1px solid #161626', borderRadius: 3, color: '#444', cursor: 'pointer', fontSize: 11 }}>−</button>
          <input
            type="text" value={bpmInput}
            onChange={e => setBpmInput(e.target.value)}
            onBlur={e => handleBpmBlur(e.target.value)}
            style={{ width: 34, background: 'transparent', border: '1px solid #161626', borderRadius: 3, color: '#ccc', fontSize: 13, fontFamily: 'monospace', textAlign: 'center', padding: '2px 0' }}
          />
          <button onClick={() => handleBpmChange(1)} style={{ width: 18, height: 18, background: 'none', border: '1px solid #161626', borderRadius: 3, color: '#444', cursor: 'pointer', fontSize: 11 }}>+</button>
        </div>

        {/* Loop indicator */}
        <div style={{ display: 'flex', gap: 3 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: state.playing && (state.loopCount % 4) === i ? '#a855f7' : '#111120',
              boxShadow: state.playing && (state.loopCount % 4) === i ? '0 0 5px #a855f7' : 'none',
              transition: 'all 0.1s',
            }} />
          ))}
        </div>

        {/* Swing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 7, color: '#252535', letterSpacing: '0.1em' }}>SWING</span>
          <input type="range" min={0} max={50} step={1} value={state.swing}
            onChange={e => updateMeta({ swing: Number(e.target.value) })}
            style={{ width: 60, height: 12, accentColor: '#a855f7', cursor: 'pointer' }} />
          <span style={{ fontSize: 7, color: state.swing > 0 ? '#a855f7' : '#1e1e2e', fontFamily: 'monospace', minWidth: 20 }}>{state.swing}%</span>
        </div>

        {/* Scale */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 7, color: '#252535', letterSpacing: '0.1em' }}>SCALE</span>
          <select value={scaleIdx} onChange={e => handleScaleChange(Number(e.target.value))} style={{
            background: '#0d0d18', border: '1px solid #161626', borderRadius: 4,
            color: '#666', fontSize: 7, padding: '3px 6px', cursor: 'pointer',
          }}>
            {SCALE_OPTIONS.map((opt, i) => <option key={i} value={i}>{opt.label}</option>)}
          </select>
        </div>

        {/* Fill */}
        <button
          onPointerDown={() => updateMeta({ fillActive: true })}
          onPointerUp={() => updateMeta({ fillActive: false })}
          onPointerLeave={() => updateMeta({ fillActive: false })}
          style={{
            background: state.fillActive ? '#f9731620' : 'transparent',
            border: `1px solid ${state.fillActive ? '#f97316' : '#161626'}`,
            borderRadius: 4, color: state.fillActive ? '#f97316' : '#1e1e2e',
            fontSize: 7, padding: '4px 8px', cursor: 'pointer',
            fontWeight: 700, letterSpacing: '0.12em',
            boxShadow: state.fillActive ? '0 0 9px #f9731644' : 'none',
            transition: 'all 0.1s',
          }}
        >FILL</button>

        {/* Play/Stop */}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={state.playing ? stop : start}
            style={{
              background: state.playing ? '#22c55e1a' : '#22c55e',
              border: '1px solid #22c55e',
              borderRadius: 6, color: state.playing ? '#22c55e' : '#000',
              fontSize: 11, padding: '6px 20px', cursor: 'pointer',
              fontWeight: 700, letterSpacing: '0.1em',
              boxShadow: state.playing ? '0 0 12px #22c55e44' : '0 0 5px #22c55e22',
              transition: 'all 0.15s',
            }}
          >{state.playing ? '■ STOP' : '▶ PLAY'}</button>
        </div>
      </div>

      {/* ── MAIN BODY ────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex' }}>

        {/* Track grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Step ruler */}
          <div style={{ display: 'flex', paddingLeft: 107, background: '#07070d', paddingRight: 55 }}>
            {stepLabels.map((label, i) => (
              <div key={i} style={{
                width: 30, flexShrink: 0,
                fontSize: 6, color: label ? '#1e1e2e' : 'transparent',
                textAlign: 'center', padding: '2px 0',
                marginLeft: i > 0 && i % 4 === 0 ? 8 : 2,
              }}>{label}</div>
            ))}
          </div>

          {/* DRUMS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#080810', padding: '2px 10px', borderTop: '1px solid #0e0e18', borderBottom: '1px solid #0e0e18' }}>
            <span style={{ fontSize: 6, color: '#f97316', letterSpacing: '0.2em', fontWeight: 700, opacity: 0.5 }}>DRUMS</span>
            <div style={{ flex: 1, height: 1, background: '#121220' }} />
          </div>
          {state.tracks.slice(0, 4).map((track, ti) => (
            <TrackRow
              key={track.role}
              track={track} currentStep={state.currentStep}
              isSelected={selectedTrack === ti}
              onToggleStep={si => toggleStep(ti, si)}
              onRightClickStep={(e, si) => handleRightClickStep(e, ti, si)}
              onMute={() => updateTrack(ti, { muted: !track.muted })}
              onSelect={() => handleSelectTrack(ti)}
              onRandomize={() => randomize(ti, 0.35)}
              onClear={() => clearTrack(ti)}
            />
          ))}

          {/* SYNTH */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#080810', padding: '2px 10px', borderTop: '1px solid #0e0e18', borderBottom: '1px solid #0e0e18' }}>
            <span style={{ fontSize: 6, color: '#a855f7', letterSpacing: '0.2em', fontWeight: 700, opacity: 0.5 }}>SYNTH</span>
            <div style={{ flex: 1, height: 1, background: '#121220' }} />
          </div>
          {state.tracks.slice(4).map((track, idx) => {
            const ti = idx + 4;
            return (
              <TrackRow
                key={track.role}
                track={track} currentStep={state.currentStep}
                isSelected={selectedTrack === ti}
                onToggleStep={si => toggleStep(ti, si)}
                onRightClickStep={(e, si) => handleRightClickStep(e, ti, si)}
                onMute={() => updateTrack(ti, { muted: !track.muted })}
                onSelect={() => handleSelectTrack(ti)}
                onRandomize={() => randomize(ti, 0.28)}
                onClear={() => clearTrack(ti)}
              />
            );
          })}
        </div>

        {/* Right panel */}
        <div style={{
          width: 214, flexShrink: 0,
          background: '#07070e',
          borderLeft: '1px solid #0f0f1a',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: '#060608', borderBottom: '1px solid #0f0f1a' }}>
            {(['synth', 'webcam'] as const).map(tab => (
              <button key={tab} onClick={() => setRightPanel(tab)} style={{
                flex: 1, padding: '6px 0',
                background: rightPanel === tab ? '#0a0a14' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${rightPanel === tab ? '#a855f7' : 'transparent'}`,
                color: rightPanel === tab ? '#a855f7' : '#1e1e2e',
                fontSize: 7, fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}>
                {tab === 'synth' ? '⚙ SYNTH' : '◎ CAM'}
              </button>
            ))}
          </div>

          {/* Panel content */}
          {rightPanel === 'synth' ? (
            selectedTrack !== null ? (
              <SynthEditor
                track={state.tracks[selectedTrack]}
                onUpdate={p => updateTrack(selectedTrack, p)}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 12px', gap: 6 }}>
                <div style={{ fontSize: 8, color: '#1e1e2e', letterSpacing: '0.1em', marginBottom: 6 }}>SELECT TRACK TO EDIT</div>
                {state.tracks.map((t, ti) => (
                  <button key={ti} onClick={() => handleSelectTrack(ti)} style={{
                    padding: '5px 10px', background: 'transparent',
                    border: `1px solid ${t.color}33`, borderRadius: 4,
                    color: t.color + 'aa', fontSize: 7, cursor: 'pointer',
                    letterSpacing: '0.1em', fontWeight: 700, textAlign: 'left',
                    transition: 'all 0.12s',
                  }}>{t.name} · {t.synthType.toUpperCase()}</button>
                ))}
              </div>
            )
          ) : (
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
          )}
        </div>
      </div>

      {/* ── MIXER + GLOBAL FX ──────────────────────────────────────────────────── */}
      <div style={{ background: '#060608', borderTop: '1px solid #0f0f1a', display: 'flex', alignItems: 'stretch' }}>
        {/* Channel strips */}
        <div style={{ display: 'flex', flex: 1, borderRight: '1px solid #0f0f1a' }}>
          {state.tracks.map((track, ti) => (
            <MixerChannel
              key={ti} track={track}
              isSelected={selectedTrack === ti}
              onSelect={() => handleSelectTrack(ti)}
              onMute={() => updateTrack(ti, { muted: !track.muted })}
              onVolumeChange={v => updateTrack(ti, { volume: v })}
            />
          ))}
        </div>

        {/* Global FX */}
        <div style={{
          width: 214, flexShrink: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '8px 14px', gap: 10,
        }}>
          <div style={{ fontSize: 7, color: '#1e1e2e', letterSpacing: '0.16em', fontWeight: 700 }}>GLOBAL FX</div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 7, color: '#a855f7', letterSpacing: '0.1em', fontWeight: 700 }}>REVERB</span>
              <span style={{ fontSize: 7, color: '#444', fontFamily: 'monospace' }}>{Math.round(state.globalReverb * 100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.01} value={state.globalReverb}
              onChange={e => setGlobalFX(Number(e.target.value), undefined)}
              style={{ width: '100%', height: 12, accentColor: '#a855f7', cursor: 'pointer', margin: 0 }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 7, color: '#06b6d4', letterSpacing: '0.1em', fontWeight: 700 }}>DELAY</span>
              <span style={{ fontSize: 7, color: '#444', fontFamily: 'monospace' }}>{Math.round(state.globalDelay * 100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.01} value={state.globalDelay}
              onChange={e => setGlobalFX(undefined, Number(e.target.value))}
              style={{ width: '100%', height: 12, accentColor: '#06b6d4', cursor: 'pointer', margin: 0 }} />
          </div>
        </div>
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
