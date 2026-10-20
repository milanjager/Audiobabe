import { useRef, useState, useCallback } from 'react';
import type { SynthType } from './useAudioEngine';

// Real Korg Electribe 2 OSC types (1-16 are analog)
export const OSC_TYPES = [
  'SAW', 'PULSE', 'TRIANGLE', 'SINE',
  'UNI-SAW', 'UNI-SQU', 'UNI-TRI', 'UNI-SINE',
  'SYNC-SAW', 'SYNC-SQU', 'SYNC-TRI', 'SYNC-SINE',
  'HPF NOISE', 'LPF NOISE', 'LOFI NOISE', 'REZ NOISE',
] as const;

export const MOD_TYPES = [
  'EG+ Filter', 'EG+ Pitch', 'EG+ OSC', 'EG+ Level', 'EG+ Pan', 'EG+ IFX',
  'EG+ BPM Filter', 'EG+ BPM Pitch', 'EG+ BPM OSC', 'EG+ BPM Level', 'EG+ BPM Pan', 'EG+ BPM IFX',
  'EG- Filter', 'EG- Pitch', 'EG- OSC', 'EG- Level', 'EG- Pan', 'EG- IFX',
  'EG- BPM Filter', 'EG- BPM Pitch', 'EG- BPM OSC', 'EG- BPM Level', 'EG- BPM Pan', 'EG- BPM IFX',
  'LFOTri Filter', 'LFOTri Pitch', 'LFOTri OSC', 'LFOTri Level', 'LFOTri Pan', 'LFOTri IFX',
  'LFOTriB Filter', 'LFOTriB Pitch', 'LFOTriB OSC', 'LFOTriB Level', 'LFOTriB Pan', 'LFOTriB IFX',
  'SawUpB Filter', 'SawUpB Pitch', 'SawUpB OSC', 'SawUpB Level', 'SawUpB Pan', 'SawUpB IFX',
  'SawDwnB Filter', 'SawDwnB Pitch', 'SawDwnB OSC', 'SawDwnB Level', 'SawDwnB Pan', 'SawDwnB IFX',
  'SquUpB Filter', 'SquUpB Pitch', 'SquUpB OSC', 'SquUpB Level', 'SquUpB Pan', 'SquUpB IFX',
  'SquDwnB Filter', 'SquDwnB Pitch', 'SquDwnB OSC', 'SquDwnB Level', 'SquDwnB Pan', 'SquDwnB IFX',
  'S&HBPM Filter', 'S&HBPM Pitch', 'S&HBPM OSC', 'S&HBPM Level', 'S&HBPM Pan', 'S&HBPM IFX',
  'Random Filter', 'Random Pitch', 'Random OSC', 'Random Level', 'Random Pan', 'Random IFX',
] as const;

export const IFX_TYPES = [
  'Punch', 'Overdrive', 'Distortion', 'Decimator', 'Bit Crusher', 'Ring Modulator',
  'Sustainer', 'Limiter', 'Low EQ', 'Mid EQ', 'High EQ', 'Radio EQ',
  'Exciter', 'Low Pass Filter', 'High Pass Filter', 'Band Plus Filter', 'Talk Filter',
  'Delay 1/4', 'Delay 3/16', 'Delay 1/8', 'Delay 1/16', 'Roller 1/32',
  'One Delay', 'Short Delay', 'Ring Delay 1', 'Ring Delay 2',
] as const;

export interface E2Part {
  id: number;
  name: string;
  mode: 'synth' | 'drum';
  drumVoice: SynthType;
  steps: boolean[];
  stepVelocity: number[];
  midiNote: number;
  color: string;
  active: boolean;
  // OSC section
  oscTypeIndex: number;  // 0-15 → OSC_TYPES
  pitch: number;         // 0-1 (0.5=center, no pitch shift)
  oscEdit: number;       // 0-1, timbre/detune/sync depth
  // Filter section
  cutoff: number;        // 0-1
  resonance: number;     // 0-1
  egInt: number;         // 0-1 (0.5 = no envelope mod)
  filterType: 0 | 1 | 2; // 0=LPF, 1=HPF, 2=BPF
  // Modulation section
  modType: number;       // 0-71 → MOD_TYPES index
  modDepth: number;      // 0-1
  modSpeed: number;      // 0-1
  // Amp/EG section
  level: number;         // 0-1
  pan: number;           // 0-1 (0.5=center)
  attack: number;        // 0-1
  decay: number;         // 0-1
  mfxSend: boolean;
  ampEg: boolean;
  // Insert FX section
  ifxType: number;       // 0-25 → IFX_TYPES index
  ifxEdit: number;       // 0-1
  ifxOn: boolean;
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
  id: number, name: string, mode: 'synth' | 'drum',
  drumVoice: SynthType, midiNote: number, color: string,
  steps: boolean[], oscTypeIndex: number,
): E2Part {
  return {
    id, name, mode, drumVoice, midiNote, color, steps,
    stepVelocity: Array(16).fill(0.8),
    oscTypeIndex, pitch: 0.5, oscEdit: 0.5,
    cutoff: 0.65, resonance: 0.15, egInt: 0.5,
    filterType: 0,
    modType: 0, modDepth: 0.0, modSpeed: 0.4,
    level: 0.8, pan: 0.5, attack: 0.02, decay: 0.35,
    mfxSend: false, ampEg: true,
    ifxType: 0, ifxEdit: 0.5, ifxOn: false,
    active: true,
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
    makePart(0,  'LEAD',    'synth', 'kick',    62, '#7c3aed', steps(0,6,12),    0),  // SAW
    makePart(1,  'BASS',    'synth', 'kick',    38, '#2563eb', steps(0,4,8,12),  0),  // SAW
    makePart(2,  'PAD 1',   'synth', 'kick',    55, '#0891b2', steps(0,8),       4),  // UNI-SAW
    makePart(3,  'PAD 2',   'synth', 'kick',    57, '#0d9488', OFF.slice(),      7),  // UNI-SINE
    makePart(4,  'KICK',    'drum',  'kick',    36, '#dc2626', steps(0,4,8,12),  13), // LPF NOISE
    makePart(5,  'SNARE',   'drum',  'snare',   38, '#ea580c', steps(4,12),      12), // HPF NOISE
    makePart(6,  'HAT C',   'drum',  'hat_c',   42, '#d97706', steps(0,2,4,6,8,10,12,14), 14),
    makePart(7,  'HAT O',   'drum',  'hat_o',   46, '#ca8a04', steps(7,15),      12),
    makePart(8,  'TOM',     'drum',  'tom',     45, '#65a30d', steps(6,13),      13),
    makePart(9,  'CLAP',    'drum',  'clap',    39, '#16a34a', steps(4,12,15),   12),
    makePart(10, 'RIMSHOT', 'drum',  'rimshot', 37, '#0891b2', OFF.slice(),      1),  // PULSE
    makePart(11, 'CRASH',   'drum',  'crash',   49, '#6d28d9', steps(15),        15), // REZ NOISE
    makePart(12, 'SYNTH 5', 'synth', 'kick',    64, '#9333ea', OFF.slice(),      8),  // SYNC-SAW
    makePart(13, 'SYNTH 6', 'synth', 'kick',    60, '#7c3aed', OFF.slice(),      2),  // TRIANGLE
    makePart(14, 'SYNTH 7', 'synth', 'kick',    60, '#6d28d9', OFF.slice(),      3),  // SINE
    makePart(15, 'SYNTH 8', 'synth', 'kick',    52, '#4c1d95', OFF.slice(),      6),  // UNI-TRI
  ];
}

const WAVEFORM_MAP: OscillatorType[] = [
  'sawtooth', 'square', 'triangle', 'sine', // 0-3
  'sawtooth', 'square', 'triangle', 'sine', // 4-7 UNI (handled specially)
  'sawtooth', 'square', 'triangle', 'sine', // 8-11 SYNC (approximate)
];

function buildOscBank(
  ctx: AudioContext, type: number, freq: number, edit: number,
  when: number, decay: number,
): AudioNode {
  const merge = ctx.createChannelMerger(2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(0.8, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, when + decay);

  if (type >= 4 && type <= 7) {
    // UNI — 3 detuned voices
    const detune = edit * 20;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.type = WAVEFORM_MAP[type];
      osc.frequency.value = freq;
      osc.detune.value = (i - 1) * detune;
      osc.connect(g); osc.start(when); osc.stop(when + decay + 0.1);
    }
  } else if (type >= 8 && type <= 11) {
    // SYNC — carrier + sync modulation approximation
    const carrier = ctx.createOscillator();
    const modOsc = ctx.createOscillator();
    const modGain = ctx.createGain();
    carrier.type = WAVEFORM_MAP[type];
    carrier.frequency.value = freq;
    modOsc.type = 'sawtooth';
    modOsc.frequency.value = freq * (1 + edit * 4);
    modGain.gain.value = freq * edit * 0.5;
    modOsc.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(g); modOsc.connect(g);
    carrier.start(when); carrier.stop(when + decay + 0.1);
    modOsc.start(when); modOsc.stop(when + decay + 0.1);
  } else if (type >= 12) {
    // NOISE variants
    const bufLen = Math.ceil(ctx.sampleRate * (decay + 0.15));
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    if (type === 12)      { flt.type = 'highpass'; flt.frequency.value = 500 + edit * 4000; }
    else if (type === 13) { flt.type = 'lowpass';  flt.frequency.value = 200 + edit * 3000; }
    else if (type === 14) {
      // LOFI: waveshaper decimation approximation
      flt.type = 'lowpass'; flt.frequency.value = 1000 + edit * 2000;
    } else {
      // REZ NOISE
      flt.type = 'bandpass'; flt.frequency.value = 200 + edit * 5000; flt.Q.value = 5 + edit * 15;
    }
    flt.Q.value = 1 + edit * 8;
    src.connect(flt); flt.connect(g);
    src.start(when); src.stop(when + decay + 0.15);
    return g;
  } else {
    // Basic SAW / PULSE / TRIANGLE / SINE
    const osc = ctx.createOscillator();
    osc.type = WAVEFORM_MAP[type];
    osc.frequency.value = freq;
    osc.connect(g); osc.start(when); osc.stop(when + decay + 0.1);
  }
  return g;
}

function synthVoice(
  ctx: AudioContext, part: E2Part, velocity: number,
  master: GainNode, when: number,
) {
  const pitchSemis = (part.pitch - 0.5) * 24;
  const freq = midiToFreq(part.midiNote) * Math.pow(2, pitchSemis / 12);
  const decay = 0.08 + part.decay * 0.8;
  const attack = part.attack * 0.1;

  const filterTypes: BiquadFilterType[] = ['lowpass', 'highpass', 'bandpass'];
  const cutoffHz = 80 + part.cutoff * 9000;
  const q = 1 + part.resonance * 20;

  const outGain = ctx.createGain();
  outGain.gain.value = part.level * velocity;

  const panner = ctx.createStereoPanner();
  panner.pan.value = (part.pan - 0.5) * 2;
  outGain.connect(panner); panner.connect(master);

  const filter = ctx.createBiquadFilter();
  filter.type = filterTypes[part.filterType];
  filter.frequency.value = cutoffHz;
  filter.Q.value = q;
  filter.connect(outGain);

  // EG on filter if egInt ≠ 0.5
  const egAmount = (part.egInt - 0.5) * 2; // -1..+1
  if (Math.abs(egAmount) > 0.05) {
    const modHz = cutoffHz * Math.pow(2, egAmount * 3);
    filter.frequency.setValueAtTime(modHz, when);
    filter.frequency.exponentialRampToValueAtTime(cutoffHz, when + decay);
  }

  // Amp EG
  const ampGain = ctx.createGain();
  ampGain.gain.setValueAtTime(0, when);
  if (attack > 0.005) ampGain.gain.linearRampToValueAtTime(1, when + attack);
  else ampGain.gain.setValueAtTime(1, when);
  ampGain.gain.exponentialRampToValueAtTime(0.001, when + attack + decay);
  ampGain.connect(filter);

  const srcNode = buildOscBank(ctx, part.oscTypeIndex, freq, part.oscEdit, when, attack + decay);
  srcNode.connect(ampGain);
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
      master.gain.value = 0.7;
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
