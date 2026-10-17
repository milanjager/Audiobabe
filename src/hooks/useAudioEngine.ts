import { useRef, useCallback } from 'react';

export type SynthType =
  | 'kick' | 'snare' | 'hat_c' | 'hat_o'
  | 'tom' | 'clap' | 'rimshot' | 'conga'
  | 'ride' | 'tonal' | 'cowbell' | 'block' | 'crash';

export interface SynthParams {
  tone: number;     // 0–1  filter character / timbre
  pitch: number;    // 0–1  base frequency
  decay: number;    // 0–1  envelope length
  slap: number;     // 0–1  transient snap
  pulse: number;    // 0–1  wave character
  drive: number;    // 0–1  distortion
  level: number;    // 0–1  volume
  pan: number;      // 0–1  stereo pan (0.5 = center)
  humanize: number; // 0–1  random variation
}

export interface Voice {
  id: string;
  label: string;
  color: string;
  synthType: SynthType;
  col: number;
  row: number;
  muted: boolean;
  solo: boolean;
  steps: number[];    // 16 steps, 0=off, 0.45/0.75/1.0=velocity
  params: SynthParams;
}

const STEPS = 16;

export function defaultParams(overrides?: Partial<SynthParams>): SynthParams {
  return {
    tone: 0.5, pitch: 0.5, decay: 0.5, slap: 0.5, pulse: 0.5,
    drive: 0, level: 0.85, pan: 0.5, humanize: 0,
    ...overrides,
  };
}

export function defaultVoices(): Voice[] {
  return [
    // col 0
    { id:'kick_a',  label:'kick a',  color:'#f59e0b', synthType:'kick',   col:0, row:0, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.35,decay:0.55}) },
    { id:'tom_l',   label:'tom l',   color:'#22d3ee', synthType:'tom',    col:0, row:1, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.3}) },
    { id:'tonal',   label:'tonal',   color:'#94a3b8', synthType:'tonal',  col:0, row:2, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.7}) },
    // col 1
    { id:'kick_b',  label:'kick b',  color:'#84cc16', synthType:'kick',   col:1, row:0, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.45,tone:0.3}) },
    { id:'tom_h',   label:'tom h',   color:'#a78bfa', synthType:'tom',    col:1, row:1, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.65}) },
    { id:'cowbell', label:'cowbell', color:'#ec4899', synthType:'cowbell',col:1, row:2, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams() },
    // col 2
    { id:'snare_a', label:'snare a', color:'#818cf8', synthType:'snare',  col:2, row:0, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams() },
    { id:'clap',    label:'clap',    color:'#06b6d4', synthType:'clap',   col:2, row:1, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams() },
    { id:'rimshot', label:'rimshot', color:'#64748b', synthType:'rimshot',col:2, row:2, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.2}) },
    // col 3
    { id:'snare_b', label:'snare b', color:'#f97316', synthType:'snare',  col:3, row:0, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({tone:0.7}) },
    { id:'hat_b',   label:'hat b',   color:'#10b981', synthType:'hat_c',  col:3, row:1, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.15}) },
    { id:'block',   label:'block',   color:'#6366f1', synthType:'block',  col:3, row:2, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.1}) },
    // col 4
    { id:'hat_a',   label:'hat a',   color:'#4ade80', synthType:'hat_c',  col:4, row:0, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.7,decay:0.12}) },
    { id:'conga_l', label:'conga l', color:'#818cf8', synthType:'conga',  col:4, row:1, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.4}) },
    { id:'conga_h', label:'conga h', color:'#c084fc', synthType:'conga',  col:4, row:2, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.65}) },
    // col 5
    { id:'hat_op',  label:'hat op',  color:'#14b8a6', synthType:'hat_o',  col:5, row:0, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.6}) },
    { id:'ride',    label:'ride',    color:'#94a3b8', synthType:'ride',   col:5, row:1, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.65}) },
    { id:'crash',   label:'crash',   color:'#f87171', synthType:'crash',  col:5, row:2, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.85}) },
  ];
}

function humanizeVal(val: number, amount: number): number {
  if (amount === 0) return val;
  return val * (1 + (Math.random() * 2 - 1) * amount * 0.3);
}

export function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStepRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const isPlayingRef = useRef(false);

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.gain.value = 0.8;
      masterRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const applyDrive = useCallback((ctx: AudioContext, amount: number): WaveShaperNode => {
    const ws = ctx.createWaveShaper();
    const k = amount * 400;
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = k > 0 ? (Math.PI + k) * x / (Math.PI + k * Math.abs(x)) : x;
    }
    ws.curve = curve;
    return ws;
  }, []);

  const noise = useCallback((ctx: AudioContext, dur: number) => {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }, []);

  const panner = useCallback((ctx: AudioContext, pan: number): StereoPannerNode => {
    const p = ctx.createStereoPanner();
    p.pan.value = (pan - 0.5) * 2;
    return p;
  }, []);

  const synthVoice = useCallback((ctx: AudioContext, type: SynthType, vel: number, p: SynthParams, when: number) => {
    const dest = masterRef.current!;
    const pan = panner(ctx, p.pan);
    pan.connect(dest);

    const v = humanizeVal(vel * p.level, p.humanize);
    const decay = humanizeVal(p.decay, p.humanize);
    const pitch = humanizeVal(p.pitch, p.humanize);

    const connect = (node: AudioNode) => {
      if (p.drive > 0.02) {
        const ws = applyDrive(ctx, p.drive);
        node.connect(ws); ws.connect(pan);
      } else {
        node.connect(pan);
      }
    };

    switch (type) {
      case 'kick': {
        const baseF = 30 + pitch * 100;
        const dur = 0.15 + decay * 0.7;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseF * (2 + p.slap * 3), when);
        osc.frequency.exponentialRampToValueAtTime(baseF, when + 0.04 + p.slap * 0.04);
        osc.connect(g); connect(g);
        g.gain.setValueAtTime(v, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur + 0.05);
        break;
      }
      case 'snare': {
        const dur = 0.1 + decay * 0.35;
        const toneF = 150 + pitch * 250;
        const noiseMix = 0.3 + p.tone * 0.65;
        // tone
        const osc = ctx.createOscillator();
        const og = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(toneF, when);
        osc.frequency.exponentialRampToValueAtTime(toneF * 0.6, when + dur);
        osc.connect(og); connect(og);
        og.gain.setValueAtTime(v * (1 - noiseMix) * 0.9, when);
        og.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur);
        // noise
        const src = noise(ctx, dur + 0.02);
        const filt = ctx.createBiquadFilter();
        const ng = ctx.createGain();
        filt.type = 'bandpass';
        filt.frequency.value = 2000 + p.tone * 4000;
        filt.Q.value = 0.5;
        src.connect(filt); filt.connect(ng); connect(ng);
        ng.gain.setValueAtTime(v * noiseMix, when);
        ng.gain.exponentialRampToValueAtTime(0.001, when + dur);
        src.start(when); src.stop(when + dur + 0.02);
        break;
      }
      case 'hat_c': {
        const dur = 0.025 + decay * 0.1;
        const cutoff = 8000 + pitch * 6000;
        const src = noise(ctx, dur + 0.01);
        const hp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        hp.type = 'highpass'; hp.frequency.value = cutoff;
        src.connect(hp); hp.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.45, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        src.start(when); src.stop(when + dur + 0.01);
        break;
      }
      case 'hat_o': {
        const dur = 0.12 + decay * 0.8;
        const cutoff = 6000 + pitch * 5000;
        const src = noise(ctx, dur + 0.05);
        const hp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        hp.type = 'highpass'; hp.frequency.value = cutoff;
        src.connect(hp); hp.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.4, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        src.start(when); src.stop(when + dur + 0.05);
        break;
      }
      case 'tom': {
        const baseF = 60 + pitch * 220;
        const dur = 0.12 + decay * 0.55;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseF * (1.5 + p.slap), when);
        osc.frequency.exponentialRampToValueAtTime(baseF, when + 0.04);
        osc.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.9, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur);
        break;
      }
      case 'clap': {
        const dur = 0.06 + decay * 0.18;
        const freq = 900 + pitch * 1600;
        [0, 0.008, 0.016].forEach(off => {
          const src = noise(ctx, 0.18);
          const filt = ctx.createBiquadFilter();
          const g = ctx.createGain();
          filt.type = 'bandpass'; filt.frequency.value = freq; filt.Q.value = 0.7;
          src.connect(filt); filt.connect(g); connect(g);
          g.gain.setValueAtTime(v * 0.5, when + off);
          g.gain.exponentialRampToValueAtTime(0.001, when + off + dur);
          src.start(when + off); src.stop(when + off + 0.18);
        });
        break;
      }
      case 'rimshot': {
        const dur = 0.025 + decay * 0.04;
        const f = 400 + pitch * 600;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square'; osc.frequency.value = f;
        osc.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.6, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur);
        break;
      }
      case 'conga': {
        const baseF = 100 + pitch * 300;
        const dur = 0.08 + decay * 0.35;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseF * 2, when);
        osc.frequency.exponentialRampToValueAtTime(baseF, when + 0.03);
        osc.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.85, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur);
        break;
      }
      case 'ride': {
        const dur = 0.3 + decay * 1.4;
        const cutoff = 4000 + pitch * 5000;
        const src = noise(ctx, dur);
        const hp = ctx.createBiquadFilter();
        const bp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        hp.type = 'highpass'; hp.frequency.value = cutoff;
        bp.type = 'peaking'; bp.frequency.value = 7000 + p.tone * 3000; bp.gain.value = 8;
        src.connect(hp); hp.connect(bp); bp.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.3, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        src.start(when); src.stop(when + dur);
        break;
      }
      case 'tonal': {
        const f = 80 + pitch * 400;
        const dur = 0.3 + decay * 1.2;
        const osc = ctx.createOscillator();
        const filt = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = p.pulse < 0.5 ? 'sine' : 'triangle';
        osc.frequency.value = f;
        filt.type = 'lowpass'; filt.frequency.value = 500 + p.tone * 3000;
        osc.connect(filt); filt.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.7, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur);
        break;
      }
      case 'cowbell': {
        const f1 = 540 + pitch * 300;
        const f2 = f1 * 1.47;
        const dur = 0.1 + decay * 0.8;
        [f1, f2].forEach(freq => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'square'; osc.frequency.value = freq;
          osc.connect(g); connect(g);
          g.gain.setValueAtTime(v * 0.35, when);
          g.gain.exponentialRampToValueAtTime(0.001, when + dur);
          osc.start(when); osc.stop(when + dur);
        });
        break;
      }
      case 'block': {
        const f = 800 + pitch * 800;
        const dur = 0.015 + decay * 0.05;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square'; osc.frequency.value = f;
        osc.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.55, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur);
        break;
      }
      case 'crash': {
        const dur = 0.5 + decay * 2.0;
        const cutoff = 3000 + pitch * 4000;
        const src = noise(ctx, dur);
        const hp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        hp.type = 'highpass'; hp.frequency.value = cutoff;
        src.connect(hp); hp.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.4, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        src.start(when); src.stop(when + dur);
        break;
      }
    }
  }, [applyDrive, noise, panner]);

  const trigger = useCallback((voice: Voice, when: number, vel: number) => {
    const ctx = getCtx();
    synthVoice(ctx, voice.synthType, vel, voice.params, when);
  }, [getCtx, synthVoice]);

  const start = useCallback((
    getState: () => { voices: Voice[]; bpm: number },
    onStep: (s: number) => void,
  ) => {
    const ctx = getCtx();
    isPlayingRef.current = true;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    currentStepRef.current = 0;

    const LOOKAHEAD = 0.1;
    const INTERVAL = 25;
    const hasSolo = (voices: Voice[]) => voices.some(v => v.solo);

    const schedule = () => {
      if (!isPlayingRef.current) return;
      const { voices, bpm } = getState();
      const stepDur = 60 / bpm / 4;
      const solo = hasSolo(voices);

      while (nextNoteTimeRef.current < ctx.currentTime + LOOKAHEAD) {
        const step = currentStepRef.current;
        voices.forEach(v => {
          if (v.muted) return;
          if (solo && !v.solo) return;
          if (v.steps[step] > 0) trigger(v, nextNoteTimeRef.current, v.steps[step]);
        });
        onStep(step);
        nextNoteTimeRef.current += stepDur;
        currentStepRef.current = (step + 1) % STEPS;
      }
      schedulerRef.current = setTimeout(schedule, INTERVAL);
    };
    schedule();
  }, [getCtx, trigger]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    if (schedulerRef.current) clearTimeout(schedulerRef.current);
    currentStepRef.current = 0;
  }, []);

  const preview = useCallback((voice: Voice) => {
    const ctx = getCtx();
    trigger(voice, ctx.currentTime, 1.0);
  }, [getCtx, trigger]);

  return { start, stop, preview };
}
