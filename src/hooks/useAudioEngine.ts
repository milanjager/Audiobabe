import { useRef, useCallback } from 'react';

export type SynthType =
  | 'kick' | 'snare' | 'hat_c' | 'hat_o'
  | 'tom' | 'clap' | 'rimshot' | 'conga'
  | 'ride' | 'tonal' | 'cowbell' | 'block' | 'crash';

export const VOICE_PARAM_LABELS: Record<SynthType, [string, string, string, string, string]> = {
  kick:    ['freq',   'length','shape', 'click', 'tame'],
  snare:   ['body',   'pitch', 'decay', 'crack', 'sizzle'],
  hat_c:   ['tone',   'pitch', 'decay', 'choke', 'metal'],
  hat_o:   ['wash',   'pitch', 'decay', 'ring',  'noise'],
  tom:     ['punch',  'pitch', 'decay', 'slap',  'ring'],
  clap:    ['tone',   'spread','decay', 'noise', 'crisp'],
  rimshot: ['tone',   'pitch', 'decay', 'snap',  'metal'],
  conga:   ['punch',  'pitch', 'decay', 'slap',  'ring'],
  ride:    ['wash',   'pitch', 'decay', 'ping',  'metal'],
  tonal:   ['timbre', 'pitch', 'decay', 'harm',  'wave'],
  cowbell: ['ring',   'tune',  'decay', 'metal', 'drive'],
  block:   ['tone',   'pitch', 'decay', 'click', 'hard'],
  crash:   ['wash',   'pitch', 'decay', 'bright','metal'],
};

export const EFFECTS_LABELS: Record<SynthType, [string, string, string, string, string]> = {
  kick:    ['sub',     'exciter', 'tilt',  'satur', 'reverb'],
  snare:   ['dispers', 'exciter', 'satur', 'comp',  'reverb'],
  hat_c:   ['ring',    'exciter', 'satur', 'comp',  'reverb'],
  hat_o:   ['ring',    'exciter', 'satur', 'comp',  'reverb'],
  tom:     ['exciter', 'tilt',    'satur', 'comp',  'reverb'],
  clap:    ['dispers', 'exciter', 'satur', 'comp',  'reverb'],
  rimshot: ['exciter', 'tilt',    'satur', 'comp',  'reverb'],
  conga:   ['exciter', 'tilt',    'satur', 'comp',  'reverb'],
  ride:    ['wash',    'exciter', 'satur', 'comp',  'reverb'],
  tonal:   ['exciter', 'tilt',    'satur', 'comp',  'reverb'],
  cowbell: ['ring',    'exciter', 'satur', 'comp',  'reverb'],
  block:   ['exciter', 'tilt',    'satur', 'comp',  'reverb'],
  crash:   ['wash',    'exciter', 'satur', 'comp',  'reverb'],
};

export interface SynthParams {
  tone: number;
  pitch: number;
  decay: number;
  slap: number;
  pulse: number;
  drive: number;
  exciter: number;
  satur: number;
  comp: number;
  reverb: number;
  level: number;
  pan: number;
  humanize: number;
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
  steps: number[];
  params: SynthParams;
}

const STEPS = 16;

export function defaultParams(overrides?: Partial<SynthParams>): SynthParams {
  return {
    tone: 0.5, pitch: 0.5, decay: 0.5, slap: 0.5, pulse: 0.5,
    drive: 0, exciter: 0.1, satur: 0.1, comp: 0.25, reverb: 0.05,
    level: 0.85, pan: 0.5, humanize: 0,
    ...overrides,
  };
}

export function defaultVoices(): Voice[] {
  return [
    { id:'kick_a',  label:'kick a',  color:'#f59e0b', synthType:'kick',    col:0, row:0, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.35,decay:0.55}) },
    { id:'tom_l',   label:'tom l',   color:'#22d3ee', synthType:'tom',     col:0, row:1, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.3}) },
    { id:'tonal',   label:'tonal',   color:'#94a3b8', synthType:'tonal',   col:0, row:2, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.7}) },
    { id:'kick_b',  label:'kick b',  color:'#84cc16', synthType:'kick',    col:1, row:0, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.45,tone:0.3}) },
    { id:'tom_h',   label:'tom h',   color:'#a78bfa', synthType:'tom',     col:1, row:1, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.65}) },
    { id:'cowbell', label:'cowbell', color:'#ec4899', synthType:'cowbell', col:1, row:2, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams() },
    { id:'snare_a', label:'snare a', color:'#818cf8', synthType:'snare',   col:2, row:0, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams() },
    { id:'clap',    label:'clap',    color:'#06b6d4', synthType:'clap',    col:2, row:1, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams() },
    { id:'rimshot', label:'rimshot', color:'#64748b', synthType:'rimshot', col:2, row:2, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.2}) },
    { id:'snare_b', label:'snare b', color:'#f97316', synthType:'snare',   col:3, row:0, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({tone:0.7}) },
    { id:'hat_b',   label:'hat b',   color:'#10b981', synthType:'hat_c',   col:3, row:1, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.15}) },
    { id:'block',   label:'block',   color:'#6366f1', synthType:'block',   col:3, row:2, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.1}) },
    { id:'hat_a',   label:'hat a',   color:'#4ade80', synthType:'hat_c',   col:4, row:0, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.7,decay:0.12}) },
    { id:'conga_l', label:'conga l', color:'#818cf8', synthType:'conga',   col:4, row:1, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.4}) },
    { id:'conga_h', label:'conga h', color:'#c084fc', synthType:'conga',   col:4, row:2, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({pitch:0.65}) },
    { id:'hat_op',  label:'hat op',  color:'#14b8a6', synthType:'hat_o',   col:5, row:0, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.6}) },
    { id:'ride',    label:'ride',    color:'#94a3b8', synthType:'ride',    col:5, row:1, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.65}) },
    { id:'crash',   label:'crash',   color:'#f87171', synthType:'crash',   col:5, row:2, muted:false, solo:false, steps:Array(STEPS).fill(0), params:defaultParams({decay:0.85}) },
  ];
}

function humanizeVal(val: number, amount: number): number {
  if (amount === 0) return val;
  return Math.max(0, val * (1 + (Math.random() * 2 - 1) * amount * 0.3));
}

export function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStepRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const reverbRef = useRef<ConvolverNode | null>(null);
  const chokeGroupRef = useRef<Map<string, () => void>>(new Map());

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.gain.value = 0.8;
      masterRef.current.connect(ctxRef.current.destination);
      reverbRef.current = null;
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const getOrCreateReverb = useCallback((ctx: AudioContext): ConvolverNode => {
    if (reverbRef.current) return reverbRef.current;
    const conv = ctx.createConvolver();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 2;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    conv.buffer = impulse;
    reverbRef.current = conv;
    return conv;
  }, []);

  const makeSatCurve = useCallback((k: number): Float32Array<ArrayBuffer> => {
    const curve = new Float32Array(256) as Float32Array<ArrayBuffer>;
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = k > 0 ? Math.tanh(k * x) / Math.tanh(k) : x;
    }
    return curve;
  }, []);

  const makeDriveCurve = useCallback((k: number): Float32Array<ArrayBuffer> => {
    const curve = new Float32Array(256) as Float32Array<ArrayBuffer>;
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = k > 0 ? (Math.PI + k) * x / (Math.PI + k * Math.abs(x)) : x;
    }
    return curve;
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

  const buildEffectsChain = useCallback((
    ctx: AudioContext,
    source: AudioNode,
    p: SynthParams,
    dest: AudioNode,
  ) => {
    let current: AudioNode = source;

    // Saturation
    if (p.satur > 0.02) {
      const ws = ctx.createWaveShaper();
      ws.curve = makeSatCurve(p.satur * 200);
      ws.oversample = '2x';
      current.connect(ws);
      current = ws;
    }

    // Drive
    if (p.drive > 0.02) {
      const ws = ctx.createWaveShaper();
      ws.curve = makeDriveCurve(p.drive * 400);
      ws.oversample = '4x';
      current.connect(ws);
      current = ws;
    }

    // Exciter: split signal, add harmonics via waveshaper+highpass
    if (p.exciter > 0.02) {
      const merger = ctx.createGain();
      current.connect(merger);

      const exWs = ctx.createWaveShaper();
      const exCurve = new Float32Array(256) as Float32Array<ArrayBuffer>;
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        exCurve[i] = x * x * x * p.exciter * 100;
      }
      exWs.curve = exCurve;
      const exHp = ctx.createBiquadFilter();
      exHp.type = 'highpass';
      exHp.frequency.value = 3000;
      const exGain = ctx.createGain();
      exGain.gain.value = p.exciter * 0.4;
      current.connect(exWs);
      exWs.connect(exHp);
      exHp.connect(exGain);
      exGain.connect(merger);
      current = merger;
    }

    // Compressor
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -24 + p.comp * 16;
    comp.ratio.value = 2 + p.comp * 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.08;
    comp.knee.value = 6;
    current.connect(comp);
    current = comp;

    // Reverb wet/dry
    if (p.reverb > 0.02) {
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      dryGain.gain.value = 1 - p.reverb * 0.7;
      wetGain.gain.value = p.reverb * 0.5;
      current.connect(dryGain);
      dryGain.connect(dest);
      const rev = getOrCreateReverb(ctx);
      current.connect(rev);
      rev.connect(wetGain);
      wetGain.connect(dest);
    } else {
      current.connect(dest);
    }
  }, [makeSatCurve, makeDriveCurve, getOrCreateReverb]);

  const synthVoice = useCallback((ctx: AudioContext, type: SynthType, vel: number, p: SynthParams, when: number) => {
    const dest = masterRef.current!;
    const pan = panner(ctx, p.pan);
    pan.connect(dest);

    const v = humanizeVal(vel * p.level, p.humanize);
    const decay = humanizeVal(p.decay, p.humanize);
    const pitch = humanizeVal(p.pitch, p.humanize);

    // Raw signal output node before effects
    const rawOut = ctx.createGain();
    rawOut.gain.value = 1;
    buildEffectsChain(ctx, rawOut, p, pan);

    const connect = (node: AudioNode) => node.connect(rawOut);

    switch (type) {
      case 'kick': {
        const baseF = 30 + pitch * 100;
        const dur = 0.15 + decay * 0.7;
        const clickAmt = p.slap; // click transient sharpness
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseF * (2 + clickAmt * 3), when);
        osc.frequency.exponentialRampToValueAtTime(baseF, when + 0.04 + clickAmt * 0.04);
        osc.connect(g); connect(g);
        g.gain.setValueAtTime(v, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur + 0.05);

        // pulse → adds overtone oscillator
        if (p.pulse > 0.05) {
          const osc2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(baseF * 3, when);
          osc2.frequency.exponentialRampToValueAtTime(baseF * 1.5, when + 0.03);
          osc2.connect(g2); connect(g2);
          g2.gain.setValueAtTime(v * p.pulse * 0.4, when);
          g2.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.4);
          osc2.start(when); osc2.stop(when + dur * 0.4);
        }

        // tone → mid boost
        if (p.tone > 0.1) {
          const src2 = noise(ctx, 0.04);
          const bp = ctx.createBiquadFilter();
          const ng = ctx.createGain();
          bp.type = 'bandpass';
          bp.frequency.value = 100 + p.tone * 600;
          bp.Q.value = 3;
          src2.connect(bp); bp.connect(ng); connect(ng);
          ng.gain.setValueAtTime(v * p.tone * 0.3, when);
          ng.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
          src2.start(when); src2.stop(when + 0.04);
        }
        break;
      }

      case 'snare': {
        const dur = 0.1 + decay * 0.35;
        const toneF = 150 + pitch * 250;
        const noiseMix = 0.3 + p.tone * 0.65; // tone → body (noise level)
        const crackFreq = 1500 + p.slap * 3500; // slap → crack (bandpass freq)

        const osc = ctx.createOscillator();
        const og = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(toneF, when);
        osc.frequency.exponentialRampToValueAtTime(toneF * 0.6, when + dur);
        osc.connect(og); connect(og);
        og.gain.setValueAtTime(v * (1 - noiseMix) * 0.9, when);
        og.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur);

        const src = noise(ctx, dur + 0.02);
        const filt = ctx.createBiquadFilter();
        const ng = ctx.createGain();
        filt.type = 'bandpass';
        filt.frequency.value = crackFreq;
        filt.Q.value = 0.5;
        src.connect(filt); filt.connect(ng); connect(ng);
        ng.gain.setValueAtTime(v * noiseMix, when);
        ng.gain.exponentialRampToValueAtTime(0.001, when + dur);
        src.start(when); src.stop(when + dur + 0.02);

        // pulse → sizzle (rattle oscillator)
        if (p.pulse > 0.1) {
          const rattle = noise(ctx, dur);
          const rbp = ctx.createBiquadFilter();
          const rg = ctx.createGain();
          rbp.type = 'highpass';
          rbp.frequency.value = 6000 + p.pulse * 6000;
          rattle.connect(rbp); rbp.connect(rg); connect(rg);
          rg.gain.setValueAtTime(v * p.pulse * 0.35, when);
          rg.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.7);
          rattle.start(when); rattle.stop(when + dur);
        }
        break;
      }

      case 'hat_c': {
        const dur = 0.02 + decay * 0.1;
        const cutoff = 7000 + pitch * 7000;

        // Choke open hat when closed hat fires
        chokeGroupRef.current.get('hat_open')?.();

        const src = noise(ctx, dur + 0.01);
        const hp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        hp.type = 'highpass'; hp.frequency.value = cutoff;
        src.connect(hp); hp.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.45, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        src.start(when); src.stop(when + dur + 0.01);

        // tone → mid-range character
        if (p.tone > 0.1) {
          const src2 = noise(ctx, dur * 0.5);
          const bp2 = ctx.createBiquadFilter();
          const g2 = ctx.createGain();
          bp2.type = 'bandpass';
          bp2.frequency.value = 4000 + p.tone * 4000;
          bp2.Q.value = 1.5;
          src2.connect(bp2); bp2.connect(g2); connect(g2);
          g2.gain.setValueAtTime(v * p.tone * 0.2, when);
          g2.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.5);
          src2.start(when); src2.stop(when + dur * 0.5);
        }

        // pulse → metallic (oscillator pair)
        if (p.pulse > 0.1) {
          [5657, 8271].forEach(freq => {
            const osc = ctx.createOscillator();
            const og = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            osc.connect(og); connect(og);
            og.gain.setValueAtTime(v * p.pulse * 0.08, when);
            og.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.3);
            osc.start(when); osc.stop(when + dur * 0.3);
          });
        }
        break;
      }

      case 'hat_o': {
        const dur = 0.15 + decay * 1.35;
        const cutoff = 5000 + pitch * 6000;

        // Register stop function for choke
        const stopFns: Array<() => void> = [];
        chokeGroupRef.current.set('hat_open', () => {
          stopFns.forEach(fn => { try { fn(); } catch { /* already stopped */ } });
        });

        const src = noise(ctx, dur + 0.05);
        const hp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        hp.type = 'highpass'; hp.frequency.value = cutoff;
        src.connect(hp); hp.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.4, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        src.start(when);
        src.stop(when + dur + 0.05);
        stopFns.push(() => { src.stop(); g.gain.cancelScheduledValues(ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.01); });

        // pulse → wash/shimmer
        if (p.pulse > 0.1) {
          const src2 = noise(ctx, dur);
          const bp = ctx.createBiquadFilter();
          const g2 = ctx.createGain();
          bp.type = 'bandpass';
          bp.frequency.value = 8000 + p.pulse * 4000;
          bp.Q.value = 0.7;
          src2.connect(bp); bp.connect(g2); connect(g2);
          g2.gain.setValueAtTime(v * p.pulse * 0.2, when);
          g2.gain.exponentialRampToValueAtTime(0.001, when + dur);
          src2.start(when); src2.stop(when + dur);
          stopFns.push(() => { try { src2.stop(); g2.gain.cancelScheduledValues(ctx.currentTime); g2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.01); } catch { /* ignore */ } });
        }
        break;
      }

      case 'tom': {
        const baseF = 60 + pitch * 220;
        const dur = 0.12 + decay * 0.55;
        const res = p.tone * 8; // tone → filter resonance

        const osc = ctx.createOscillator();
        const filt = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseF * (1.5 + p.slap), when);
        osc.frequency.exponentialRampToValueAtTime(baseF, when + 0.04);
        filt.type = 'lowpass';
        filt.frequency.value = baseF * 8;
        filt.Q.value = res;
        osc.connect(filt); filt.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.9, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur);

        // pulse → FM modulation
        if (p.pulse > 0.05) {
          const mod = ctx.createOscillator();
          const modGain = ctx.createGain();
          mod.frequency.value = baseF * 2.1;
          modGain.gain.value = baseF * p.pulse * 0.8;
          mod.connect(modGain);
          modGain.connect(osc.frequency);
          mod.start(when); mod.stop(when + dur * 0.3);
        }
        break;
      }

      case 'clap': {
        const dur = 0.06 + decay * 0.18;
        const freq = 800 + pitch * 1700;
        const layers = Math.floor(1 + p.tone * 2.9); // tone → spread (1-3 layers)

        for (let l = 0; l < layers; l++) {
          const off = l * 0.008;
          const src = noise(ctx, 0.18);
          const filt = ctx.createBiquadFilter();
          const g = ctx.createGain();
          filt.type = 'bandpass'; filt.frequency.value = freq; filt.Q.value = 0.7 + p.slap;
          src.connect(filt); filt.connect(g); connect(g);
          g.gain.setValueAtTime(v * 0.5, when + off);
          g.gain.exponentialRampToValueAtTime(0.001, when + off + dur);
          src.start(when + off); src.stop(when + off + 0.18);
        }

        // pulse → metallic ring
        if (p.pulse > 0.1) {
          const osc = ctx.createOscillator();
          const og = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = 1200 + p.pulse * 1800;
          osc.connect(og); connect(og);
          og.gain.setValueAtTime(v * p.pulse * 0.12, when);
          og.gain.exponentialRampToValueAtTime(0.001, when + 0.03);
          osc.start(when); osc.stop(when + 0.03);
        }
        break;
      }

      case 'rimshot': {
        const dur = 0.025 + decay * 0.045;
        const f = 400 + pitch * 600;
        const noiseMix = p.tone * 0.5;
        const harmRatio = 1.5 + p.slap * 1.5; // slap → harmonic ratio

        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square'; osc.frequency.value = f;
        osc.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.6 * (1 - noiseMix), when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur);

        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.type = 'square'; osc2.frequency.value = f * harmRatio;
        osc2.connect(g2); connect(g2);
        g2.gain.setValueAtTime(v * 0.35 * (1 - noiseMix), when);
        g2.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.6);
        osc2.start(when); osc2.stop(when + dur);

        if (noiseMix > 0.05) {
          const nsrc = noise(ctx, dur);
          const nhp = ctx.createBiquadFilter();
          const ng = ctx.createGain();
          nhp.type = 'highpass'; nhp.frequency.value = 3000;
          nsrc.connect(nhp); nhp.connect(ng); connect(ng);
          ng.gain.setValueAtTime(v * noiseMix, when);
          ng.gain.exponentialRampToValueAtTime(0.001, when + dur);
          nsrc.start(when); nsrc.stop(when + dur);
        }

        // pulse → metallic
        if (p.pulse > 0.1) {
          const msrc = noise(ctx, dur * 0.5);
          const mbp = ctx.createBiquadFilter();
          const mg = ctx.createGain();
          mbp.type = 'bandpass'; mbp.frequency.value = 4000 + p.pulse * 4000; mbp.Q.value = 3;
          msrc.connect(mbp); mbp.connect(mg); connect(mg);
          mg.gain.setValueAtTime(v * p.pulse * 0.2, when);
          mg.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.5);
          msrc.start(when); msrc.stop(when + dur * 0.5);
        }
        break;
      }

      case 'conga': {
        const baseF = 100 + pitch * 300;
        const dur = 0.08 + decay * 0.35;

        const osc = ctx.createOscillator();
        const filt = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseF * (1.8 + p.slap), when);
        osc.frequency.exponentialRampToValueAtTime(baseF, when + 0.03);
        filt.type = 'bandpass';
        filt.frequency.value = baseF * 3;
        filt.Q.value = 1 + p.tone * 4; // tone → body resonance
        osc.connect(filt); filt.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.85, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur);

        // pulse → ring tail
        if (p.pulse > 0.05) {
          const osc2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.value = baseF * 1.7;
          osc2.connect(g2); connect(g2);
          g2.gain.setValueAtTime(v * p.pulse * 0.3, when);
          g2.gain.exponentialRampToValueAtTime(0.001, when + dur * 1.5);
          osc2.start(when); osc2.stop(when + dur * 1.5);
        }
        break;
      }

      case 'ride': {
        const dur = 0.3 + decay * 1.7;
        const cutoff = 3000 + pitch * 6000;

        const src = noise(ctx, dur);
        const hp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        hp.type = 'highpass'; hp.frequency.value = cutoff;
        src.connect(hp); hp.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.3, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        src.start(when); src.stop(when + dur);

        // slap → ping at ~7kHz
        if (p.slap > 0.05) {
          const src2 = noise(ctx, 0.12);
          const bp = ctx.createBiquadFilter();
          const g2 = ctx.createGain();
          bp.type = 'peaking'; bp.frequency.value = 6000 + p.slap * 2000; bp.gain.value = 12;
          src2.connect(bp); bp.connect(g2); connect(g2);
          g2.gain.setValueAtTime(v * p.slap * 0.35, when);
          g2.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
          src2.start(when); src2.stop(when + 0.12);
        }

        // tone → wash character
        const bp2 = ctx.createBiquadFilter();
        bp2.type = 'peaking'; bp2.frequency.value = 7000 + p.tone * 3000; bp2.gain.value = 8;
        src.connect(bp2); bp2.connect(g);

        // pulse → shimmer overtones
        if (p.pulse > 0.1) {
          const src3 = noise(ctx, dur * 0.4);
          const hp3 = ctx.createBiquadFilter();
          const g3 = ctx.createGain();
          hp3.type = 'highpass'; hp3.frequency.value = 10000;
          src3.connect(hp3); hp3.connect(g3); connect(g3);
          g3.gain.setValueAtTime(v * p.pulse * 0.15, when);
          g3.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.4);
          src3.start(when); src3.stop(when + dur * 0.4);
        }
        break;
      }

      case 'tonal': {
        const f = 60 + pitch * 420;
        const dur = 0.3 + decay * 1.2;
        const waveTypes: OscillatorType[] = ['sine', 'triangle', 'sawtooth'];
        const waveIdx = Math.floor(p.pulse * 2.99);

        const osc = ctx.createOscillator();
        const filt = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = waveTypes[waveIdx];
        osc.frequency.value = f;
        filt.type = 'lowpass'; filt.frequency.value = 200 + p.tone * 4000;
        osc.connect(filt); filt.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.7, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur);

        // slap → harmonic
        if (p.slap > 0.05) {
          const osc2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.value = f * (2 + p.slap * 2);
          osc2.connect(g2); connect(g2);
          g2.gain.setValueAtTime(v * p.slap * 0.25, when);
          g2.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.5);
          osc2.start(when); osc2.stop(when + dur * 0.5);
        }
        break;
      }

      case 'cowbell': {
        const f1 = 500 + pitch * 340;
        const detuneRatio = 1.4 + p.pulse * 0.2; // pulse → detune ratio
        const f2 = f1 * detuneRatio;
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

        // slap → metallic rattle
        if (p.slap > 0.1) {
          const src = noise(ctx, 0.04);
          const bp = ctx.createBiquadFilter();
          const g = ctx.createGain();
          bp.type = 'bandpass'; bp.frequency.value = f1 * 2; bp.Q.value = 4;
          src.connect(bp); bp.connect(g); connect(g);
          g.gain.setValueAtTime(v * p.slap * 0.3, when);
          g.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
          src.start(when); src.stop(when + 0.04);
        }

        // tone → decay character (bandpass resonance)
        if (p.tone > 0.1) {
          const osc3 = ctx.createOscillator();
          const g3 = ctx.createGain();
          osc3.type = 'square';
          osc3.frequency.value = f1 * 2.5 + p.tone * 400;
          osc3.connect(g3); connect(g3);
          g3.gain.setValueAtTime(v * p.tone * 0.15, when);
          g3.gain.exponentialRampToValueAtTime(0.001, when + dur * p.tone);
          osc3.start(when); osc3.stop(when + dur);
        }
        break;
      }

      case 'block': {
        const f = 600 + pitch * 1000;
        const dur = 0.01 + decay * 0.05;

        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square'; osc.frequency.value = f;
        osc.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.55, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.start(when); osc.stop(when + dur);

        // tone → mid body
        if (p.tone > 0.1) {
          const src = noise(ctx, dur);
          const bp = ctx.createBiquadFilter();
          const ng = ctx.createGain();
          bp.type = 'bandpass'; bp.frequency.value = f * 0.7; bp.Q.value = 2;
          src.connect(bp); bp.connect(ng); connect(ng);
          ng.gain.setValueAtTime(v * p.tone * 0.25, when);
          ng.gain.exponentialRampToValueAtTime(0.001, when + dur);
          src.start(when); src.stop(when + dur);
        }

        // slap → click transient
        if (p.slap > 0.05) {
          const osc2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          osc2.type = 'square'; osc2.frequency.value = f * 2.5;
          osc2.connect(g2); connect(g2);
          g2.gain.setValueAtTime(v * p.slap * 0.6, when);
          g2.gain.exponentialRampToValueAtTime(0.001, when + 0.004);
          osc2.start(when); osc2.stop(when + 0.004);
        }

        // pulse → ring
        if (p.pulse > 0.05) {
          const osc3 = ctx.createOscillator();
          const g3 = ctx.createGain();
          osc3.type = 'sine'; osc3.frequency.value = f * 1.5;
          osc3.connect(g3); connect(g3);
          g3.gain.setValueAtTime(v * p.pulse * 0.2, when);
          g3.gain.exponentialRampToValueAtTime(0.001, when + dur * 2);
          osc3.start(when); osc3.stop(when + dur * 2);
        }
        break;
      }

      case 'crash': {
        const dur = 0.5 + decay * 2.5;
        const cutoff = 2000 + pitch * 5000;
        const brightness = p.tone * 8000; // tone → brightness

        const src = noise(ctx, dur);
        const hp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        hp.type = 'highpass'; hp.frequency.value = cutoff;
        src.connect(hp); hp.connect(g); connect(g);
        g.gain.setValueAtTime(v * 0.4, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        src.start(when); src.stop(when + dur);

        // slap → initial attack brightness
        if (p.slap > 0.05) {
          const src2 = noise(ctx, 0.08);
          const hp2 = ctx.createBiquadFilter();
          const g2 = ctx.createGain();
          hp2.type = 'highpass'; hp2.frequency.value = cutoff + brightness + p.slap * 3000;
          src2.connect(hp2); hp2.connect(g2); connect(g2);
          g2.gain.setValueAtTime(v * p.slap * 0.5, when);
          g2.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
          src2.start(when); src2.stop(when + 0.08);
        }

        // pulse → metallic shimmer
        if (p.pulse > 0.1) {
          const src3 = noise(ctx, dur * 0.6);
          const bp3 = ctx.createBiquadFilter();
          const g3 = ctx.createGain();
          bp3.type = 'peaking'; bp3.frequency.value = 9000 + p.pulse * 3000; bp3.gain.value = 10;
          src3.connect(bp3); bp3.connect(g3); connect(g3);
          g3.gain.setValueAtTime(v * p.pulse * 0.25, when);
          g3.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.6);
          src3.start(when); src3.stop(when + dur * 0.6);
        }
        break;
      }
    }
  }, [buildEffectsChain, noise, panner]);

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
