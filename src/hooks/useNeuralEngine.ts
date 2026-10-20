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
  filterMod: number;      // exponent −2…+2 (×2^n)
  decayMod: number;       // exponent −2…+2 (×2^n)
  locked: boolean;        // any param non-default
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
  steps: NStep[];
}

export interface NEngineState {
  playing: boolean;
  bpm: number;
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

// ─── Scales ───────────────────────────────────────────────────────────────────

const SCALE_INTERVALS: Record<ScaleMode, number[]> = {
  minor:      [0, 2, 3, 5, 7, 8, 10],
  phrygian:   [0, 1, 3, 5, 7, 8, 10],
  pentatonic: [0, 3, 5, 7, 10],
};

function quantize(midi: number, root: number, mode: ScaleMode): number {
  const scale = SCALE_INTERVALS[mode];
  const semitone = ((midi - root) % 12 + 12) % 12;
  const octave = Math.floor((midi - root) / 12);
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

const TRACK_DEFS: Omit<NTrack, 'muted' | 'volume' | 'steps'>[] = [
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

export function defaultNTracks(): NTrack[] {
  return TRACK_DEFS.map(def => ({
    ...def,
    muted: false,
    volume: 0.8,
    steps: DEFAULT_PATTERNS[def.role].map(active => makeStep(active)),
  }));
}

// ─── Audio synthesis ──────────────────────────────────────────────────────────

function synthKick(ctx: AudioContext, when: number, decay: number, vol: number) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, when);
  osc.frequency.exponentialRampToValueAtTime(35, when + decay * 0.7);
  env.gain.setValueAtTime(vol, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + decay);
  osc.connect(env); env.connect(ctx.destination);
  osc.start(when); osc.stop(when + decay + 0.05);
}

function synthSnare(ctx: AudioContext, when: number, filterFreq: number, decay: number, vol: number) {
  const len = Math.ceil(ctx.sampleRate * (decay + 0.05));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass'; filt.frequency.value = filterFreq; filt.Q.value = 1.5;
  const env = ctx.createGain();
  env.gain.setValueAtTime(vol, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + decay);
  src.connect(filt); filt.connect(env); env.connect(ctx.destination);
  src.start(when); src.stop(when + decay + 0.05);
}

function synthHat(ctx: AudioContext, when: number, filterFreq: number, decay: number, vol: number) {
  const len = Math.ceil(ctx.sampleRate * (decay + 0.05));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass'; hpf.frequency.value = filterFreq; hpf.Q.value = 2;
  const env = ctx.createGain();
  env.gain.setValueAtTime(vol * 0.5, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + decay);
  src.connect(hpf); hpf.connect(env); env.connect(ctx.destination);
  src.start(when); src.stop(when + decay + 0.05);
}

function synthSaw(ctx: AudioContext, when: number, midi: number, filterFreq: number, filterQ: number, decay: number, vol: number, dest: AudioNode) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth'; osc.frequency.value = freq;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.setValueAtTime(filterFreq * 5, when);
  filt.frequency.exponentialRampToValueAtTime(filterFreq, when + decay * 0.25);
  filt.Q.value = filterQ;
  const env = ctx.createGain();
  env.gain.setValueAtTime(vol, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + decay);
  osc.connect(filt); filt.connect(env); env.connect(dest);
  osc.start(when); osc.stop(when + decay + 0.05);
}

function synthSquare(ctx: AudioContext, when: number, midi: number, filterFreq: number, filterQ: number, decay: number, vol: number, dest: AudioNode) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const osc = ctx.createOscillator();
  osc.type = 'square'; osc.frequency.value = freq;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.setValueAtTime(filterFreq * 4, when);
  filt.frequency.exponentialRampToValueAtTime(filterFreq, when + decay * 0.1);
  filt.Q.value = filterQ;
  const env = ctx.createGain();
  env.gain.setValueAtTime(vol * 0.65, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + decay);
  osc.connect(filt); filt.connect(env); env.connect(dest);
  osc.start(when); osc.stop(when + decay + 0.05);
}

function synthChord(ctx: AudioContext, when: number, midi: number, filterFreq: number, decay: number, vol: number, dest: AudioNode) {
  [0, 3, 7].forEach((semi, i) => {
    const freq = 440 * Math.pow(2, (midi + semi - 69) / 12) * (1 + (i - 1) * 0.003);
    const osc = ctx.createOscillator();
    osc.type = 'triangle'; osc.frequency.value = freq;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = filterFreq; filt.Q.value = 1;
    const env = ctx.createGain();
    env.gain.setValueAtTime(vol / 3.2, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + decay);
    osc.connect(filt); filt.connect(env); env.connect(dest);
    osc.start(when); osc.stop(when + decay + 0.05);
  });
}

function synthFM(ctx: AudioContext, when: number, midi: number, decay: number, vol: number, dest: AudioNode) {
  const carrierFreq = 440 * Math.pow(2, (midi - 69) / 12);
  const carrier = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  carrier.type = 'sine'; carrier.frequency.value = carrierFreq;
  mod.type = 'sine'; mod.frequency.value = carrierFreq * 2.73;
  modGain.gain.setValueAtTime(carrierFreq * 4, when);
  modGain.gain.exponentialRampToValueAtTime(carrierFreq * 0.2, when + decay * 0.4);
  mod.connect(modGain); modGain.connect(carrier.frequency);
  const env = ctx.createGain();
  env.gain.setValueAtTime(vol * 0.45, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + decay);
  carrier.connect(env); env.connect(dest);
  mod.start(when); carrier.start(when);
  mod.stop(when + decay + 0.05); carrier.stop(when + decay + 0.05);
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

type A =
  | { t: 'SET_PLAYING'; v: boolean }
  | { t: 'SET_BPM'; v: number }
  | { t: 'SET_STEP'; v: number }
  | { t: 'SET_FILL'; v: boolean }
  | { t: 'INC_LOOP' }
  | { t: 'SET_SCALE'; key?: number; mode?: ScaleMode }
  | { t: 'SET_WEBCAM'; active?: boolean; filter?: number; reverb?: number; delay?: number }
  | { t: 'TOGGLE_STEP'; ti: number; si: number }
  | { t: 'UPDATE_STEP'; ti: number; si: number; p: Partial<NStep> }
  | { t: 'UPDATE_TRACK'; ti: number; p: Partial<NTrack> }
  | { t: 'STOP' };

function reducer(state: NEngineState, a: A): NEngineState {
  switch (a.t) {
    case 'SET_PLAYING': return { ...state, playing: a.v };
    case 'SET_BPM':     return { ...state, bpm: a.v };
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
    case 'STOP': return { ...state, playing: false, currentStep: -1, loopCount: 0 };
    default: return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function initState(): NEngineState {
  return {
    playing: false, bpm: 128, currentStep: -1,
    fillActive: false, loopCount: 0,
    scaleKey: 9, scaleMode: 'phrygian',
    webcamActive: false, webcamFilter: 0, webcamReverb: 0, webcamDelay: 0,
    tracks: defaultNTracks(),
  };
}

export function useNeuralEngine() {
  const [state, dispatch] = useReducer(reducer, null, initState);

  const ctxRef      = useRef<AudioContext | null>(null);
  const scRef       = useRef<GainNode | null>(null);   // sidechain bus
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
      const sc = ctxRef.current.createGain();
      sc.gain.value = 1;
      sc.connect(ctxRef.current.destination);
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

      // Conditional trigs
      if (sd.condition === '1:2' && loopRef.current % 2 !== 0) return;
      if (sd.condition === '1:4' && loopRef.current % 4 !== 0) return;
      if (sd.condition === 'fill' && !s.fillActive) return;

      // Probability
      if (sd.probability < 100 && Math.random() * 100 > sd.probability) return;

      const effFilter = track.filterFreq * Math.pow(2, sd.locked ? sd.filterMod : 0) * (1 + s.webcamFilter * 3);
      const effDecay  = track.decay  * Math.pow(2, sd.locked ? sd.decayMod  : 0);
      const vol       = track.volume;

      switch (track.role) {
        case 'kick': {
          // Sidechain pump — duck synth bus on kick
          sc.gain.cancelScheduledValues(when);
          sc.gain.setValueAtTime(0.12, when);
          sc.gain.linearRampToValueAtTime(1.0, when + 0.18);
          synthKick(ctx, when, effDecay, vol);
          window.dispatchEvent(new CustomEvent('audiobabe:drum', { detail: { drumVoice: 'KICK', velocity: vol } }));
          break;
        }
        case 'snare':
          synthSnare(ctx, when, effFilter, effDecay, vol * 0.7);
          window.dispatchEvent(new CustomEvent('audiobabe:drum', { detail: { drumVoice: 'SNARE', velocity: vol } }));
          break;
        case 'hh_c':
          synthHat(ctx, when, effFilter, effDecay, vol * 0.55);
          window.dispatchEvent(new CustomEvent('audiobabe:drum', { detail: { drumVoice: 'HH-C', velocity: vol } }));
          break;
        case 'hh_o':
          synthHat(ctx, when, effFilter * 0.8, effDecay, vol * 0.45);
          window.dispatchEvent(new CustomEvent('audiobabe:drum', { detail: { drumVoice: 'HH-O', velocity: vol } }));
          break;
        case 'bass': {
          const note = quantize(track.rootNote + (sd.locked ? sd.pitchOffset : 0), s.scaleKey, s.scaleMode);
          synthSaw(ctx, when, note, effFilter, track.filterRes, effDecay, vol * 0.8, sc);
          window.dispatchEvent(new CustomEvent('audiobabe:note', { detail: { midiNote: note, velocity: vol, duration: effDecay } }));
          break;
        }
        case 'lead': {
          const note = quantize(track.rootNote + (sd.locked ? sd.pitchOffset : 0), s.scaleKey, s.scaleMode);
          synthSquare(ctx, when, note, effFilter, track.filterRes, effDecay, vol * 0.6, sc);
          window.dispatchEvent(new CustomEvent('audiobabe:note', { detail: { midiNote: note, velocity: vol, duration: effDecay } }));
          break;
        }
        case 'chord': {
          const note = quantize(track.rootNote + (sd.locked ? sd.pitchOffset : 0), s.scaleKey, s.scaleMode);
          synthChord(ctx, when, note, effFilter, effDecay, vol * 0.5, sc);
          window.dispatchEvent(new CustomEvent('audiobabe:note', { detail: { midiNote: note, velocity: vol, duration: effDecay } }));
          break;
        }
        case 'fx': {
          const note = quantize(track.rootNote + (sd.locked ? sd.pitchOffset : 0), s.scaleKey, s.scaleMode);
          synthFM(ctx, when, note, effDecay, vol * 0.4, sc);
          window.dispatchEvent(new CustomEvent('audiobabe:note', { detail: { midiNote: note, velocity: vol, duration: effDecay } }));
          break;
        }
      }
    });
  }, []);

  const tick = useCallback(() => {
    if (!playingRef.current || !ctxRef.current) return;
    const ctx = ctxRef.current;
    const stepDur = 60 / stateRef.current.bpm / 4;

    while (nextTimeRef.current < ctx.currentTime + 0.1) {
      stepRef.current = (stepRef.current + 1) % 16;
      if (stepRef.current === 0) {
        loopRef.current++;
        dispatch({ t: 'INC_LOOP' });
      }
      fireStep(stepRef.current, nextTimeRef.current);
      nextTimeRef.current += stepDur;
      dispatch({ t: 'SET_STEP', v: stepRef.current });
    }
  }, [fireStep]);

  const start = useCallback(() => {
    const ctx = getCtx();
    playingRef.current = true;
    stepRef.current  = -1;
    loopRef.current  = -1;
    nextTimeRef.current = ctx.currentTime + 0.05;
    dispatch({ t: 'SET_PLAYING', v: true });
    dispatch({ t: 'SET_STEP', v: -1 });
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

  const toggleStep  = useCallback((ti: number, si: number) => dispatch({ t: 'TOGGLE_STEP', ti, si }), []);
  const updateStep  = useCallback((ti: number, si: number, p: Partial<NStep>) => dispatch({ t: 'UPDATE_STEP', ti, si, p }), []);
  const updateTrack = useCallback((ti: number, p: Partial<NTrack>) => dispatch({ t: 'UPDATE_TRACK', ti, p }), []);

  const updateMeta = useCallback((p: Partial<Pick<NEngineState,
    'bpm'|'fillActive'|'scaleKey'|'scaleMode'|'webcamActive'|'webcamFilter'|'webcamReverb'|'webcamDelay'
  >>) => {
    if (p.bpm       !== undefined) dispatch({ t: 'SET_BPM',   v: p.bpm });
    if (p.fillActive !== undefined) dispatch({ t: 'SET_FILL',  v: p.fillActive });
    if (p.scaleKey !== undefined || p.scaleMode !== undefined)
      dispatch({ t: 'SET_SCALE', key: p.scaleKey, mode: p.scaleMode });
    if (p.webcamActive !== undefined || p.webcamFilter !== undefined ||
        p.webcamReverb !== undefined || p.webcamDelay  !== undefined)
      dispatch({ t: 'SET_WEBCAM', active: p.webcamActive, filter: p.webcamFilter, reverb: p.webcamReverb, delay: p.webcamDelay });
  }, []);

  return { state, start, stop, toggleStep, updateStep, updateTrack, updateMeta };
}
