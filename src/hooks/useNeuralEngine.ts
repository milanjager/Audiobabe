import { useRef, useCallback, useReducer, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrackRole = 'kick' | 'snare' | 'hh_c' | 'hh_o' | 'bass' | 'lead' | 'chord' | 'fx';
export type TrigCondition = 'always' | '1:2' | '1:4' | 'fill';
export type ScaleMode = 'minor' | 'phrygian' | 'pentatonic';

export interface NStep {
  active: boolean;
  probability: number;    // 0–100
  condition: TrigCondition;
  pitchOffset: number;    // semitones −12…+12
  filterMod: number;      // exponent −2…+2
  decayMod: number;       // exponent −2…+2
  locked: boolean;
}

export interface NTrack {
  role: TrackRole;
  name: string;
  color: string;
  muted: boolean;
  volume: number;
  rootNote: number;
  filterFreq: number;
  filterRes: number;
  decay: number;
  synthType: string;   // chosen sound preset
  steps: NStep[];
}

export interface NEngineState {
  playing: boolean;
  bpm: number;
  swing: number;       // 0–50 (%)
  currentStep: number;
  fillActive: boolean;
  loopCount: number;
  scaleKey: number;
  scaleMode: ScaleMode;
  webcamActive: boolean;
  webcamFilter: number;
  webcamReverb: number;
  webcamDelay: number;
  tracks: NTrack[];
}

// ─── Sound bank definitions ───────────────────────────────────────────────────

export const ROLE_SYNTH_OPTIONS: Record<TrackRole, { id: string; label: string }[]> = {
  kick:  [{ id: 'sine',     label: 'SINE'  }, { id: 'punch', label: 'PUNCH' }, { id: 'sub',   label: 'SUB'  }],
  snare: [{ id: 'snap',     label: 'SNAP'  }, { id: 'verb',  label: 'VERB'  }, { id: 'crack', label: 'CRACK'}],
  hh_c:  [{ id: 'crisp',   label: 'CRISP' }, { id: 'dark',  label: 'DARK'  }, { id: 'metal', label: 'METAL'}],
  hh_o:  [{ id: 'crisp',   label: 'CRISP' }, { id: 'long',  label: 'LONG'  }, { id: 'wash',  label: 'WASH' }],
  bass:  [{ id: 'saw',      label: 'SAW'   }, { id: 'acid',  label: 'ACID'  }, { id: 'reese', label: 'REESE'}],
  lead:  [{ id: 'supersaw', label: 'SUPER' }, { id: 'square',label: 'SQR'   }, { id: 'pluck', label: 'PLUCK'}],
  chord: [{ id: 'minor',    label: 'MIN'   }, { id: 'major', label: 'MAJ'   }, { id: 'pad',   label: 'PAD'  }],
  fx:    [{ id: 'fm',       label: 'FM'    }, { id: 'am',    label: 'AM'    }, { id: 'noise', label: 'NOISE'}],
};

// ─── Scales ───────────────────────────────────────────────────────────────────

const SCALE_INTERVALS: Record<ScaleMode, number[]> = {
  minor:      [0, 2, 3, 5, 7, 8, 10],
  phrygian:   [0, 1, 3, 5, 7, 8, 10],
  pentatonic: [0, 3, 5, 7, 10],
};

function quantize(midi: number, root: number, mode: ScaleMode): number {
  const scale = SCALE_INTERVALS[mode];
  const semitone = ((midi - root) % 12 + 12) % 12;
  const octave   = Math.floor((midi - root) / 12);
  let best = scale[0], bestDist = Infinity;
  for (const s of scale) {
    const d = Math.abs(semitone - s);
    if (d < bestDist) { best = s; bestDist = d; }
  }
  return root + octave * 12 + best;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

function makeStep(active = false): NStep {
  return { active, probability: 100, condition: 'always', pitchOffset: 0, filterMod: 0, decayMod: 0, locked: false };
}

const TRACK_DEFS: Omit<NTrack, 'muted' | 'volume' | 'steps' | 'synthType'>[] = [
  { role: 'kick',  name: 'KICK',  color: '#f97316', rootNote: 41, filterFreq: 120,  filterRes: 1,   decay: 0.55 },
  { role: 'snare', name: 'SNARE', color: '#ef4444', rootNote: 48, filterFreq: 3500, filterRes: 2,   decay: 0.22 },
  { role: 'hh_c',  name: 'HH-C',  color: '#eab308', rootNote: 60, filterFreq: 8000, filterRes: 3,   decay: 0.05 },
  { role: 'hh_o',  name: 'HH-O',  color: '#fde047', rootNote: 62, filterFreq: 6500, filterRes: 2,   decay: 0.22 },
  { role: 'bass',  name: 'BASS',  color: '#a855f7', rootNote: 33, filterFreq: 700,  filterRes: 5,   decay: 0.32 },
  { role: 'lead',  name: 'LEAD',  color: '#22c55e', rootNote: 57, filterFreq: 2800, filterRes: 3.5, decay: 0.18 },
  { role: 'chord', name: 'CHORD', color: '#3b82f6', rootNote: 45, filterFreq: 1800, filterRes: 1.5, decay: 0.7  },
  { role: 'fx',    name: 'FX',    color: '#ec4899', rootNote: 36, filterFreq: 1200, filterRes: 8,   decay: 0.9  },
];

const DEFAULT_PATTERNS: Record<TrackRole, boolean[]> = {
  kick:  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0].map(Boolean),
  snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0].map(Boolean),
  hh_c:  [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0].map(Boolean),
  hh_o:  [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1].map(Boolean),
  bass:  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0].map(Boolean),
  lead:  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0].map(Boolean),
  chord: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].map(Boolean),
  fx:    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].map(Boolean),
};

const DEFAULT_SYNTH_TYPES: Record<TrackRole, string> = {
  kick: 'sine', snare: 'snap', hh_c: 'crisp', hh_o: 'crisp',
  bass: 'saw', lead: 'supersaw', chord: 'minor', fx: 'fm',
};

export function defaultNTracks(): NTrack[] {
  return TRACK_DEFS.map(def => ({
    ...def,
    muted: false, volume: 0.8,
    synthType: DEFAULT_SYNTH_TYPES[def.role],
    steps: DEFAULT_PATTERNS[def.role].map(active => makeStep(active)),
  }));
}

// ─── Audio synthesis ──────────────────────────────────────────────────────────

// KICK variants
function synthSineKick(ctx: AudioContext, when: number, decay: number, vol: number) {
  const o = ctx.createOscillator(), e = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(160, when);
  o.frequency.exponentialRampToValueAtTime(38, when + decay * 0.7);
  e.gain.setValueAtTime(vol, when);
  e.gain.exponentialRampToValueAtTime(0.001, when + decay);
  o.connect(e); e.connect(ctx.destination);
  o.start(when); o.stop(when + decay + 0.05);
}

function synthPunchKick(ctx: AudioContext, when: number, decay: number, vol: number) {
  // Click transient + sine
  const click = ctx.createOscillator(), clickEnv = ctx.createGain();
  click.type = 'square'; click.frequency.value = 900;
  clickEnv.gain.setValueAtTime(vol * 0.4, when);
  clickEnv.gain.exponentialRampToValueAtTime(0.001, when + 0.015);
  click.connect(clickEnv); clickEnv.connect(ctx.destination);
  click.start(when); click.stop(when + 0.02);

  const o = ctx.createOscillator(), e = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(220, when);
  o.frequency.exponentialRampToValueAtTime(40, when + decay * 0.5);
  e.gain.setValueAtTime(vol * 0.9, when);
  e.gain.exponentialRampToValueAtTime(0.001, when + decay);
  o.connect(e); e.connect(ctx.destination);
  o.start(when); o.stop(when + decay + 0.05);
}

function synthSubKick(ctx: AudioContext, when: number, decay: number, vol: number) {
  // Very low sub
  const o = ctx.createOscillator(), e = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(55, when);
  o.frequency.exponentialRampToValueAtTime(28, when + decay);
  e.gain.setValueAtTime(vol * 1.2, when);
  e.gain.exponentialRampToValueAtTime(0.001, when + decay * 1.3);
  o.connect(e); e.connect(ctx.destination);
  o.start(when); o.stop(when + decay * 1.3 + 0.05);
}

// SNARE variants
function synthNoise(ctx: AudioContext, when: number, filterFreq: number, filterQ: number, filterType: BiquadFilterType, decay: number, vol: number, dest: AudioNode = ctx.destination) {
  const len = Math.ceil(ctx.sampleRate * (decay + 0.05));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = filterFreq; f.Q.value = filterQ;
  const e = ctx.createGain(); e.gain.setValueAtTime(vol, when); e.gain.exponentialRampToValueAtTime(0.001, when + decay);
  src.connect(f); f.connect(e); e.connect(dest);
  src.start(when); src.stop(when + decay + 0.05);
}

function synthVerbSnare(ctx: AudioContext, when: number, decay: number, vol: number) {
  // Longer reverb tail
  synthNoise(ctx, when, 3000, 1.5, 'bandpass', decay * 2.5, vol * 0.5);
  synthNoise(ctx, when, 2000, 1,   'bandpass', decay * 1.5, vol * 0.4);
}

function synthCrackSnare(ctx: AudioContext, when: number, decay: number, vol: number) {
  // Very short sharp crack
  const o = ctx.createOscillator(), e = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = 280;
  e.gain.setValueAtTime(vol * 0.5, when); e.gain.exponentialRampToValueAtTime(0.001, when + 0.03);
  o.connect(e); e.connect(ctx.destination); o.start(when); o.stop(when + 0.04);
  synthNoise(ctx, when, 6000, 3, 'highpass', decay * 0.4, vol * 0.7);
}

// HH variants
function synthHat(ctx: AudioContext, when: number, filterFreq: number, decay: number, vol: number) {
  synthNoise(ctx, when, filterFreq, 2, 'highpass', decay, vol * 0.5);
}

function synthMetalHat(ctx: AudioContext, when: number, decay: number, vol: number) {
  // 6 detuned squares for metallic cymbal
  const oscs = [240, 331, 480, 660, 800, 1000];
  const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 7000;
  const env = ctx.createGain(); env.gain.setValueAtTime(vol * 0.4, when); env.gain.exponentialRampToValueAtTime(0.001, when + decay);
  hpf.connect(env); env.connect(ctx.destination);
  oscs.forEach(f => {
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
    o.connect(hpf); o.start(when); o.stop(when + decay + 0.05);
  });
}

function synthWashHat(ctx: AudioContext, when: number, decay: number, vol: number) {
  synthNoise(ctx, when, 4000, 1, 'bandpass', decay * 3, vol * 0.35);
  synthNoise(ctx, when, 8000, 2, 'highpass',  decay * 2, vol * 0.25);
}

// BASS variants
function synthSawBass(ctx: AudioContext, when: number, midi: number, filterFreq: number, filterQ: number, decay: number, vol: number, dest: AudioNode) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(filterFreq * 5, when); f.frequency.exponentialRampToValueAtTime(filterFreq, when + decay * 0.25); f.Q.value = filterQ;
  const e = ctx.createGain(); e.gain.setValueAtTime(vol, when); e.gain.exponentialRampToValueAtTime(0.001, when + decay);
  o.connect(f); f.connect(e); e.connect(dest);
  o.start(when); o.stop(when + decay + 0.05);
}

function synthAcidBass(ctx: AudioContext, when: number, midi: number, filterFreq: number, decay: number, vol: number, dest: AudioNode) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(filterFreq * 8, when);
  f.frequency.exponentialRampToValueAtTime(filterFreq * 0.4, when + decay * 0.6);
  f.Q.value = 18; // high resonance = 303 squeal
  const e = ctx.createGain(); e.gain.setValueAtTime(vol, when); e.gain.exponentialRampToValueAtTime(0.001, when + decay);
  o.connect(f); f.connect(e); e.connect(dest);
  o.start(when); o.stop(when + decay + 0.05);
}

function synthReeseBass(ctx: AudioContext, when: number, midi: number, decay: number, vol: number, dest: AudioNode) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 2;
  const e = ctx.createGain(); e.gain.setValueAtTime(vol, when); e.gain.exponentialRampToValueAtTime(0.001, when + decay);
  [0, 0.007].forEach(detune => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq * (1 + detune);
    o.connect(f); o.start(when); o.stop(when + decay + 0.05);
  });
  f.connect(e); e.connect(dest);
}

// LEAD variants
function synthSuperSaw(ctx: AudioContext, when: number, midi: number, filterFreq: number, filterQ: number, decay: number, vol: number, dest: AudioNode) {
  const base = 440 * Math.pow(2, (midi - 69) / 12);
  const detunes = [-0.025, -0.012, 0, 0.012, 0.025];
  const mix = ctx.createGain(); mix.gain.value = vol / detunes.length;
  detunes.forEach(d => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = base * Math.pow(2, d);
    o.connect(mix); o.start(when); o.stop(when + decay + 0.05);
  });
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(filterFreq * 4, when); f.frequency.exponentialRampToValueAtTime(filterFreq, when + decay * 0.3); f.Q.value = filterQ;
  const e = ctx.createGain(); e.gain.setValueAtTime(vol, when); e.gain.exponentialRampToValueAtTime(0.001, when + decay);
  mix.connect(f); f.connect(e); e.connect(dest);
}

function synthSquareLead(ctx: AudioContext, when: number, midi: number, filterFreq: number, filterQ: number, decay: number, vol: number, dest: AudioNode) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(filterFreq * 3, when); f.frequency.exponentialRampToValueAtTime(filterFreq, when + decay * 0.1); f.Q.value = filterQ;
  const e = ctx.createGain(); e.gain.setValueAtTime(vol * 0.65, when); e.gain.exponentialRampToValueAtTime(0.001, when + decay);
  o.connect(f); f.connect(e); e.connect(dest); o.start(when); o.stop(when + decay + 0.05);
}

function synthPluck(ctx: AudioContext, when: number, midi: number, decay: number, vol: number, dest: AudioNode) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const bufLen = Math.ceil(ctx.sampleRate / freq);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq * 3; f.Q.value = 0.5;
  const e = ctx.createGain(); e.gain.setValueAtTime(vol, when); e.gain.exponentialRampToValueAtTime(0.001, when + decay * 2);
  src.connect(f); f.connect(e); e.connect(dest); src.start(when); src.stop(when + decay * 2 + 0.05);
}

// CHORD variants
function synthChordCommon(ctx: AudioContext, when: number, midi: number, semis: number[], filterFreq: number, decay: number, vol: number, dest: AudioNode) {
  semis.forEach((s, i) => {
    const freq = 440 * Math.pow(2, (midi + s - 69) / 12) * (1 + (i - 1) * 0.003);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq; f.Q.value = 1;
    const e = ctx.createGain(); e.gain.setValueAtTime(vol / semis.length, when); e.gain.exponentialRampToValueAtTime(0.001, when + decay);
    o.connect(f); f.connect(e); e.connect(dest); o.start(when); o.stop(when + decay + 0.05);
  });
}

function synthPadChord(ctx: AudioContext, when: number, midi: number, filterFreq: number, decay: number, vol: number, dest: AudioNode) {
  // Slow attack pad
  [0, 4, 7, 11].forEach((s, i) => {
    const freq = 440 * Math.pow(2, (midi + s - 69) / 12) * (1 + (i - 2) * 0.004);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq; f.Q.value = 1;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, when);
    e.gain.linearRampToValueAtTime(vol / 4, when + decay * 0.25); // slow attack
    e.gain.linearRampToValueAtTime(vol / 4, when + decay * 0.75);
    e.gain.exponentialRampToValueAtTime(0.001, when + decay * 1.5);
    o.connect(f); f.connect(e); e.connect(dest); o.start(when); o.stop(when + decay * 1.5 + 0.05);
  });
}

// FX variants
function synthFM(ctx: AudioContext, when: number, midi: number, decay: number, vol: number, dest: AudioNode) {
  const cf = 440 * Math.pow(2, (midi - 69) / 12);
  const carrier = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain();
  carrier.type = 'sine'; carrier.frequency.value = cf;
  mod.type = 'sine'; mod.frequency.value = cf * 2.73;
  mg.gain.setValueAtTime(cf * 4, when); mg.gain.exponentialRampToValueAtTime(cf * 0.2, when + decay * 0.4);
  mod.connect(mg); mg.connect(carrier.frequency);
  const e = ctx.createGain(); e.gain.setValueAtTime(vol * 0.45, when); e.gain.exponentialRampToValueAtTime(0.001, when + decay);
  carrier.connect(e); e.connect(dest); mod.start(when); carrier.start(when); mod.stop(when + decay + 0.05); carrier.stop(when + decay + 0.05);
}

function synthAM(ctx: AudioContext, when: number, midi: number, decay: number, vol: number, dest: AudioNode) {
  const cf = 440 * Math.pow(2, (midi - 69) / 12);
  const carrier = ctx.createOscillator(), mod = ctx.createOscillator();
  carrier.type = 'sawtooth'; carrier.frequency.value = cf;
  mod.type = 'sine'; mod.frequency.value = cf * 1.41;
  const mg = ctx.createGain(); mg.gain.value = cf * 1.5;
  mod.connect(mg); mg.connect(carrier.frequency); // FM-ish AM
  const e = ctx.createGain(); e.gain.setValueAtTime(vol * 0.4, when); e.gain.exponentialRampToValueAtTime(0.001, when + decay);
  carrier.connect(e); e.connect(dest); mod.start(when); carrier.start(when); mod.stop(when + decay + 0.05); carrier.stop(when + decay + 0.05);
}

function synthNoiseFX(ctx: AudioContext, when: number, filterFreq: number, decay: number, vol: number, dest: AudioNode) {
  synthNoise(ctx, when, filterFreq, 8, 'bandpass', decay, vol * 0.4, dest);
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

type A =
  | { t: 'SET_PLAYING'; v: boolean }
  | { t: 'SET_BPM'; v: number }
  | { t: 'SET_SWING'; v: number }
  | { t: 'SET_STEP'; v: number }
  | { t: 'SET_FILL'; v: boolean }
  | { t: 'INC_LOOP' }
  | { t: 'SET_SCALE'; key?: number; mode?: ScaleMode }
  | { t: 'SET_WEBCAM'; active?: boolean; filter?: number; reverb?: number; delay?: number }
  | { t: 'TOGGLE_STEP'; ti: number; si: number }
  | { t: 'UPDATE_STEP'; ti: number; si: number; p: Partial<NStep> }
  | { t: 'UPDATE_TRACK'; ti: number; p: Partial<NTrack> }
  | { t: 'RANDOMIZE_TRACK'; ti: number; density: number }
  | { t: 'CLEAR_TRACK'; ti: number }
  | { t: 'STOP' };

function reducer(state: NEngineState, a: A): NEngineState {
  switch (a.t) {
    case 'SET_PLAYING': return { ...state, playing: a.v };
    case 'SET_BPM':     return { ...state, bpm: a.v };
    case 'SET_SWING':   return { ...state, swing: a.v };
    case 'SET_STEP':    return { ...state, currentStep: a.v };
    case 'SET_FILL':    return { ...state, fillActive: a.v };
    case 'INC_LOOP':    return { ...state, loopCount: state.loopCount + 1 };
    case 'SET_SCALE':   return { ...state, scaleKey: a.key ?? state.scaleKey, scaleMode: a.mode ?? state.scaleMode };
    case 'SET_WEBCAM':  return { ...state,
      webcamActive: a.active  ?? state.webcamActive,
      webcamFilter: a.filter  ?? state.webcamFilter,
      webcamReverb: a.reverb  ?? state.webcamReverb,
      webcamDelay:  a.delay   ?? state.webcamDelay,
    };
    case 'TOGGLE_STEP': return {
      ...state, tracks: state.tracks.map((t, ti) => ti !== a.ti ? t : {
        ...t, steps: t.steps.map((s, si) => si !== a.si ? s : { ...s, active: !s.active })
      })
    };
    case 'UPDATE_STEP': return {
      ...state, tracks: state.tracks.map((t, ti) => ti !== a.ti ? t : {
        ...t, steps: t.steps.map((s, si) => {
          if (si !== a.si) return s;
          const n = { ...s, ...a.p };
          n.locked = n.pitchOffset !== 0 || n.filterMod !== 0 || n.decayMod !== 0;
          return n;
        })
      })
    };
    case 'UPDATE_TRACK': return {
      ...state, tracks: state.tracks.map((t, ti) => ti !== a.ti ? t : { ...t, ...a.p })
    };
    case 'RANDOMIZE_TRACK': return {
      ...state, tracks: state.tracks.map((t, ti) => ti !== a.ti ? t : {
        ...t, steps: t.steps.map(s => ({
          ...s,
          active: Math.random() < a.density,
          probability: Math.floor(Math.random() * 30 + 70),
          condition: (['always', 'always', 'always', '1:2', '1:4'] as const)[Math.floor(Math.random() * 5)],
        }))
      })
    };
    case 'CLEAR_TRACK': return {
      ...state, tracks: state.tracks.map((t, ti) => ti !== a.ti ? t : {
        ...t, steps: t.steps.map(s => ({ ...s, active: false, locked: false, pitchOffset: 0, filterMod: 0, decayMod: 0, probability: 100, condition: 'always' as const }))
      })
    };
    case 'STOP': return { ...state, playing: false, currentStep: -1, loopCount: 0 };
    default: return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function initState(): NEngineState {
  return {
    playing: false, bpm: 128, swing: 0, currentStep: -1,
    fillActive: false, loopCount: 0,
    scaleKey: 9, scaleMode: 'phrygian',
    webcamActive: false, webcamFilter: 0, webcamReverb: 0, webcamDelay: 0,
    tracks: defaultNTracks(),
  };
}

export function useNeuralEngine() {
  const [state, dispatch] = useReducer(reducer, null, initState);

  const ctxRef      = useRef<AudioContext | null>(null);
  const scRef       = useRef<GainNode | null>(null);
  const timerRef    = useRef<number | null>(null);
  const nextTimeRef = useRef(0);
  const stepRef     = useRef(-1);
  const loopRef     = useRef(-1);
  const playingRef  = useRef(false);
  const stateRef    = useRef(state);
  stateRef.current  = state;

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      const sc = ctxRef.current.createGain(); sc.gain.value = 1; sc.connect(ctxRef.current.destination);
      scRef.current = sc;
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const fireStep = useCallback((step: number, when: number) => {
    const s   = stateRef.current;
    const ctx = ctxRef.current!;
    const sc  = scRef.current!;

    s.tracks.forEach(track => {
      if (track.muted) return;
      const sd = track.steps[step];
      if (!sd.active) return;
      if (sd.condition === '1:2' && loopRef.current % 2 !== 0) return;
      if (sd.condition === '1:4' && loopRef.current % 4 !== 0) return;
      if (sd.condition === 'fill' && !s.fillActive) return;
      if (sd.probability < 100 && Math.random() * 100 > sd.probability) return;

      const ef = track.filterFreq * Math.pow(2, sd.locked ? sd.filterMod : 0) * (1 + s.webcamFilter * 3);
      const ed = track.decay  * Math.pow(2, sd.locked ? sd.decayMod  : 0);
      const vol = track.volume;
      const st = track.synthType;

      switch (track.role) {
        case 'kick':
          sc.gain.cancelScheduledValues(when);
          sc.gain.setValueAtTime(0.08, when);
          sc.gain.exponentialRampToValueAtTime(1.0, when + 0.2);
          if      (st === 'sine')  synthSineKick(ctx, when, ed, vol);
          else if (st === 'punch') synthPunchKick(ctx, when, ed, vol);
          else                     synthSubKick(ctx, when, ed, vol);
          window.dispatchEvent(new CustomEvent('audiobabe:drum', { detail: { drumVoice: 'KICK', velocity: vol } }));
          break;

        case 'snare':
          if      (st === 'snap')  synthNoise(ctx, when, ef, 1.5, 'bandpass', ed, vol * 0.7);
          else if (st === 'verb')  synthVerbSnare(ctx, when, ed, vol * 0.7);
          else                     synthCrackSnare(ctx, when, ed, vol * 0.7);
          window.dispatchEvent(new CustomEvent('audiobabe:drum', { detail: { drumVoice: 'SNARE', velocity: vol } }));
          break;

        case 'hh_c':
          if      (st === 'crisp') synthHat(ctx, when, ef, ed, vol * 0.55);
          else if (st === 'dark')  synthHat(ctx, when, ef * 0.4, ed, vol * 0.55);
          else                     synthMetalHat(ctx, when, ed, vol * 0.6);
          window.dispatchEvent(new CustomEvent('audiobabe:drum', { detail: { drumVoice: 'HH-C', velocity: vol } }));
          break;

        case 'hh_o':
          if      (st === 'crisp') synthHat(ctx, when, ef, ed * 4, vol * 0.45);
          else if (st === 'long')  synthHat(ctx, when, ef * 0.6, ed * 6, vol * 0.4);
          else                     synthWashHat(ctx, when, ed, vol * 0.4);
          window.dispatchEvent(new CustomEvent('audiobabe:drum', { detail: { drumVoice: 'HH-O', velocity: vol } }));
          break;

        case 'bass': {
          const note = quantize(track.rootNote + (sd.locked ? sd.pitchOffset : 0), s.scaleKey, s.scaleMode);
          if      (st === 'saw')   synthSawBass(ctx, when, note, ef, track.filterRes, ed, vol * 0.8, sc);
          else if (st === 'acid')  synthAcidBass(ctx, when, note, ef, ed, vol * 0.8, sc);
          else                     synthReeseBass(ctx, when, note, ed, vol * 0.8, sc);
          window.dispatchEvent(new CustomEvent('audiobabe:note', { detail: { midiNote: note, velocity: vol, duration: ed } }));
          break;
        }

        case 'lead': {
          const note = quantize(track.rootNote + (sd.locked ? sd.pitchOffset : 0), s.scaleKey, s.scaleMode);
          if      (st === 'supersaw') synthSuperSaw(ctx, when, note, ef, track.filterRes, ed, vol * 0.65, sc);
          else if (st === 'square')   synthSquareLead(ctx, when, note, ef, track.filterRes, ed, vol * 0.6, sc);
          else                        synthPluck(ctx, when, note, ed, vol * 0.7, sc);
          window.dispatchEvent(new CustomEvent('audiobabe:note', { detail: { midiNote: note, velocity: vol, duration: ed } }));
          break;
        }

        case 'chord': {
          const note = quantize(track.rootNote + (sd.locked ? sd.pitchOffset : 0), s.scaleKey, s.scaleMode);
          if      (st === 'minor') synthChordCommon(ctx, when, note, [0,3,7], ef, ed, vol * 0.5, sc);
          else if (st === 'major') synthChordCommon(ctx, when, note, [0,4,7], ef, ed, vol * 0.5, sc);
          else                     synthPadChord(ctx, when, note, ef, ed, vol * 0.45, sc);
          window.dispatchEvent(new CustomEvent('audiobabe:note', { detail: { midiNote: note, velocity: vol, duration: ed } }));
          break;
        }

        case 'fx': {
          const note = quantize(track.rootNote + (sd.locked ? sd.pitchOffset : 0), s.scaleKey, s.scaleMode);
          if      (st === 'fm')    synthFM(ctx, when, note, ed, vol * 0.4, sc);
          else if (st === 'am')    synthAM(ctx, when, note, ed, vol * 0.4, sc);
          else                     synthNoiseFX(ctx, when, ef, ed, vol * 0.4, sc);
          window.dispatchEvent(new CustomEvent('audiobabe:note', { detail: { midiNote: note, velocity: vol, duration: ed } }));
          break;
        }
      }
    });
  }, []);

  const tick = useCallback(() => {
    if (!playingRef.current || !ctxRef.current) return;
    const ctx = ctxRef.current;
    const s = stateRef.current;
    const stepDur = 60 / s.bpm / 4;
    const swingAmt = (s.swing / 100) * stepDur * 0.5;

    while (nextTimeRef.current < ctx.currentTime + 0.1) {
      stepRef.current = (stepRef.current + 1) % 16;
      if (stepRef.current === 0) { loopRef.current++; dispatch({ t: 'INC_LOOP' }); }

      const isOdd = stepRef.current % 2 === 1;
      const actualTime = nextTimeRef.current + (isOdd ? swingAmt : 0);

      fireStep(stepRef.current, actualTime);
      nextTimeRef.current += stepDur;
      dispatch({ t: 'SET_STEP', v: stepRef.current });
    }
  }, [fireStep]);

  const start = useCallback(() => {
    const ctx = getCtx();
    playingRef.current = true;
    stepRef.current = -1; loopRef.current = -1;
    nextTimeRef.current = ctx.currentTime + 0.05;
    dispatch({ t: 'SET_PLAYING', v: true });
    timerRef.current = window.setInterval(tick, 25);
  }, [getCtx, tick]);

  const stop = useCallback(() => {
    playingRef.current = false;
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
    dispatch({ t: 'STOP' });
  }, []);

  useEffect(() => () => {
    playingRef.current = false;
    if (timerRef.current !== null) clearInterval(timerRef.current);
    ctxRef.current?.close();
  }, []);

  const toggleStep    = useCallback((ti: number, si: number) => dispatch({ t: 'TOGGLE_STEP', ti, si }), []);
  const updateStep    = useCallback((ti: number, si: number, p: Partial<NStep>) => dispatch({ t: 'UPDATE_STEP', ti, si, p }), []);
  const updateTrack   = useCallback((ti: number, p: Partial<NTrack>) => dispatch({ t: 'UPDATE_TRACK', ti, p }), []);
  const randomize     = useCallback((ti: number, density = 0.35) => dispatch({ t: 'RANDOMIZE_TRACK', ti, density }), []);
  const clearTrack    = useCallback((ti: number) => dispatch({ t: 'CLEAR_TRACK', ti }), []);

  const updateMeta = useCallback((p: Partial<Pick<NEngineState,
    'bpm'|'swing'|'fillActive'|'scaleKey'|'scaleMode'|'webcamActive'|'webcamFilter'|'webcamReverb'|'webcamDelay'
  >>) => {
    if (p.bpm       !== undefined) dispatch({ t: 'SET_BPM',    v: p.bpm });
    if (p.swing     !== undefined) dispatch({ t: 'SET_SWING',  v: p.swing });
    if (p.fillActive !== undefined) dispatch({ t: 'SET_FILL',  v: p.fillActive });
    if (p.scaleKey !== undefined || p.scaleMode !== undefined)
      dispatch({ t: 'SET_SCALE', key: p.scaleKey, mode: p.scaleMode });
    if (p.webcamActive !== undefined || p.webcamFilter !== undefined ||
        p.webcamReverb !== undefined || p.webcamDelay  !== undefined)
      dispatch({ t: 'SET_WEBCAM', active: p.webcamActive, filter: p.webcamFilter, reverb: p.webcamReverb, delay: p.webcamDelay });
  }, []);

  return { state, start, stop, toggleStep, updateStep, updateTrack, updateMeta, randomize, clearTrack };
}
