import { useRef, useCallback } from 'react';

export type TrackId = 'kick' | 'snare' | 'clap' | 'hhc' | 'hho' | 'tom' | 'ride' | 'perc';

export interface VoiceParams {
  tune: number;   // 0–1
  decay: number;  // 0–1
  tone: number;   // 0–1
  level: number;  // 0–1
}

export interface Track {
  id: TrackId;
  label: string;
  steps: number[]; // 0=off, >0=velocity (0.4/0.7/1.0)
  params: VoiceParams;
  color: string;
  muted: boolean;
}

const STEPS = 16;

function defaultParams(): VoiceParams {
  return { tune: 0.5, decay: 0.5, tone: 0.5, level: 0.8 };
}

export function defaultTracks(): Track[] {
  return [
    { id: 'kick',  label: 'KICK',   steps: Array(STEPS).fill(0), params: defaultParams(), color: '#4a6cf7', muted: false },
    { id: 'snare', label: 'SNARE',  steps: Array(STEPS).fill(0), params: defaultParams(), color: '#a78bfa', muted: false },
    { id: 'clap',  label: 'CLAP',   steps: Array(STEPS).fill(0), params: defaultParams(), color: '#e63946', muted: false },
    { id: 'hhc',   label: 'HH CL',  steps: Array(STEPS).fill(0), params: defaultParams(), color: '#00b4d8', muted: false },
    { id: 'hho',   label: 'HH OP',  steps: Array(STEPS).fill(0), params: defaultParams(), color: '#06d6a0', muted: false },
    { id: 'tom',   label: 'TOM',    steps: Array(STEPS).fill(0), params: defaultParams(), color: '#fbbf24', muted: false },
    { id: 'ride',  label: 'RIDE',   steps: Array(STEPS).fill(0), params: defaultParams(), color: '#f97316', muted: false },
    { id: 'perc',  label: 'PERC',   steps: Array(STEPS).fill(0), params: defaultParams(), color: '#ec4899', muted: false },
  ];
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
      masterRef.current.gain.value = 0.85;
      masterRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const triggerKick = useCallback((ctx: AudioContext, when: number, vel: number, p: VoiceParams) => {
    const baseFreq = 40 + p.tune * 120;         // 40–160 Hz
    const decayTime = 0.2 + p.decay * 0.6;      // 0.2–0.8s
    const distAmt = 100 + p.tone * 600;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const dist = ctx.createWaveShaper();

    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = (Math.PI + distAmt) * x / (Math.PI + distAmt * Math.abs(x));
    }
    dist.curve = curve;

    osc.connect(gain); gain.connect(dist); dist.connect(masterRef.current!);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 3.5, when);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, when + 0.06);

    gain.gain.setValueAtTime(vel * p.level, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + decayTime);

    osc.start(when); osc.stop(when + decayTime);
  }, []);

  const triggerSnare = useCallback((ctx: AudioContext, when: number, vel: number, p: VoiceParams) => {
    const toneFreq = 150 + p.tune * 200;        // 150–350 Hz
    const decayTime = 0.1 + p.decay * 0.3;      // 0.1–0.4s
    const noiseMix = 0.3 + p.tone * 0.7;        // noise amount

    // Tonal body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(toneFreq, when);
    osc.frequency.exponentialRampToValueAtTime(toneFreq * 0.5, when + decayTime);
    osc.connect(oscGain); oscGain.connect(masterRef.current!);
    oscGain.gain.setValueAtTime(vel * p.level * (1 - noiseMix) * 0.8, when);
    oscGain.gain.exponentialRampToValueAtTime(0.001, when + decayTime);
    osc.start(when); osc.stop(when + decayTime);

    // Noise snare rattle
    const bufSize = Math.floor(ctx.sampleRate * decayTime);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();

    src.buffer = buf;
    filter.type = 'bandpass';
    filter.frequency.value = 2000 + p.tone * 3000;
    filter.Q.value = 0.5;

    src.connect(filter); filter.connect(noiseGain); noiseGain.connect(masterRef.current!);
    noiseGain.gain.setValueAtTime(vel * p.level * noiseMix, when);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, when + decayTime);
    src.start(when); src.stop(when + decayTime);
  }, []);

  const triggerClap = useCallback((ctx: AudioContext, when: number, vel: number, p: VoiceParams) => {
    const decayTime = 0.08 + p.decay * 0.2;
    const freq = 800 + p.tune * 1500;

    [0, 0.008, 0.016].forEach(offset => {
      const bufSize = Math.floor(ctx.sampleRate * 0.2);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      src.buffer = buf;
      filter.type = 'bandpass';
      filter.frequency.value = freq + p.tone * 500;
      filter.Q.value = 0.8;

      src.connect(filter); filter.connect(gain); gain.connect(masterRef.current!);
      gain.gain.setValueAtTime(vel * p.level * 0.5, when + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, when + offset + decayTime);
      src.start(when + offset); src.stop(when + offset + 0.2);
    });
  }, []);

  const triggerHihat = useCallback((ctx: AudioContext, when: number, vel: number, open: boolean, p: VoiceParams) => {
    const decayTime = open ? 0.15 + p.decay * 0.5 : 0.03 + p.decay * 0.08;
    const cutoff = open ? 5000 + p.tune * 4000 : 7000 + p.tune * 5000;
    const bufSize = Math.floor(ctx.sampleRate * (decayTime + 0.05));
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    const bp = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    src.buffer = buf;
    hp.type = 'highpass'; hp.frequency.value = cutoff;
    bp.type = 'bandpass'; bp.frequency.value = cutoff + p.tone * 3000; bp.Q.value = 0.3;

    src.connect(hp); hp.connect(bp); bp.connect(gain); gain.connect(masterRef.current!);
    gain.gain.setValueAtTime(vel * p.level * 0.5, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + decayTime);
    src.start(when); src.stop(when + decayTime + 0.05);
  }, []);

  const triggerTom = useCallback((ctx: AudioContext, when: number, vel: number, p: VoiceParams) => {
    const baseFreq = 60 + p.tune * 200;
    const decayTime = 0.15 + p.decay * 0.5;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 2, when);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, when + 0.05);

    filter.type = 'lowpass';
    filter.frequency.value = 500 + p.tone * 2000;

    osc.connect(filter); filter.connect(gain); gain.connect(masterRef.current!);
    gain.gain.setValueAtTime(vel * p.level * 0.9, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + decayTime);
    osc.start(when); osc.stop(when + decayTime);
  }, []);

  const triggerRide = useCallback((ctx: AudioContext, when: number, vel: number, p: VoiceParams) => {
    const decayTime = 0.3 + p.decay * 1.2;
    const cutoff = 4000 + p.tune * 5000;
    const bufSize = Math.floor(ctx.sampleRate * decayTime);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    const bp = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    src.buffer = buf;
    hp.type = 'highpass'; hp.frequency.value = cutoff;
    bp.type = 'peaking'; bp.frequency.value = 6000 + p.tone * 4000; bp.gain.value = 6;

    src.connect(hp); hp.connect(bp); bp.connect(gain); gain.connect(masterRef.current!);
    gain.gain.setValueAtTime(vel * p.level * 0.35, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + decayTime);
    src.start(when); src.stop(when + decayTime);
  }, []);

  const triggerPerc = useCallback((ctx: AudioContext, when: number, vel: number, p: VoiceParams) => {
    const baseFreq = 200 + p.tune * 600;
    const decayTime = 0.05 + p.decay * 0.25;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = p.tone < 0.33 ? 'triangle' : p.tone < 0.66 ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq * 1.5, when);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, when + decayTime * 0.3);

    osc.connect(gain); gain.connect(masterRef.current!);
    gain.gain.setValueAtTime(vel * p.level * 0.6, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + decayTime);
    osc.start(when); osc.stop(when + decayTime);
  }, []);

  const trigger = useCallback((id: TrackId, when: number, vel: number, params: VoiceParams) => {
    const ctx = getCtx();
    switch (id) {
      case 'kick':  triggerKick(ctx, when, vel, params); break;
      case 'snare': triggerSnare(ctx, when, vel, params); break;
      case 'clap':  triggerClap(ctx, when, vel, params); break;
      case 'hhc':   triggerHihat(ctx, when, vel, false, params); break;
      case 'hho':   triggerHihat(ctx, when, vel, true, params); break;
      case 'tom':   triggerTom(ctx, when, vel, params); break;
      case 'ride':  triggerRide(ctx, when, vel, params); break;
      case 'perc':  triggerPerc(ctx, when, vel, params); break;
    }
  }, [getCtx, triggerKick, triggerSnare, triggerClap, triggerHihat, triggerTom, triggerRide, triggerPerc]);

  const start = useCallback((getTracksAndBpm: () => { tracks: Track[]; bpm: number }, onStep: (s: number) => void) => {
    const ctx = getCtx();
    isPlayingRef.current = true;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    currentStepRef.current = 0;

    const LOOKAHEAD = 0.1;
    const INTERVAL = 25;

    const schedule = () => {
      if (!isPlayingRef.current) return;
      const { tracks, bpm } = getTracksAndBpm();
      const stepDur = 60 / bpm / 4;

      while (nextNoteTimeRef.current < ctx.currentTime + LOOKAHEAD) {
        const step = currentStepRef.current;
        tracks.forEach(t => {
          if (!t.muted && t.steps[step] > 0) {
            trigger(t.id, nextNoteTimeRef.current, t.steps[step], t.params);
          }
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

  const preview = useCallback((id: TrackId, params: VoiceParams) => {
    const ctx = getCtx();
    trigger(id, ctx.currentTime, 1.0, params);
  }, [getCtx, trigger]);

  return { start, stop, preview };
}
