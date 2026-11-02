import { useState, useRef, useCallback, useEffect } from 'react';
import { useNeuralEngine, ROLE_SYNTH_OPTIONS } from '../hooks/useNeuralEngine';
import type { NStep, NTrack, ScaleMode, TrackRole } from '../hooks/useNeuralEngine';

const MELODIC_ROLES = new Set<TrackRole>(['bass', 'lead', 'chord', 'fx']);
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// ─── Step Pad — looks like a real hardware rubber button ─────────────────────

function StepPad({ step, isCurrent, trackColor, groupStart, onClick, onRightClick }: {
  step: NStep; isCurrent: boolean; trackColor: string; groupStart: boolean;
  onClick: () => void; onRightClick: (e: React.MouseEvent) => void;
}) {
  // Inactive pads are VISIBLE mid-grey — not invisible dark squares
  let bg: string;
  let border: string;
  let shadow: string;

  if (step.active && isCurrent) {
    bg = trackColor;
    border = `1px solid ${trackColor}`;
    shadow = `0 0 20px ${trackColor}, 0 0 40px ${trackColor}55, 0 2px 4px #00000088`;
  } else if (step.active) {
    bg = `${trackColor}cc`;
    border = `1px solid ${trackColor}`;
    shadow = `0 0 10px ${trackColor}88, 0 2px 4px #00000088`;
  } else if (isCurrent) {
    bg = '#2e2e48';
    border = `2px solid ${trackColor}99`;
    shadow = `0 0 8px ${trackColor}44, 0 2px 4px #00000088`;
  } else {
    bg = '#252535';
    border = '1px solid #2e2e42';
    shadow = '0 2px 4px #00000066, inset 0 1px 0 #2e2e4433';
  }

  return (
    <button
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onRightClick(e); }}
      style={{
        width: 38, height: 38, position: 'relative',
        background: bg,
        border,
        borderRadius: 7, cursor: 'pointer', flexShrink: 0,
        boxShadow: shadow,
        transition: 'box-shadow 0.06s, background 0.06s, border-color 0.06s',
        marginLeft: groupStart ? 9 : 3,
        padding: 0,
      }}
    >
      {step.active && step.probability < 100 && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${step.probability}%`,
          background: 'rgba(255,255,255,0.18)',
          borderRadius: '0 0 6px 6px',
        }} />
      )}
      {step.locked && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          width: 5, height: 5, borderRadius: '50%',
          background: '#fff', boxShadow: '0 0 4px #fff',
        }} />
      )}
      {step.active && step.condition !== 'always' && (
        <div style={{
          position: 'absolute', bottom: 3, left: 3,
          fontSize: 7, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace',
        }}>{step.condition}</div>
      )}
    </button>
  );
}

// ─── Track Row — FL Studio Channel Rack style ─────────────────────────────────

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
  const c = track.color;
  const activeCount = track.steps.filter(s => s.active).length;

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '5px 0',
      borderBottom: '1px solid #1a1a28',
      background: isSelected ? `${c}12` : '#161622',
      transition: 'background 0.15s',
    }}>
      {/* FL Studio–style channel button */}
      <div
        onClick={onSelect}
        title="Click to edit synth"
        style={{
          width: 128, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 8px 6px 0',
          cursor: 'pointer',
          borderLeft: `4px solid ${track.muted ? '#333345' : c}`,
          background: track.muted
            ? 'transparent'
            : isSelected
            ? `${c}22`
            : `${c}0e`,
          transition: 'background 0.15s',
        }}
      >
        {/* Activity ring */}
        <div style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginLeft: 8,
          background: track.muted ? '#2a2a3a' : activeCount > 0 ? c : `${c}44`,
          boxShadow: !track.muted && activeCount > 0 ? `0 0 10px ${c}` : 'none',
          transition: 'all 0.2s',
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
            color: track.muted ? '#333345' : c,
            textTransform: 'uppercase',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{track.name}</div>
          <div style={{
            fontSize: 9, color: track.muted ? '#222232' : '#666688',
            fontFamily: 'monospace', marginTop: 2,
          }}>{track.synthType}</div>
        </div>

        <button
          onClick={e => { e.stopPropagation(); onMute(); }}
          style={{
            width: 24, height: 24, flexShrink: 0,
            background: track.muted ? `${c}25` : '#1e1e30',
            border: `1px solid ${track.muted ? `${c}99` : '#2e2e42'}`,
            borderRadius: 5, cursor: 'pointer',
            color: track.muted ? c : '#555577',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >M</button>
      </div>

      {/* Step pads */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, paddingLeft: 6 }}>
        {track.steps.map((step, si) => (
          <StepPad
            key={si} step={step}
            isCurrent={currentStep === si}
            trackColor={c}
            groupStart={si > 0 && si % 4 === 0}
            onClick={() => onToggleStep(si)}
            onRightClick={e => onRightClickStep(e, si)}
          />
        ))}
      </div>

      {/* RND / CLR */}
      <div style={{ width: 64, flexShrink: 0, display: 'flex', gap: 4, padding: '0 10px 0 6px' }}>
        <button onClick={onRandomize} style={{
          flex: 1, height: 24,
          background: '#1e1e30', border: '1px solid #2e2e42',
          borderRadius: 5, cursor: 'pointer',
          color: '#7777aa', fontSize: 8, fontWeight: 700, letterSpacing: '0.05em',
        }}>RND</button>
        <button onClick={onClear} style={{
          flex: 1, height: 24,
          background: '#1e1e30', border: '1px solid #2e2e42',
          borderRadius: 5, cursor: 'pointer',
          color: '#7777aa', fontSize: 8, fontWeight: 700, letterSpacing: '0.05em',
        }}>CLR</button>
      </div>
    </div>
  );
}

// ─── Synth Editor ──────────────────────────────────────────────────────────────

function SynthEditor({ track, onUpdate }: { track: NTrack; onUpdate: (p: Partial<NTrack>) => void }) {
  const opts = ROLE_SYNTH_OPTIONS[track.role];
  const noteName = `${NOTE_NAMES[track.rootNote % 12]}${Math.floor(track.rootNote / 12) - 1}`;
  const c = track.color;

  const sliders: { label: string; key: keyof NTrack; min: number; max: number; step: number; fmt: (v: number) => string; color: string }[] = [
    { label: 'FILTER', key: 'filterFreq', min: 80, max: 18000, step: 1, fmt: v => `${Math.round(v)}Hz`, color: '#06b6d4' },
    { label: 'RESONANCE', key: 'filterRes', min: 0.1, max: 20, step: 0.1, fmt: v => v.toFixed(1), color: '#06b6d4' },
    { label: 'ATTACK', key: 'attack', min: 0.001, max: 0.4, step: 0.001, fmt: v => `${Math.round(v * 1000)}ms`, color: '#22c55e' },
    { label: 'DECAY', key: 'decay', min: 0.01, max: 2, step: 0.01, fmt: v => `${Math.round(v * 1000)}ms`, color: '#22c55e' },
    { label: 'VOLUME', key: 'volume', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v * 100)}%`, color: c },
    { label: 'REVERB SEND', key: 'reverbSend', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v * 100)}%`, color: '#a855f7' },
    { label: 'DELAY SEND', key: 'delaySend', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v * 100)}%`, color: '#f97316' },
  ];

  return (
    <div style={{ padding: '12px 14px', overflowY: 'auto', flex: 1 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
        padding: '8px 10px', background: `${c}1a`, border: `1px solid ${c}44`, borderRadius: 8,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}` }} />
        <span style={{ fontSize: 13, letterSpacing: '0.1em', color: c, fontWeight: 800 }}>{track.name}</span>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: '#666688', letterSpacing: '0.12em', marginBottom: 6, fontWeight: 700 }}>OSCILLATOR</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {opts.map(o => (
            <button key={o.id} onClick={() => onUpdate({ synthType: o.id })} style={{
              flex: 1, padding: '7px 2px',
              background: track.synthType === o.id ? `${c}2a` : '#1e1e30',
              border: `1px solid ${track.synthType === o.id ? c : '#2e2e42'}`,
              borderRadius: 6,
              color: track.synthType === o.id ? c : '#666688',
              fontSize: 9, fontWeight: 700, cursor: 'pointer',
              boxShadow: track.synthType === o.id ? `0 0 8px ${c}44` : 'none',
              transition: 'all 0.12s',
            }}>{o.label}</button>
          ))}
        </div>
      </div>

      {MELODIC_ROLES.has(track.role) && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: '#666688', letterSpacing: '0.1em', fontWeight: 700 }}>ROOT NOTE</span>
            <span style={{ fontSize: 11, color: '#bbbbdd', fontFamily: 'monospace', fontWeight: 700 }}>{noteName}</span>
          </div>
          <input type="range" min={24} max={84} value={track.rootNote}
            onChange={e => onUpdate({ rootNote: Number(e.target.value) })}
            style={{ width: '100%', height: 14, accentColor: c, cursor: 'pointer', margin: 0 }} />
        </div>
      )}

      {sliders.map(s => (
        <div key={s.key} style={{ marginBottom: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: '#666688', letterSpacing: '0.08em' }}>{s.label}</span>
            <span style={{ fontSize: 9, color: '#9999bb', fontFamily: 'monospace' }}>{s.fmt(track[s.key] as number)}</span>
          </div>
          <input type="range"
            min={s.min} max={s.max} step={s.step}
            value={track[s.key] as number}
            onChange={e => onUpdate({ [s.key]: Number(e.target.value) } as Partial<NTrack>)}
            style={{ width: '100%', height: 14, accentColor: s.color, cursor: 'pointer', margin: 0 }} />
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
  const c = track.color;
  const activeCount = track.steps.filter(s => s.active).length;

  return (
    <div
      onClick={onSelect}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        padding: '8px 3px 6px',
        background: isSelected ? `${c}18` : '#111118',
        borderTop: `3px solid ${isSelected ? c : `${c}44`}`,
        borderRight: '1px solid #1a1a28',
        cursor: 'pointer', transition: 'all 0.15s', minWidth: 44,
      }}
    >
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: !track.muted && activeCount > 0 ? c : '#252535',
        boxShadow: !track.muted && activeCount > 0 ? `0 0 8px ${c}` : 'none',
        transition: 'all 0.1s',
      }} />
      <div style={{ fontSize: 8, color: track.muted ? '#333345' : c, letterSpacing: '0.06em', fontWeight: 700 }}>{track.name}</div>

      <div style={{ position: 'relative', width: 22, height: 64, flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: '#1a1a28', borderRadius: 4, overflow: 'hidden', border: '1px solid #252535' }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${track.volume * 100}%`,
            background: track.muted ? '#252535' : `linear-gradient(to top, ${c}, ${c}77)`,
            borderRadius: '0 0 3px 3px', transition: 'height 0.06s',
          }} />
        </div>
        <input
          type="range" min={0} max={1} step={0.01} value={track.volume}
          onChange={e => { e.stopPropagation(); onVolumeChange(Number(e.target.value)); }}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer',
            writingMode: 'vertical-lr', direction: 'rtl',
          } as React.CSSProperties}
        />
      </div>

      <div style={{ fontSize: 8, color: '#555577', fontFamily: 'monospace' }}>{Math.round(track.volume * 100)}</div>

      <button
        onClick={e => { e.stopPropagation(); onMute(); }}
        style={{
          width: 24, height: 16,
          background: track.muted ? `${c}25` : '#1e1e30',
          border: `1px solid ${track.muted ? `${c}77` : '#2e2e42'}`,
          borderRadius: 3, cursor: 'pointer',
          color: track.muted ? c : '#555577',
          fontSize: 8, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >M</button>
    </div>
  );
}

// ─── Param Lock Editor ─────────────────────────────────────────────────────────

function ParamLockEditor({ step, track, isMelodic, onUpdate, onClose, pos }: {
  step: NStep; track: NTrack; isMelodic: boolean;
  onUpdate: (p: Partial<NStep>) => void; onClose: () => void;
  pos: { x: number; y: number };
}) {
  const CONDITIONS: NStep['condition'][] = ['always', '1:2', '1:4', 'fill'];
  const c = track.color;

  return (
    <div style={{
      position: 'fixed',
      left: Math.min(pos.x, window.innerWidth - 250),
      top: Math.min(pos.y, window.innerHeight - 300),
      zIndex: 9000,
      background: '#131320',
      border: `1px solid ${c}55`,
      borderRadius: 12,
      padding: '16px 18px', width: 240,
      boxShadow: `0 0 40px ${c}1a, 0 16px 48px #000e`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.12em', color: c, fontWeight: 700 }}>◆ PARAM LOCK · {track.name}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      <label style={{ fontSize: 9, color: '#666688', display: 'block', marginBottom: 4 }}>
        PROBABILITY <span style={{ color: '#aaaacc' }}>{step.probability}%</span>
      </label>
      <input type="range" min={0} max={100} value={step.probability}
        onChange={e => onUpdate({ probability: Number(e.target.value) })}
        style={{ width: '100%', marginBottom: 14, accentColor: c }} />
      <div style={{ fontSize: 9, color: '#666688', marginBottom: 6, fontWeight: 700 }}>CONDITION</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {CONDITIONS.map(cond => (
          <button key={cond} onClick={() => onUpdate({ condition: cond })} style={{
            flex: 1, padding: '6px 0',
            background: step.condition === cond ? `${c}2a` : '#1e1e30',
            border: `1px solid ${step.condition === cond ? c : '#2e2e42'}`,
            borderRadius: 5, color: step.condition === cond ? c : '#555577',
            fontSize: 8, cursor: 'pointer', fontWeight: 700,
          }}>{cond.toUpperCase()}</button>
        ))}
      </div>
      {isMelodic && (
        <>
          <label style={{ fontSize: 9, color: '#666688', display: 'block', marginBottom: 4 }}>
            PITCH <span style={{ color: '#aaaacc' }}>{step.pitchOffset > 0 ? '+' : ''}{step.pitchOffset} st</span>
          </label>
          <input type="range" min={-12} max={12} value={step.pitchOffset}
            onChange={e => onUpdate({ pitchOffset: Number(e.target.value) })}
            style={{ width: '100%', marginBottom: 14, accentColor: c }} />
        </>
      )}
      <label style={{ fontSize: 9, color: '#666688', display: 'block', marginBottom: 4 }}>
        FILTER MOD <span style={{ color: '#aaaacc' }}>{step.filterMod > 0 ? '+' : ''}{step.filterMod.toFixed(1)}</span>
      </label>
      <input type="range" min={-2} max={2} step={0.1} value={step.filterMod}
        onChange={e => onUpdate({ filterMod: Number(e.target.value) })}
        style={{ width: '100%', marginBottom: 14, accentColor: c }} />
      <label style={{ fontSize: 9, color: '#666688', display: 'block', marginBottom: 4 }}>
        DECAY MOD <span style={{ color: '#aaaacc' }}>{step.decayMod > 0 ? '+' : ''}{step.decayMod.toFixed(1)}</span>
      </label>
      <input type="range" min={-2} max={2} step={0.1} value={step.decayMod}
        onChange={e => onUpdate({ decayMod: Number(e.target.value) })}
        style={{ width: '100%', accentColor: c }} />
      <button
        onClick={() => onUpdate({ pitchOffset: 0, filterMod: 0, decayMod: 0, probability: 100, condition: 'always' })}
        style={{ marginTop: 14, width: '100%', background: '#1e1e30', border: '1px solid #2e2e42', borderRadius: 6, color: '#666688', fontSize: 9, cursor: 'pointer', padding: '6px 0' }}
      >RESET ALL</button>
    </div>
  );
}

// ─── Webcam Panel ──────────────────────────────────────────────────────────────

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
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px', gap: 10, flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: active ? '#22c55e' : '#252535',
            boxShadow: active ? '0 0 8px #22c55e' : 'none',
            transition: 'all 0.3s',
          }} />
          <span style={{ fontSize: 10, letterSpacing: '0.12em', color: active ? '#22c55e' : '#666688', fontWeight: 700 }}>MOTION CTRL</span>
        </div>
        {active && (
          <button onClick={onDisable} style={{
            background: '#1e1e30', border: '1px solid #2e2e42',
            borderRadius: 4, color: '#666688', fontSize: 8, cursor: 'pointer', padding: '3px 8px',
          }}>OFF</button>
        )}
      </div>
      <div style={{
        width: '100%', aspectRatio: '4/3', background: '#0c0c18',
        border: `1px solid ${active ? '#22c55e44' : '#252535'}`,
        borderRadius: 8, overflow: 'hidden', position: 'relative',
      }}>
        {active ? (
          <>
            <canvas ref={displayRef} width={194} height={146} style={{ width: '100%', height: '100%', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
              {zones.map((z, i) => (
                <div key={i} style={{ flex: 1, borderRight: i < 2 ? `1px solid ${z.color}44` : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                  <span style={{ fontSize: 8, color: z.color, fontWeight: 700, background: '#00000099', padding: '1px 4px', borderRadius: 2, opacity: z.value > 0.04 ? 1 : 0.4 }}>{z.label[0]}</span>
                  <div style={{ position: 'absolute', bottom: 0, left: `${i * 33.33}%`, width: '33.33%', height: `${Math.round(z.value * 100 * 0.45)}%`, background: z.color + '55', transition: 'height 0.06s' }} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '6px 12px' }}>
            <div style={{ display: 'flex', width: '100%', height: 52, borderRadius: 6, overflow: 'hidden' }}>
              {zones.map((z, i) => (
                <div key={i} style={{ flex: 1, background: `${z.color}18`, borderRight: i < 2 ? `1px solid ${z.color}33` : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <span style={{ fontSize: 12 }}>{i === 0 ? '🤚' : i === 1 ? '✋' : '👋'}</span>
                  <span style={{ fontSize: 7, color: `${z.color}bb`, letterSpacing: '0.1em', fontWeight: 700 }}>{z.label[0]}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 8, color: '#666688', textAlign: 'center', lineHeight: 1.8 }}>
              MOVE HANDS IN VIEW<br />
              <span style={{ color: '#f97316' }}>L</span> FILTER · <span style={{ color: '#a855f7' }}>C</span> REVERB · <span style={{ color: '#06b6d4' }}>R</span> DELAY
            </div>
          </div>
        )}
      </div>
      <video ref={videoRef} autoPlay muted playsInline style={{ display: 'none', width: 1, height: 1 }} />
      {active ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {zones.map(z => (
            <div key={z.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: z.color, fontWeight: 700 }}>{z.label}</span>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: z.value > 0.04 ? z.color : '#555577' }}>{Math.round(z.value * 100)}%</span>
              </div>
              <div style={{ height: 7, background: '#1e1e30', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${z.value * 100}%`, background: `linear-gradient(to right, ${z.color}88, ${z.color})`, boxShadow: z.value > 0.08 ? `0 0 8px ${z.color}88` : 'none', transition: 'width 0.06s' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onEnable} style={{
            width: '100%', padding: '12px 0',
            background: 'linear-gradient(135deg, #22c55e22, #22c55e0e)',
            border: '1px solid #22c55e55', borderRadius: 8,
            color: '#22c55e', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.14em', cursor: 'pointer',
          }}>◎ ACTIVATE CAMERA</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {zones.map(z => (
              <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 32, background: `${z.color}66`, borderRadius: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, color: z.color, fontWeight: 700 }}>{z.label}</div>
                  <div style={{ fontSize: 8, color: '#555577', marginTop: 1 }}>{z.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Scale + pattern constants ─────────────────────────────────────────────────

const SCALE_OPTIONS: { key: number; mode: ScaleMode; label: string }[] = [
  { key: 9, mode: 'phrygian',   label: 'A PHRY' },
  { key: 9, mode: 'minor',      label: 'A MIN'  },
  { key: 9, mode: 'pentatonic', label: 'A PENT' },
  { key: 0, mode: 'minor',      label: 'C MIN'  },
  { key: 5, mode: 'phrygian',   label: 'F PHRY' },
  { key: 7, mode: 'minor',      label: 'G MIN'  },
];

// Ableton-style clip slot colors
const PATTERN_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#e040fb'];

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

  const startWebcamLoop = useCallback(() => {
    const processFrame = () => {
      const video   = videoRef.current;
      const proc    = procRef.current;
      const display = displayRef.current;
      if (!video || !proc || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(processFrame); return;
      }
      const W = 194, H = 146;
      const ctx2d = proc.getContext('2d');
      const dctx  = display?.getContext('2d');
      if (!ctx2d) return;
      ctx2d.save(); ctx2d.translate(W, 0); ctx2d.scale(-1, 1);
      ctx2d.drawImage(video, 0, 0, W, H); ctx2d.restore();
      const frame = ctx2d.getImageData(0, 0, W, H).data;
      if (prevFrameRef.current) {
        const prev = prevFrameRef.current;
        let z1 = 0, z2 = 0, z3 = 0;
        const third = Math.floor(W / 3);
        for (let i = 0; i < frame.length; i += 4) {
          const px = (i / 4) % W;
          const diff = (Math.abs(frame[i] - prev[i]) + Math.abs(frame[i+1] - prev[i+1]) + Math.abs(frame[i+2] - prev[i+2])) / (3 * 255);
          if (px < third) z1 += diff;
          else if (px < 2 * third) z2 += diff;
          else z3 += diff;
        }
        const zPx = third * H, alpha = 0.12, sens = 10;
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
        ['#f97316', '#a855f7', '#06b6d4'].forEach((col, i) => {
          dctx.fillStyle = col + '14';
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
      updateMeta({ webcamActive: true }); startWebcamLoop();
    } catch { alert('Camera access denied or unavailable.'); }
  }, [updateMeta, startWebcamLoop]);

  const disableWebcam = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const vid = videoRef.current;
    if (vid?.srcObject) { (vid.srcObject as MediaStream).getTracks().forEach(t => t.stop()); vid.srcObject = null; }
    prevFrameRef.current = null; smoothRef.current = { filter: 0, reverb: 0, delay: 0 };
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

  return (
    <section style={{
      background: '#161622',
      fontFamily: '"Space Grotesk", "IBM Plex Mono", monospace',
      minHeight: '100vh',
    }}>
      <canvas ref={procRef} width={194} height={146} style={{ display: 'none' }} />

      {/* ════════════════════════════════════════════════════════════════════════
          TRANSPORT — Ableton/Groovebox header
          ════════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: '#0e0e1a',
        borderBottom: '2px solid #252535',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>

        {/* Brand + status LED */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: state.playing ? '#22c55e' : '#252535',
            boxShadow: state.playing ? '0 0 16px #22c55e, 0 0 32px #22c55e55' : 'none',
            transition: 'all 0.3s',
          }} />
          <span style={{ fontSize: 14, letterSpacing: '0.2em', color: '#aaaacc', fontWeight: 800 }}>AUDIOBABE</span>
        </div>

        {/* Play / Stop — big green button */}
        <button
          onClick={state.playing ? stop : start}
          style={{
            background: state.playing
              ? '#1a2a1a'
              : 'linear-gradient(135deg, #22c55e, #16a34a)',
            border: `2px solid #22c55e`,
            borderRadius: 10, color: state.playing ? '#22c55e' : '#000',
            fontSize: 14, padding: '8px 28px', cursor: 'pointer',
            fontWeight: 800, letterSpacing: '0.08em',
            boxShadow: state.playing ? '0 0 20px #22c55e55' : '0 4px 12px #22c55e44, 0 0 0 1px #22c55e33',
            transition: 'all 0.12s',
          }}
        >{state.playing ? '■ STOP' : '▶ PLAY'}</button>

        <div style={{ width: 1, height: 28, background: '#252535', flexShrink: 0 }} />

        {/* BPM — digital display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 9, color: '#666688', letterSpacing: '0.14em', fontWeight: 700 }}>BPM</span>
          <button onClick={() => handleBpmChange(-1)} style={{
            width: 24, height: 28, background: '#1e1e30', border: '1px solid #2e2e42',
            borderRadius: 5, color: '#aaaacc', cursor: 'pointer', fontSize: 16, fontWeight: 700,
          }}>−</button>
          <div style={{
            background: '#0a0a14', border: '1px solid #2e2e42', borderRadius: 6,
            padding: '4px 8px',
          }}>
            <input
              type="text" value={bpmInput}
              onChange={e => setBpmInput(e.target.value)}
              onBlur={e => handleBpmBlur(e.target.value)}
              style={{
                width: 44, background: 'transparent', border: 'none', outline: 'none',
                color: '#e0e0ff', fontSize: 20, fontFamily: 'monospace', fontWeight: 700,
                textAlign: 'center', padding: 0,
              }}
            />
          </div>
          <button onClick={() => handleBpmChange(1)} style={{
            width: 24, height: 28, background: '#1e1e30', border: '1px solid #2e2e42',
            borderRadius: 5, color: '#aaaacc', cursor: 'pointer', fontSize: 16, fontWeight: 700,
          }}>+</button>
        </div>

        {/* Loop position dots */}
        <div style={{ display: 'flex', gap: 5 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: state.playing && (state.loopCount % 4) === i ? '#a855f7' : '#1e1e30',
              boxShadow: state.playing && (state.loopCount % 4) === i ? '0 0 8px #a855f7' : 'none',
              transition: 'all 0.1s',
            }} />
          ))}
        </div>

        <div style={{ width: 1, height: 28, background: '#252535', flexShrink: 0 }} />

        {/* Pattern bank — Ableton-style colored clip slots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 9, color: '#666688', letterSpacing: '0.12em', fontWeight: 700 }}>PATTERN</span>
          {['A', 'B', 'C', 'D'].map((lbl, i) => {
            const isCurrent  = state.currentPattern === i;
            const isCopyDest = copyFromPattern !== null && copyFromPattern !== i;
            const pc = PATTERN_COLORS[i];
            return (
              <button key={i} onClick={() => handlePatternClick(i)} style={{
                width: 40, height: 30,
                background: isCurrent ? pc : isCopyDest ? '#252535' : '#1e1e30',
                border: `2px solid ${isCurrent ? pc : isCopyDest ? '#555577' : '#2e2e42'}`,
                borderRadius: 7,
                color: isCurrent ? '#000' : isCopyDest ? '#aaaacc' : '#555577',
                fontSize: 13, fontWeight: 800, cursor: 'pointer',
                boxShadow: isCurrent ? `0 0 12px ${pc}88` : 'none',
                transition: 'all 0.12s',
              }}>{lbl}</button>
            );
          })}
          <button
            onClick={() => setCopyFromPattern(prev => prev === null ? state.currentPattern : null)}
            style={{
              padding: '0 10px', height: 30,
              background: copyFromPattern !== null ? '#333355' : '#1e1e30',
              border: `1px solid ${copyFromPattern !== null ? '#8888cc' : '#2e2e42'}`,
              borderRadius: 6,
              color: copyFromPattern !== null ? '#ccccff' : '#555577',
              fontSize: 9, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em',
            }}
          >{copyFromPattern !== null ? '✕ CPY' : 'CPY'}</button>
        </div>

        <div style={{ width: 1, height: 28, background: '#252535', flexShrink: 0 }} />

        {/* Swing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 9, color: '#666688', letterSpacing: '0.1em', fontWeight: 700 }}>SWING</span>
          <input type="range" min={0} max={50} step={1} value={state.swing}
            onChange={e => updateMeta({ swing: Number(e.target.value) })}
            style={{ width: 68, height: 14, accentColor: '#a855f7', cursor: 'pointer' }} />
          <span style={{ fontSize: 10, color: state.swing > 0 ? '#a855f7' : '#555577', fontFamily: 'monospace', minWidth: 26, fontWeight: 700 }}>{state.swing}%</span>
        </div>

        {/* Scale */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 9, color: '#666688', letterSpacing: '0.1em', fontWeight: 700 }}>SCALE</span>
          <select value={scaleIdx} onChange={e => handleScaleChange(Number(e.target.value))} style={{
            background: '#1e1e30', border: '1px solid #2e2e42', borderRadius: 5,
            color: '#aaaacc', fontSize: 9, padding: '4px 8px', cursor: 'pointer',
          }}>
            {SCALE_OPTIONS.map((opt, i) => <option key={i} value={i}>{opt.label}</option>)}
          </select>
        </div>

        {/* Fill — hold to activate */}
        <button
          onPointerDown={() => updateMeta({ fillActive: true })}
          onPointerUp={() => updateMeta({ fillActive: false })}
          onPointerLeave={() => updateMeta({ fillActive: false })}
          style={{
            background: state.fillActive ? '#f97316' : '#1e1e30',
            border: `2px solid ${state.fillActive ? '#f97316' : '#2e2e42'}`,
            borderRadius: 7, color: state.fillActive ? '#000' : '#888899',
            fontSize: 11, padding: '5px 14px', cursor: 'pointer',
            fontWeight: 800, letterSpacing: '0.08em',
            boxShadow: state.fillActive ? '0 0 16px #f9731688' : 'none',
            transition: 'all 0.08s',
          }}
        >FILL</button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SEQUENCER BODY
          ════════════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex' }}>

        {/* Track grid */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Step number ruler */}
          <div style={{
            display: 'flex', paddingLeft: 132, paddingRight: 74,
            background: '#111118', borderBottom: '1px solid #1e1e2e',
          }}>
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} style={{
                width: 38, flexShrink: 0,
                fontSize: 9, fontFamily: 'monospace', fontWeight: i % 4 === 0 ? 700 : 400,
                color: i % 4 === 0 ? '#9999bb' : '#333345',
                textAlign: 'center', padding: '3px 0',
                marginLeft: i > 0 && i % 4 === 0 ? 9 : 3,
              }}>{i % 4 === 0 ? i + 1 : '·'}</div>
            ))}
          </div>

          {/* ── DRUMS ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px',
            background: '#0e0e1a', borderBottom: '1px solid #1e1e2e',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 8px #f97316' }} />
            <span style={{ fontSize: 10, color: '#f97316', letterSpacing: '0.22em', fontWeight: 800 }}>DRUMS</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #f9731633, transparent)' }} />
          </div>
          {state.tracks.slice(0, 4).map((track, ti) => (
            <TrackRow
              key={track.role} track={track} currentStep={state.currentStep}
              isSelected={selectedTrack === ti}
              onToggleStep={si => toggleStep(ti, si)}
              onRightClickStep={(e, si) => handleRightClickStep(e, ti, si)}
              onMute={() => updateTrack(ti, { muted: !track.muted })}
              onSelect={() => handleSelectTrack(ti)}
              onRandomize={() => randomize(ti, 0.35)}
              onClear={() => clearTrack(ti)}
            />
          ))}

          {/* ── SYNTH ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px',
            background: '#0e0e1a', borderBottom: '1px solid #1e1e2e',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />
            <span style={{ fontSize: 10, color: '#a855f7', letterSpacing: '0.22em', fontWeight: 800 }}>SYNTH</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #a855f733, transparent)' }} />
          </div>
          {state.tracks.slice(4).map((track, idx) => {
            const ti = idx + 4;
            return (
              <TrackRow
                key={track.role} track={track} currentStep={state.currentStep}
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

        {/* ── Right panel — Synth editor / Webcam ── */}
        <div style={{
          width: 218, flexShrink: 0,
          background: '#111118',
          borderLeft: '2px solid #1e1e2e',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', background: '#0e0e1a', borderBottom: '2px solid #1e1e2e' }}>
            {(['synth', 'webcam'] as const).map(tab => (
              <button key={tab} onClick={() => setRightPanel(tab)} style={{
                flex: 1, padding: '9px 0',
                background: rightPanel === tab ? '#111118' : 'transparent',
                border: 'none',
                borderBottom: `3px solid ${rightPanel === tab ? '#a855f7' : 'transparent'}`,
                color: rightPanel === tab ? '#a855f7' : '#555577',
                fontSize: 9, fontWeight: 800, cursor: 'pointer',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}>
                {tab === 'synth' ? '⚙ SYNTH' : '◎ CAM'}
              </button>
            ))}
          </div>

          {rightPanel === 'synth' ? (
            selectedTrack !== null ? (
              <SynthEditor
                track={state.tracks[selectedTrack]}
                onUpdate={p => updateTrack(selectedTrack, p)}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 12px', gap: 5 }}>
                <div style={{ fontSize: 9, color: '#666688', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 700 }}>CLICK A TRACK TO EDIT</div>
                {state.tracks.map((t, ti) => (
                  <button key={ti} onClick={() => handleSelectTrack(ti)} style={{
                    padding: '8px 12px', background: '#161622',
                    border: `1px solid ${t.color}55`, borderRadius: 7,
                    color: t.color, fontSize: 10, cursor: 'pointer',
                    fontWeight: 700, textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'background 0.12s',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0, boxShadow: `0 0 6px ${t.color}` }} />
                    <span>{t.name}</span>
                    <span style={{ color: '#555577', fontSize: 8, marginLeft: 'auto', fontFamily: 'monospace' }}>{t.synthType}</span>
                  </button>
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

      {/* ════════════════════════════════════════════════════════════════════════
          MIXER + GLOBAL FX
          ════════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: '#0e0e1a', borderTop: '2px solid #252535',
        display: 'flex', alignItems: 'stretch',
      }}>
        <div style={{ display: 'flex', flex: 1, borderRight: '2px solid #252535' }}>
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

        <div style={{
          width: 218, flexShrink: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '10px 16px', gap: 12,
        }}>
          <div style={{ fontSize: 9, color: '#666688', letterSpacing: '0.16em', fontWeight: 800 }}>GLOBAL FX</div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 700 }}>REVERB</span>
              <span style={{ fontSize: 9, color: '#9999bb', fontFamily: 'monospace' }}>{Math.round(state.globalReverb * 100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.01} value={state.globalReverb}
              onChange={e => setGlobalFX(Number(e.target.value), undefined)}
              style={{ width: '100%', height: 14, accentColor: '#a855f7', cursor: 'pointer', margin: 0 }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: '#06b6d4', fontWeight: 700 }}>DELAY</span>
              <span style={{ fontSize: 9, color: '#9999bb', fontFamily: 'monospace' }}>{Math.round(state.globalDelay * 100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.01} value={state.globalDelay}
              onChange={e => setGlobalFX(undefined, Number(e.target.value))}
              style={{ width: '100%', height: 14, accentColor: '#06b6d4', cursor: 'pointer', margin: 0 }} />
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
