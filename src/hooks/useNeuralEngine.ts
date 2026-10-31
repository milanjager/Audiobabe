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
  attack: number;      // 0–0.4 s
  reverbSend: number;  // 0–1
  delaySend: number;   // 0–1
  synthType: string;
  steps: NStep[];
}

export interface NEngineState {
  playing: boolean;
  bpm: number;
  swing: number;
  currentStep: number;
  fillActive: boolean;
  loopCount: number;
  scaleKey: number;
  scaleMode: ScaleMode;
  webcamActive: boolean;
  webcamFilter: number;
  webcamReverb: number;
  webcamDelay: number;
  globalReverb: number;   // 0–1 master reverb
  globalDelay: number;    // 0–1 master delay
  currentPattern: number; // 0–3
  patternSlots: NStep[][][]; // [pattern][track][step]
  tracks: NTrack[];
}

// ─── Sound bank ───────────────────────────────────────────────────────────────

export const ROLE_SYNTH_OPTIONS: Record<TrackRole, { id: string; label: string }[]> = {
  kick:  [{ id: 'sine',     label: 'SINE'  }, { id: 'punch', label: 'PUNCH' }, { id: 'sub',   label: 'SUB'  }],
  snare: [{ id: 'snap',     label: 'SNAP'  }, { id: 'verb',  label: 'VERB'  }, { id: 'crack', label: 'CRACK'}],
  hh_c:  [{ id: 'crisp',   label: 'CRISP' }, { id: 'dark',  label: 'DARK'  }, { id: 'metal', label: 'METAL'}],
  hh_o:  [{ id: 'crisp',   label: 'CRISP' }, { id: 'long',  label: 'LONG'  }, { id: 'wash',  label: 'WASH' }],
  bass:  [{ id: 'saw',      label: 'SAW'   }, { id: 'acid',  label: 'ACID'  }, { id: 'reese', label: 'REESE'}],
  lead:  [{ id: 'supersaw', label: 'SUPER' }, { id: 'square',label: 'SQR'  }, { id: 'pluck', label: 'PLUCK'}],
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
  { role: 'kick',  name: 'KICK',  color: '#f97316', rootNote: 41, filterFreq: 120,  filterRes: 1,   decay: 0.55, attack: 0.003, reverbSend: 0.1,  delaySend: 0.05 },
  { role: 'snare', name: 'SNARE', color: '#ef4444', rootNote: 48, filterFreq: 3500, filterRes: 2,   decay: 0.22, attack: 0.004, reverbSend: 0.2,  delaySend: 0.1  },
  { role: 'hh_c',  name: 'HH-C',  color: '#eab308', rootNote: 60, filterFreq: 8000, filterRes: 3,   decay: 0.05, attack: 0.002, reverbSend: 0.05, delaySend: 0.0  },
  { role: 'hh_o',  name: 'HH-O',  color: '#fde047', rootNote: 62, filterFreq: 6500, filterRes: 2,   decay: 0.22, attack: 0.003, reverbSend: 0.15, delaySend: 0.05 },
  { role: 'bass',  name: 'BASS',  color: '#a855f7', rootNote: 33, filterFreq: 700,  filterRes: 5,   decay: 0.32, attack: 0.01,  reverbSend: 0.1,  delaySend: 0.15 },
  { role: 'lead',  name: 'LEAD',  color: '#22c55e', rootNote: 57, filterFreq: 2800, filterRes: 3.5, decay: 0.18, attack: 0.02,  reverbSend: 0.3,  delaySend: 0.25 },
  { role: 'chord', name: 'CHORD', color: '#3b82f6', rootNote: 45, filterFreq: 1800, filterRes: 1.5, decay: 0.7,  attack: 0.06,  reverbSend: 0.45, delaySend: 0.1  },
  { role: 'fx',    name: 'FX',    color: '#ec4899', rootNote: 36, filterFreq: 1200, filterRes: 8,   decay: 0.9,  attack: 0.08,  reverbSend: 0.35, delaySend: 0.35 },
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

function makeEmptySteps(): NStep[][] {
  return Array.from({ length: 8 }, () => Array.from({ length: 16 }, () => makeStep(false)));
}

function defaultPatternSlots(): NStep[][][] {
  const initial = defaultNTracks().map(t => t.steps);
  return [initial, makeEmptySteps(), makeEmptySteps(), makeEmptySteps()];
}

// ─── Audio synthesis ──────────────────────────────────────────────────────────

// Helper: generate synthetic reverb IR
function createReverbIR(ctx: AudioContext, duration = 1.8): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    }
  }
  return buf;
}

// KICK
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
  const o = ctx.createOscillator(), e = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(55, when);
  o.frequency.exponentialRampToValueAtTime(28, when + decay);
  e.gain.setValueAtTime(vol * 1.2, when);
  e.gain.exponentialRampToValueAtTime(0.001, when + decay * 1.3);
  o.connect(e); e.connect(ctx.destination);
  o.start(when); o.stop(when + decay * 1.3 + 0.05);
}

// SNARE / HH helpers
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
  synthNoise(ctx, when, 3000, 1.5, 'bandpass', decay * 2.5, vol * 0.5);
  synthNoise(ctx, when, 2000, 1,   'bandpass', decay * 1.5, vol * 0.4);
}

function synthCrackSnare(ctx: AudioContext, when: number, decay: number, vol: number) {
  const o = ctx.createOscillator(), e = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = 280;
  e.gain.setValueAtTime(vol * 0.5, when); e.gain.exponentialRampToValueAtTime(0.001, when + 0.03);
  o.connect(e); e.connect(ctx.destination); o.start(when); o.stop(when + 0.04);
  synthNoise(ctx, when, 6000, 3, 'highpass', decay * 0.4, vol * 0.7);
}

function synthHat(ctx: AudioContext, when: number, filterFreq: number, decay: number, vol: number) {
  synthNoise(ctx, when, filterFreq, 2, 'highpass', decay, vol * 0.5);
}

function synthMetalHat(ctx: AudioContext, when: number, decay: number, vol: number) {
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

// BASS
function synthSawBass(ctx: AudioContext, when: number, midi: number, filterFreq: number, filterQ: number, decay: number, atk: number, vol: number, dest: AudioNode) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(filterFreq * 5, when); f.frequency.exponentialRampToValueAtTime(filterFreq, when + decay * 0.25); f.Q.value = filterQ;
  const e = ctx.createGain();
  e.gain.setValueAtTime(0, when);
  e.gain.linearRampToValueAtTime(vol, when + atk);
  e.gain.exponentialRampToValueAtTime(0.001, when + atk + decay);
  o.connect(f); f.connect(e); e.connect(dest);
  o.start(when); o.stop(when + atk + decay + 0.05);
}

function synthAcidBass(ctx: AudioContext, when: number, midi: number, filterFreq: number, decay: number, atk: number, vol: number, dest: AudioNode) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(filterFreq * 8, when);
  f.frequency.exponentialRampToValueAtTime(filterFreq * 0.4, when + decay * 0.6);
  f.Q.value = 18;
  const e = ctx.createGain();
  e.gain.setValueAtTime(0, when);
  e.gain.linearRampToValueAtTime(vol, when + atk);
  e.gain.exponentialRampToValueAtTime(0.001, when + atk + decay);
  o.connect(f); f.connect(e); e.connect(dest);
  o.start(when); o.stop(when + atk + decay + 0.05);
}

function synthReeseBass(ctx: AudioContext, when: number, midi: number, decay: number, atk: number, vol: number, dest: AudioNode) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 2;
  const e = ctx.createGain();
  e.gain.setValueAtTime(0, when);
  e.gain.linearRampToValueAtTime(vol, when + atk);
  e.gain.exponentialRampToValueAtTime(0.001, when + atk + decay);
  [0, 0.007].forEach(detune => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq * (1 + detune);
    o.connect(f); o.start(when); o.stop(when + atk + decay + 0.05);
  });
  f.connect(e); e.connect(dest);
}

// LEAD
function synthSuperSaw(ctx: AudioContext, when: number, midi: number, filterFreq: number, filterQ: number, decay: number, atk: number, vol: number, dest: AudioNode) {
  const base = 440 * Math.pow(2, (midi - 69) / 12);
  const detunes = [-0.025, -0.012, 0, 0.012, 0.025];
  const mix = ctx.createGain(); mix.gain.value = vol / detunes.length;
  detunes.forEach(d => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = base * Math.pow(2, d);
    o.connect(mix); o.start(when); o.stop(when + atk + decay + 0.05);
  });
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(filterFreq * 4, when); f.frequency.exponentialRampToValueAtTime(filterFreq, when + decay * 0.3); f.Q.value = filterQ;
  const e = ctx.createGain();
  e.gain.setValueAtTime(0, when);
  e.gain.linearRampToValueAtTime(vol, when + atk);
  e.gain.exponentialRampToValueAtTime(0.001, when + atk + decay);
  mix.connect(f); f.connect(e); e.connect(dest);
}

function synthSquareLead(ctx: AudioContext, when: number, midi: number, filterFreq: number, filterQ: number, decay: number, atk: number, vol: number, dest: AudioNode) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(filterFreq * 3, when); f.frequency.exponentialRampToValueAtTime(filterFreq, when + decay * 0.1); f.Q.value = filterQ;
  const e = ctx.createGain();
  e.gain.setValueAtTime(0, when);
  e.gain.linearRampToValueAtTime(vol * 0.65, when + atk);
  e.gain.exponentialRampToValueAtTime(0.001, when + atk + decay);
  o.connect(f); f.connect(e); e.connect(dest); o.start(when); o.stop(when + atk + decay + 0.05);
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

// CHORD
function synthChordCommon(ctx: AudioContext, when: number, midi: number, semis: number[], filterFreq: number, decay: number, atk: number, vol: number, dest: AudioNode) {
  semis.forEach((s, i) => {
    const freq = 440 * Math.pow(2, (midi + s - 69) / 12) * (1 + (i - 1) * 0.003);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq; f.Q.value = 1;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, when);
    e.gain.linearRampToValueAtTime(vol / semis.length, when + atk);
    e.gain.exponentialRampToValueAtTime(0.001, when + atk + decay);
    o.connect(f); f.connect(e); e.connect(dest); o.start(when); o.stop(when + atk + decay + 0.05);
  });
}

function synthPadChord(ctx: AudioContext, when: number, midi: number, filterFreq: number, decay: number, atk: number, vol: number, dest: AudioNode) {
  [0, 4, 7, 11].forEach((s, i) => {
    const freq = 440 * Math.pow(2, (midi + s - 69) / 12) * (1 + (i - 2) * 0.004);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq; f.Q.value = 1;
    const e = ctx.createGain();
    const realAtk = Math.max(atk, 0.08);
    e.gain.setValueAtTime(0, when);
    e.gain.linearRampToValueAtTime(vol / 4, when + realAtk);
    e.gain.linearRampToValueAtTime(vol / 4, when + realAtk + decay * 0.5);
    e.gain.exponentialRampToValueAtTime(0.001, when + realAtk + decay * 1.5);
    o.connect(f); f.connect(e); e.connect(dest); o.start(when); o.stop(when + realAtk + decay * 1.5 + 0.05);
  });
}

// FX
function synthFM(ctx: AudioContext, when: number, midi: number, decay: number, atk: number, vol: number, dest: AudioNode) {
  const cf = 440 * Math.pow(2, (midi - 69) / 12);
  const carrier = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain();
  carrier.type = 'sine'; carrier.frequency.value = cf;
  mod.type = 'sine'; mod.frequency.value = cf * 2.73;
  mg.gain.setValueAtTime(cf * 4, when); mg.gain.exponentialRampToValueAtTime(cf * 0.2, when + decay * 0.4);
  mod.connect(mg); mg.connect(carrier.frequency);
  const e = ctx.createGain();
  e.gain.setValueAtTime(0, when);
  e.gain.linearRampToValueAtTime(vol * 0.45, when + atk);
  e.gain.exponentialRampToValueAtTime(0.001, when + atk + decay);
  carrier.connect(e); e.connect(dest); mod.start(when); carrier.start(when); mod.stop(when + atk + decay + 0.05); carrier.stop(when + atk + decay + 0.05);
}

function synthAM(ctx: AudioContext, when: number, midi: number, decay: number, atk: number, vol: number, dest: AudioNode) {
  const cf = 440 * Math.pow(2, (midi - 69) / 12);
  const carrier = ctx.createOscillator(), mod = ctx.createOscillator();
  carrier.type = 'sawtooth'; carrier.frequency.value = cf;
  mod.type = 'sine'; mod.frequency.value = cf * 1.41;
  const mg = ctx.createGain(); mg.gain.value = cf * 1.5;
  mod.connect(mg); mg.connect(carrier.frequency);
  const e = ctx.createGain();
  e.gain.setValueAtTime(0, when);
  e.gain.linearRampToValueAtTime(vol * 0.4, when + atk);
  e.gain.exponentialRampToValueAtTime(0.001, when + atk + decay);
  carrier.connect(e); e.connect(dest); mod.start(when); carrier.start(when); mod.stop(when + atk + decay + 0.05); carrier.stop(when + atk + decay + 0.05);
}

function synthNoiseFX(ctx: AudioContext, when: number, filterFreq: number, decay: number, atk: number, vol: number, dest: AudioNode) {
  const len = Math.ceil(ctx.sampleRate * (atk + decay + 0.05));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = filterFreq; f.Q.value = 8;
  const e = ctx.createGain();
  e.gain.setValueAtTime(0, when);
  e.gain.linearRampToValueAtTime(vol * 0.4, when + atk);
  e.gain.exponentialRampToValueAtTime(0.001, when + atk + decay);
  src.connect(f); f.connect(e); e.connect(dest);
  src.start(when); src.stop(when + atk + decay + 0.05);
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
  | { t: 'SET_GLOBAL_FX'; reverb?: number; delay?: number }
  | { t: 'TOGGLE_STEP'; ti: number; si: number }
  | { t: 'UPDATE_STEP'; ti: number; si: number; p: Partial<NStep> }
  | { t: 'UPDATE_TRACK'; ti: number; p: Partial<NTrack> }
  | { t: 'RANDOMIZE_TRACK'; ti: number; density: number }
  | { t: 'CLEAR_TRACK'; ti: number }
  | { t: 'SWITCH_PATTERN'; idx: number }
  | { t: 'COPY_PATTERN'; from: number; to: number }
  | { t: 'STOP' };

function syncSlots(tracks: NTrack[], slots: NStep[][][], pi: number): NStep[][][] {
  return slots.map((slot, i) => i === pi ? tracks.map(t => t.steps) : slot);
}

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
    case 'SET_GLOBAL_FX': return { ...state,
      globalReverb: a.reverb ?? state.globalReverb,
      globalDelay:  a.delay  ?? state.globalDelay,
    };

    case 'TOGGLE_STEP': {
      const newTracks = state.tracks.map((t, ti) => ti !== a.ti ? t : {
        ...t, steps: t.steps.map((s, si) => si !== a.si ? s : { ...s, active: !s.active })
      });
      return { ...state, tracks: newTracks, patternSlots: syncSlots(newTracks, state.patternSlots, state.currentPattern) };
    }
    case 'UPDATE_STEP': {
      const newTracks = state.tracks.map((t, ti) => ti !== a.ti ? t : {
        ...t, steps: t.steps.map((s, si) => {
          if (si !== a.si) return s;
          const n = { ...s, ...a.p };
          n.locked = n.pitchOffset !== 0 || n.filterMod !== 0 || n.decayMod !== 0;
          return n;
        })
      });
      return { ...state, tracks: newTracks, patternSlots: syncSlots(newTracks, state.patternSlots, state.currentPattern) };
    }
    case 'UPDATE_TRACK': return {
      ...state, tracks: state.tracks.map((t, ti) => ti !== a.ti ? t : { ...t, ...a.p })
    };
    case 'RANDOMIZE_TRACK': {
      const newTracks = state.tracks.map((t, ti) => ti !== a.ti ? t : {
        ...t, steps: t.steps.map(s => ({
          ...s,
          active: Math.random() < a.density,
          probability: Math.floor(Math.random() * 30 + 70),
          condition: (['always', 'always', 'always', '1:2', '1:4'] as const)[Math.floor(Math.random() * 5)],
        }))
      });
      return { ...state, tracks: newTracks, patternSlots: syncSlots(newTracks, state.patternSlots, state.currentPattern) };
    }
    case 'CLEAR_TRACK': {
      const newTracks = state.tracks.map((t, ti) => ti !== a.ti ? t : {
        ...t, steps: t.steps.map(s => ({ ...s, active: false, locked: false, pitchOffset: 0, filterMod: 0, decayMod: 0, probability: 100, condition: 'always' as const }))
      });
      return { ...state, tracks: newTracks, patternSlots: syncSlots(newTracks, state.patternSlots, state.currentPattern) };
    }

    case 'SWITCH_PATTERN': {
      const newSlots = syncSlots(state.tracks, state.patternSlots, state.currentPattern);
      const newTracks = state.tracks.map((t, ti) => ({
        ...t, steps: newSlots[a.idx][ti],
      }));
      return { ...state, currentPattern: a.idx, patternSlots: newSlots, tracks: newTracks };
    }
    case 'COPY_PATTERN': {
      const src = state.patternSlots[a.from];
      const newSlots = state.patternSlots.map((slot, pi) =>
        pi === a.to ? src.map(trackSteps => trackSteps.map(s => ({ ...s }))) : slot
      );
      return { ...state, patternSlots: newSlots };
    }

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
    globalReverb: 0.25, globalDelay: 0.15,
    currentPattern: 0,
    patternSlots: defaultPatternSlots(),
    tracks: defaultNTracks(),
  };
}

export function useNeuralEngine() {
  const [state, dispatch] = useReducer(reducer, null, initState);

  const ctxRef       = useRef<AudioContext | null>(null);
  const scRef        = useRef<GainNode | null>(null);
  const reverbBusRef = useRef<GainNode | null>(null);
  const delayBusRef  = useRef<GainNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const timerRef     = useRef<number | null>(null);
  const nextTimeRef  = useRef(0);
  const stepRef      = useRef(-1);
  const loopRef      = useRef(-1);
  const playingRef   = useRef(false);
  const stateRef     = useRef(state);
  stateRef.current   = state;

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      // Main synth bus (sidechain pump target)
      const sc = ctx.createGain(); sc.gain.value = 1; sc.connect(ctx.destination);
      scRef.current = sc;

      // Reverb bus
      const reverbIn = ctx.createGain(); reverbIn.gain.value = 0;
      const conv = ctx.createConvolver(); conv.buffer = createReverbIR(ctx, 1.8);
      const reverbOut = ctx.createGain(); reverbOut.gain.value = 0.7;
      reverbIn.connect(conv); conv.connect(reverbOut); reverbOut.connect(ctx.destination);
      sc.connect(reverbIn);
      reverbBusRef.current = reverbIn;

      // Delay bus (dotted 8th at 128 BPM = 0.352s)
      const delayIn = ctx.createGain(); delayIn.gain.value = 0;
      const delayNode = ctx.createDelay(2.0); delayNode.delayTime.value = 0.352;
      const delayFB = ctx.createGain(); delayFB.gain.value = 0.38;
      const delayLPF = ctx.createBiquadFilter(); delayLPF.type = 'lowpass'; delayLPF.frequency.value = 4000;
      delayIn.connect(delayNode); delayNode.connect(delayLPF); delayLPF.connect(delayFB);
      delayFB.connect(delayNode); delayNode.connect(ctx.destination);
      sc.connect(delayIn);
      delayBusRef.current = delayIn;
      delayNodeRef.current = delayNode;
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  // Sync effect bus levels when globals change
  useEffect(() => {
    if (!reverbBusRef.current || !delayBusRef.current) return;
    const rv = Math.min(1, state.globalReverb + state.webcamReverb * 0.5);
    const dl = Math.min(1, state.globalDelay  + state.webcamDelay  * 0.5);
    reverbBusRef.current.gain.setTargetAtTime(rv * 0.35, ctxRef.current!.currentTime, 0.05);
    delayBusRef.current.gain.setTargetAtTime(dl * 0.28,  ctxRef.current!.currentTime, 0.05);
  }, [state.globalReverb, state.globalDelay, state.webcamReverb, state.webcamDelay]);

  // Update delay time when BPM changes
  useEffect(() => {
    if (!delayNodeRef.current || !ctxRef.current) return;
    delayNodeRef.current.delayTime.setTargetAtTime(60 / state.bpm * 0.75, ctxRef.current.currentTime, 0.1);
  }, [state.bpm]);

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
      const st  = track.synthType;
      const atk = track.attack;

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
          if      (st === 'saw')   synthSawBass(ctx, when, note, ef, track.filterRes, ed, atk, vol * 0.8, sc);
          else if (st === 'acid')  synthAcidBass(ctx, when, note, ef, ed, atk, vol * 0.8, sc);
          else                     synthReeseBass(ctx, when, note, ed, atk, vol * 0.8, sc);
          window.dispatchEvent(new CustomEvent('audiobabe:note', { detail: { midiNote: note, velocity: vol, duration: ed } }));
          break;
        }

        case 'lead': {
          const note = quantize(track.rootNote + (sd.locked ? sd.pitchOffset : 0), s.scaleKey, s.scaleMode);
          if      (st === 'supersaw') synthSuperSaw(ctx, when, note, ef, track.filterRes, ed, atk, vol * 0.65, sc);
          else if (st === 'square')   synthSquareLead(ctx, when, note, ef, track.filterRes, ed, atk, vol * 0.6, sc);
          else                        synthPluck(ctx, when, note, ed, vol * 0.7, sc);
          window.dispatchEvent(new CustomEvent('audiobabe:note', { detail: { midiNote: note, velocity: vol, duration: ed } }));
          break;
        }

        case 'chord': {
          const note = quantize(track.rootNote + (sd.locked ? sd.pitchOffset : 0), s.scaleKey, s.scaleMode);
          if      (st === 'minor') synthChordCommon(ctx, when, note, [0,3,7], ef, ed, atk, vol * 0.5, sc);
          else if (st === 'major') synthChordCommon(ctx, when, note, [0,4,7], ef, ed, atk, vol * 0.5, sc);
          else                     synthPadChord(ctx, when, note, ef, ed, atk, vol * 0.45, sc);
          window.dispatchEvent(new CustomEvent('audiobabe:note', { detail: { midiNote: note, velocity: vol, duration: ed } }));
          break;
        }

        case 'fx': {
          const note = quantize(track.rootNote + (sd.locked ? sd.pitchOffset : 0), s.scaleKey, s.scaleMode);
          if      (st === 'fm')    synthFM(ctx, when, note, ed, atk, vol * 0.4, sc);
          else if (st === 'am')    synthAM(ctx, when, note, ed, atk, vol * 0.4, sc);
          else                     synthNoiseFX(ctx, when, ef, ed, atk, vol * 0.4, sc);
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
    // Force initialize effect levels
    if (reverbBusRef.current) reverbBusRef.current.gain.value = state.globalReverb * 0.35;
    if (delayBusRef.current)  delayBusRef.current.gain.value  = state.globalDelay  * 0.28;
    playingRef.current = true;
    stepRef.current = -1; loopRef.current = -1;
    nextTimeRef.current = ctx.currentTime + 0.05;
    dispatch({ t: 'SET_PLAYING', v: true });
    timerRef.current = window.setInterval(tick, 25);
  }, [getCtx, tick, state.globalReverb, state.globalDelay]);

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

  const toggleStep     = useCallback((ti: number, si: number) => dispatch({ t: 'TOGGLE_STEP', ti, si }), []);
  const updateStep     = useCallback((ti: number, si: number, p: Partial<NStep>) => dispatch({ t: 'UPDATE_STEP', ti, si, p }), []);
  const updateTrack    = useCallback((ti: number, p: Partial<NTrack>) => dispatch({ t: 'UPDATE_TRACK', ti, p }), []);
  const randomize      = useCallback((ti: number, density = 0.35) => dispatch({ t: 'RANDOMIZE_TRACK', ti, density }), []);
  const clearTrack     = useCallback((ti: number) => dispatch({ t: 'CLEAR_TRACK', ti }), []);
  const switchPattern  = useCallback((idx: number) => dispatch({ t: 'SWITCH_PATTERN', idx }), []);
  const copyPattern    = useCallback((from: number, to: number) => dispatch({ t: 'COPY_PATTERN', from, to }), []);
  const setGlobalFX    = useCallback((reverb?: number, delay?: number) => dispatch({ t: 'SET_GLOBAL_FX', reverb, delay }), []);

  const updateMeta = useCallback((p: Partial<Pick<NEngineState,
    'bpm'|'swing'|'fillActive'|'scaleKey'|'scaleMode'|'webcamActive'|'webcamFilter'|'webcamReverb'|'webcamDelay'
  >>) => {
    if (p.bpm        !== undefined) dispatch({ t: 'SET_BPM',   v: p.bpm });
    if (p.swing      !== undefined) dispatch({ t: 'SET_SWING', v: p.swing });
    if (p.fillActive !== undefined) dispatch({ t: 'SET_FILL',  v: p.fillActive });
    if (p.scaleKey !== undefined || p.scaleMode !== undefined)
      dispatch({ t: 'SET_SCALE', key: p.scaleKey, mode: p.scaleMode });
    if (p.webcamActive !== undefined || p.webcamFilter !== undefined ||
        p.webcamReverb !== undefined || p.webcamDelay  !== undefined)
      dispatch({ t: 'SET_WEBCAM', active: p.webcamActive, filter: p.webcamFilter, reverb: p.webcamReverb, delay: p.webcamDelay });
  }, []);

  return { state, start, stop, toggleStep, updateStep, updateTrack, updateMeta, randomize, clearTrack, switchPattern, copyPattern, setGlobalFX };
}
