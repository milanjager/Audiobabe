import { useRef, useCallback } from 'react';

export type TrackId = 'kick' | 'bass' | 'clap' | 'hihatC' | 'hihatO' | 'perc';

export interface Track {
  id: TrackId;
  label: string;
  steps: boolean[];
  volume: number;
  color: string;
}

const STEPS = 16;

export function defaultTracks(): Track[] {
  return [
    { id: 'kick',   label: 'KICK',    steps: Array(STEPS).fill(false), volume: 0.9, color: '#4a6cf7' },
    { id: 'bass',   label: 'SUB',     steps: Array(STEPS).fill(false), volume: 0.7, color: '#9b59b6' },
    { id: 'clap',   label: 'CLAP',    steps: Array(STEPS).fill(false), volume: 0.75, color: '#e63946' },
    { id: 'hihatC', label: 'HH CL',   steps: Array(STEPS).fill(false), volume: 0.5, color: '#00b4d8' },
    { id: 'hihatO', label: 'HH OP',   steps: Array(STEPS).fill(false), volume: 0.4, color: '#06d6a0' },
    { id: 'perc',   label: 'PERC',    steps: Array(STEPS).fill(false), volume: 0.55, color: '#ff6b00' },
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

  const triggerKick = useCallback((ctx: AudioContext, when: number, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const dist = ctx.createWaveShaper();

    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = (Math.PI + 400) * x / (Math.PI + 400 * Math.abs(x));
    }
    dist.curve = curve;

    osc.connect(gain); gain.connect(dist); dist.connect(masterRef.current!);

    osc.frequency.setValueAtTime(160, when);
    osc.frequency.exponentialRampToValueAtTime(40, when + 0.06);
    osc.type = 'sine';

    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.45);

    osc.start(when);
    osc.stop(when + 0.45);
  }, []);

  const triggerSub = useCallback((ctx: AudioContext, when: number, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter); filter.connect(gain); gain.connect(masterRef.current!);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, when);
    osc.frequency.exponentialRampToValueAtTime(35, when + 0.25);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, when);
    filter.frequency.exponentialRampToValueAtTime(80, when + 0.3);

    gain.gain.setValueAtTime(vol * 0.8, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.35);

    osc.start(when);
    osc.stop(when + 0.35);
  }, []);

  const triggerClap = useCallback((ctx: AudioContext, when: number, vol: number) => {
    [0, 0.01, 0.02].forEach(offset => {
      const bufSize = ctx.sampleRate * 0.15;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);

      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      src.buffer = buf;
      filter.type = 'bandpass';
      filter.frequency.value = 1200 + offset * 500;
      filter.Q.value = 0.7;

      src.connect(filter); filter.connect(gain); gain.connect(masterRef.current!);

      gain.gain.setValueAtTime(vol * 0.6, when + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, when + offset + 0.12);

      src.start(when + offset);
      src.stop(when + offset + 0.15);
    });
  }, []);

  const triggerHihat = useCallback((ctx: AudioContext, when: number, vol: number, open: boolean) => {
    const duration = open ? 0.3 : 0.06;
    const bufSize = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    src.buffer = buf;
    filter.type = 'highpass';
    filter.frequency.value = open ? 7000 : 9000;

    src.connect(filter); filter.connect(gain); gain.connect(masterRef.current!);

    gain.gain.setValueAtTime(vol * 0.5, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);

    src.start(when);
    src.stop(when + duration);
  }, []);

  const triggerPerc = useCallback((ctx: AudioContext, when: number, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain); gain.connect(masterRef.current!);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, when);
    osc.frequency.exponentialRampToValueAtTime(80, when + 0.08);

    gain.gain.setValueAtTime(vol * 0.7, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.1);

    osc.start(when);
    osc.stop(when + 0.1);
  }, []);

  const trigger = useCallback((id: TrackId, when: number, vol: number) => {
    const ctx = getCtx();
    switch (id) {
      case 'kick':   triggerKick(ctx, when, vol); break;
      case 'bass':   triggerSub(ctx, when, vol); break;
      case 'clap':   triggerClap(ctx, when, vol); break;
      case 'hihatC': triggerHihat(ctx, when, vol, false); break;
      case 'hihatO': triggerHihat(ctx, when, vol, true); break;
      case 'perc':   triggerPerc(ctx, when, vol); break;
    }
  }, [getCtx, triggerKick, triggerSub, triggerClap, triggerHihat, triggerPerc]);

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
          if (t.steps[step]) trigger(t.id, nextNoteTimeRef.current, t.volume);
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

  const preview = useCallback((id: TrackId, vol: number) => {
    const ctx = getCtx();
    trigger(id, ctx.currentTime, vol);
  }, [getCtx, trigger]);

  return { start, stop, preview };
}
