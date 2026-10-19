import { useRef, useState, useCallback } from 'react';
import type { SynthType } from './useAudioEngine';

export type E2SynthEngine = 'vco' | 'vco2' | 'vpm' | 'noise' | 'chord';

export interface E2Part {
  id: number;
  name: string;
  mode: 'synth' | 'drum';
  synthEngine: E2SynthEngine;
  drumVoice: SynthType;
  steps: boolean[];
  stepVelocity: number[];
  midiNote: number;
  oscType: number;
  edit1: number;
  edit2: number;
  cutoff: number;
  peak: number;
  modType: number;
  modDepth: number;
  level: number;
  pan: number;
  color: string;
  active: boolean;
}

export interface E2EngineState {
  bpm: number;
  playing: boolean;
  currentStep: number;
  parts: E2Part[];
  selectedPart: number;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function makePart(
  id: number,
  name: string,
  mode: 'synth' | 'drum',
  synthEngine: E2SynthEngine,
  drumVoice: SynthType,
  midiNote: number,
  color: string,
  steps: boolean[],
): E2Part {
  return {
    id, name, mode, synthEngine, drumVoice, midiNote, color,
    steps,
    stepVelocity: Array(16).fill(0.8),
    oscType: 0.5, edit1: 0.5, edit2: 0.3,
    cutoff: 0.6, peak: 0.2, modType: 0.0, modDepth: 0.0,
    level: 0.8, pan: 0.5, active: true,
  };
}

const OFF = Array(16).fill(false) as boolean[];
function steps(...on: number[]): boolean[] {
  const s = Array(16).fill(false);
  for (const i of on) s[i] = true;
  return s;
}

export function defaultE2Parts(): E2Part[] {
  return [
    makePart(0,  'LEAD',    'synth', 'vco',   'kick',    62, '#7c3aed', steps(0,6,12)),
    makePart(1,  'BASS',    'synth', 'vco',   'kick',    38, '#2563eb', steps(0,4,8,12)),
    makePart(2,  'PAD1',    'synth', 'vco2',  'kick',    55, '#0891b2', steps(0,8)),
    makePart(3,  'PAD2',    'synth', 'chord', 'kick',    57, '#0d9488', OFF.slice()),
    makePart(4,  'KICK',    'drum',  'vco',   'kick',    36, '#dc2626', steps(0,4,8,12)),
    makePart(5,  'SNARE',   'drum',  'vco',   'snare',   38, '#ea580c', steps(4,12)),
    makePart(6,  'HAT C',   'drum',  'noise', 'hat_c',   42, '#d97706', steps(0,2,4,6,8,10,12,14)),
    makePart(7,  'HAT O',   'drum',  'noise', 'hat_o',   46, '#ca8a04', steps(7,15)),
    makePart(8,  'TOM',     'drum',  'vco',   'tom',     45, '#65a30d', steps(6,13)),
    makePart(9,  'CLAP',    'drum',  'noise', 'clap',    39, '#16a34a', steps(4,12,15)),
    makePart(10, 'RIMSHOT', 'drum',  'vco',   'rimshot', 37, '#0891b2', OFF.slice()),
    makePart(11, 'CRASH',   'drum',  'noise', 'crash',   49, '#6d28d9', steps(15)),
    makePart(12, 'SYNTH 5', 'synth', 'vpm',   'kick',    64, '#9333ea', OFF.slice()),
    makePart(13, 'SYNTH 6', 'synth', 'vco2',  'kick',    60, '#7c3aed', OFF.slice()),
    makePart(14, 'SYNTH 7', 'synth', 'noise', 'kick',    60, '#6d28d9', OFF.slice()),
    makePart(15, 'SYNTH 8', 'synth', 'chord', 'kick',    52, '#4c1d95', OFF.slice()),
  ];
}

function synthVoice(
  ctx: AudioContext,
  part: E2Part,
  velocity: number,
  master: GainNode,
  when: number,
) {
  const freq = midiToFreq(part.midiNote);
  const cutoffHz = 100 + part.cutoff * 8000;
  const q = 1 + part.peak * 18;
  const vol = part.level * velocity;

  const outGain = ctx.createGain();
  outGain.gain.value = vol;
  const panner = ctx.createStereoPanner();
  panner.pan.value = (part.pan - 0.5) * 2;
  outGain.connect(panner);
  panner.connect(master);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoffHz;
  filter.Q.value = q;
  filter.connect(outGain);

  switch (part.synthEngine) {
    case 'vco': {
      const freqMult = 0.5 + part.edit1 * 0.5;
      const decay = 0.08 + part.edit2 * 0.4;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq * freqMult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(1, when + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, when + decay);
      osc.connect(g); g.connect(filter);
      osc.start(when); osc.stop(when + decay + 0.05);
      break;
    }
    case 'vco2': {
      const decay = 0.1 + part.edit2 * 0.5;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth'; osc1.frequency.value = freq;
      osc2.type = 'sawtooth'; osc2.frequency.value = freq * (1 + part.edit1 * 0.05);
      const subGain = ctx.createGain();
      subGain.gain.value = part.edit2 * 0.6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.8, when + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, when + decay);
      osc1.connect(g); osc2.connect(subGain); subGain.connect(g);
      g.connect(filter);
      osc1.start(when); osc1.stop(when + decay + 0.05);
      osc2.start(when); osc2.stop(when + decay + 0.05);
      break;
    }
    case 'vpm': {
      const decay = 0.08 + part.edit1 * 0.4;
      const ratio = 1 + part.edit1 * 7;
      const modFreq = freq * ratio;
      const modDepth = part.edit2 * freq * 3;
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      carrier.type = 'sine'; carrier.frequency.value = freq;
      modulator.type = 'sine'; modulator.frequency.value = modFreq;
      modGain.gain.value = modDepth;
      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.7, when + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, when + decay);
      carrier.connect(g); g.connect(filter);
      modulator.start(when); modulator.stop(when + decay + 0.05);
      carrier.start(when); carrier.stop(when + decay + 0.05);
      break;
    }
    case 'noise': {
      const decay = 0.05 + part.edit1 * 0.3;
      const bufLen = Math.ceil(ctx.sampleRate * (decay + 0.1));
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 200 + part.cutoff * 4000;
      bp.Q.value = 1 + part.peak * 15;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.8, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + decay);
      src.connect(bp); bp.connect(g); g.connect(outGain);
      src.start(when); src.stop(when + decay + 0.05);
      return; // already connected to outGain, skip filter path
    }
    case 'chord': {
      const decay = 0.2 + part.edit2 * 0.5;
      const inv = Math.floor(part.edit1 * 3); // 0, 1, or 2
      const rootOct = inv === 0 ? 0 : inv === 1 ? 12 : 24;
      const thirdOct = inv === 1 ? -12 : 0;
      const fifthOct = inv === 2 ? -12 : 0;
      const semis = [rootOct, 4 + thirdOct, 7 + fifthOct];
      const detune = part.edit2 * 8;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq * Math.pow(2, semis[i] / 12);
        osc.detune.value = (i - 1) * detune;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(0.35, when + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, when + decay);
        osc.connect(g); g.connect(filter);
        osc.start(when); osc.stop(when + decay + 0.05);
      }
      break;
    }
  }
}

export function useElectribeEngine() {
  const [state, setState] = useState<E2EngineState>({
    bpm: 128,
    playing: false,
    currentStep: 0,
    parts: defaultE2Parts(),
    selectedPart: 4,
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const currentStepRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = 0.75;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const firePart = useCallback((part: E2Part, velocity: number, when: number) => {
    if (!part.active) return;
    if (part.mode === 'drum') {
      window.dispatchEvent(new CustomEvent('audiobabe:drum', {
        detail: { drumVoice: part.drumVoice, velocity },
      }));
    } else {
      window.dispatchEvent(new CustomEvent('audiobabe:note', {
        detail: { midiNote: part.midiNote, velocity, duration: 0.15 },
      }));
      const ctx = getCtx();
      if (masterRef.current) {
        synthVoice(ctx, part, velocity, masterRef.current, when);
      }
    }
  }, [getCtx]);

  const start = useCallback(() => {
    const ctx = getCtx();
    isPlayingRef.current = true;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    currentStepRef.current = 0;

    const LOOKAHEAD = 0.1;
    const INTERVAL = 25;

    const schedule = () => {
      if (!isPlayingRef.current) return;
      const { bpm, parts } = stateRef.current;
      const stepDur = 60 / bpm / 4;
      const now = ctx.currentTime;

      while (nextNoteTimeRef.current < now + LOOKAHEAD) {
        const step = currentStepRef.current;
        const when = nextNoteTimeRef.current;
        for (const part of parts) {
          if (part.active && part.steps[step]) {
            firePart(part, part.stepVelocity[step], when);
          }
        }
        setState(prev => ({ ...prev, currentStep: step }));
        nextNoteTimeRef.current += stepDur;
        currentStepRef.current = (step + 1) % 16;
      }
      schedulerRef.current = setTimeout(schedule, INTERVAL);
    };

    setState(prev => ({ ...prev, playing: true, currentStep: 0 }));
    schedule();
  }, [getCtx, firePart]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    if (schedulerRef.current) clearTimeout(schedulerRef.current);
    currentStepRef.current = 0;
    setState(prev => ({ ...prev, playing: false, currentStep: 0 }));
  }, []);

  const triggerPad = useCallback((partId: number) => {
    const ctx = getCtx();
    const part = stateRef.current.parts[partId];
    if (!part) return;
    firePart(part, 0.9, ctx.currentTime);
  }, [getCtx, firePart]);

  const updatePart = useCallback((partId: number, changes: Partial<E2Part>) => {
    setState(prev => ({
      ...prev,
      parts: prev.parts.map(p => p.id === partId ? { ...p, ...changes } : p),
    }));
  }, []);

  const updateBpm = useCallback((bpm: number) => {
    setState(prev => ({ ...prev, bpm }));
  }, []);

  return { state, setState, start, stop, triggerPad, updatePart, updateBpm };
}
