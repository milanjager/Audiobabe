import { useRef, useCallback } from 'react';

export interface KorgParams {
  masterVol: number;
  // VCO 1 — wave + shape only (no octave/pitch on Monologue VCO1)
  vco1Wave: 'saw' | 'tri' | 'sq';
  vco1Shape: number;       // 0–1
  // VCO 2 — octave, pitch, wave (saw/tri/noise), sync/ring, shape
  vco2Octave: 0 | 1 | 2 | 3;   // 0=16' 1=8' 2=4' 3=2'
  vco2Pitch: number;       // -1 to +1 (±1 octave fine tune)
  vco2Wave: 'saw' | 'tri' | 'noise';
  vco2Mode: 'off' | 'sync' | 'ring';
  vco2Shape: number;       // 0–1
  // Mixer
  vco1Level: number;       // 0–1
  vco2Level: number;       // 0–1
  // Filter
  filterCutoff: number;    // 0–1 → 20–20000Hz
  filterRes: number;       // 0–1 → Q 0–25
  filterKeytrack: number;  // 0–1
  // Drive (post-filter)
  drive: number;           // 0–1
  // EG (2-stage/3-stage — Attack + Decay only)
  egType: 'ad' | 'agd' | 'gate'; // A/D | A/G/D | Gate
  egAttack: number;        // 0–1 (0.001–8s)
  egDecay: number;         // 0–1 (0.001–8s)
  egInt: number;           // 0–1 (depth, 0–1 maps to 0–+5000Hz or ±2 oct pitch)
  egTarget: 'pitch' | 'pitch2' | 'cutoff';
  // LFO
  lfoWave: 'saw' | 'tri' | 'sq';
  lfoMode: 'fast' | 'slow' | 'oneshot';
  lfoRate: number;         // 0–1
  lfoInt: number;          // 0–1
  lfoTarget: 'pitch' | 'shape' | 'cutoff';
  // Delay (bonus — Monologue has no delay, but added for richness)
  delayTime: number;
  delayFeedback: number;
  delayMix: number;
}

export function defaultKorgParams(): KorgParams {
  return {
    masterVol: 0.75,
    vco1Wave: 'saw', vco1Shape: 0.1,
    vco2Octave: 1, vco2Pitch: 0.07, vco2Wave: 'saw', vco2Mode: 'off', vco2Shape: 0.5,
    vco1Level: 0.75, vco2Level: 0.4,
    filterCutoff: 0.5, filterRes: 0.25, filterKeytrack: 0.5,
    drive: 0.15,
    egType: 'agd', egAttack: 0.04, egDecay: 0.4, egInt: 0.55, egTarget: 'cutoff',
    lfoWave: 'tri', lfoMode: 'slow', lfoRate: 0.25, lfoInt: 0.15, lfoTarget: 'cutoff',
    delayTime: 0.35, delayFeedback: 0.35, delayMix: 0.18,
  };
}

// Octave map for VCO2: 0=16'=0.5x, 1=8'=1x, 2=4'=2x, 3=2'=4x
const VCO2_OCT_MULT = [0.5, 1, 2, 4];

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function filterCutoffHz(norm: number): number {
  return 20 * Math.pow(1000, norm);
}

function egTimeSec(v: number): number {
  return 0.001 + v * v * 8;
}

function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

interface ActiveNote {
  osc1: OscillatorNode;
  osc2: OscillatorNode | AudioBufferSourceNode;
  ringMod?: GainNode;
  osc1Gain: GainNode;
  osc2Gain: GainNode;
  ampGain: GainNode;
  filter: BiquadFilterNode;
  filterEgGain: GainNode;
  baseFreq: number;
}

export function useKorgEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);

  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainPitchRef = useRef<GainNode | null>(null);
  const lfoGainCutoffRef = useRef<GainNode | null>(null);

  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayFbRef = useRef<GainNode | null>(null);
  const delayMixRef = useRef<GainNode | null>(null);
  const delayInputRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);

  const activeNotesRef = useRef<Map<number, ActiveNote>>(new Map());
  const paramsRef = useRef<KorgParams>(defaultKorgParams());

  const setupGraph = useCallback((ctx: AudioContext) => {
    noiseBufferRef.current = makeNoiseBuffer(ctx);
    const p = paramsRef.current;

    const master = ctx.createGain();
    master.gain.value = p.masterVol;
    master.connect(ctx.destination);
    masterRef.current = master;

    // Delay
    const delayInput = ctx.createGain();
    const delayNode = ctx.createDelay(2);
    const delayFb = ctx.createGain();
    const delayMix = ctx.createGain();
    const dryGain = ctx.createGain();
    delayNode.delayTime.value = 0.05 + p.delayTime * 0.95;
    delayFb.gain.value = p.delayFeedback * 0.85;
    delayMix.gain.value = p.delayMix;
    dryGain.gain.value = 1 - p.delayMix * 0.5;
    delayInput.connect(delayNode);
    delayNode.connect(delayFb);
    delayFb.connect(delayNode);
    delayNode.connect(delayMix);
    delayMix.connect(master);
    delayInput.connect(dryGain);
    dryGain.connect(master);
    delayInputRef.current = delayInput;
    delayNodeRef.current = delayNode;
    delayFbRef.current = delayFb;
    delayMixRef.current = delayMix;
    dryGainRef.current = dryGain;

    // LFO
    const lfo = ctx.createOscillator();
    const lfoGainPitch = ctx.createGain();
    const lfoGainCutoff = ctx.createGain();
    lfo.type = p.lfoWave === 'sq' ? 'square' : p.lfoWave === 'saw' ? 'sawtooth' : 'triangle';
    const rateMult = p.lfoMode === 'fast' ? 5 : p.lfoMode === 'slow' ? 0.2 : 1;
    lfo.frequency.value = (0.1 + p.lfoRate * 19.9) * rateMult;
    lfoGainPitch.gain.value = p.lfoTarget === 'pitch' ? p.lfoInt * 100 : 0;
    lfoGainCutoff.gain.value = p.lfoTarget === 'cutoff' ? p.lfoInt * 2000 : 0;
    lfo.connect(lfoGainPitch);
    lfo.connect(lfoGainCutoff);
    lfo.start();
    lfoRef.current = lfo;
    lfoGainPitchRef.current = lfoGainPitch;
    lfoGainCutoffRef.current = lfoGainCutoff;
  }, []);

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      setupGraph(ctx);
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [setupGraph]);

  const noteOn = useCallback((midiNote: number) => {
    const ctx = getCtx();
    const p = paramsRef.current;
    const now = ctx.currentTime;
    const existing = activeNotesRef.current.get(midiNote);
    if (existing) {
      try { existing.ampGain.gain.cancelScheduledValues(now); existing.ampGain.gain.setValueAtTime(0, now); } catch {}
    }

    const baseFreq = midiToFreq(midiNote);
    const vco1Freq = baseFreq;
    const vco2FreqRaw = baseFreq * VCO2_OCT_MULT[p.vco2Octave] * Math.pow(2, p.vco2Pitch);
    const vco2Freq = p.vco2Mode === 'sync' ? vco1Freq : vco2FreqRaw;

    // VCO 1
    const osc1 = ctx.createOscillator();
    osc1.type = p.vco1Wave === 'saw' ? 'sawtooth' : p.vco1Wave === 'tri' ? 'triangle' : 'square';
    osc1.frequency.value = vco1Freq;

    // VCO 2
    let osc2: OscillatorNode | AudioBufferSourceNode;
    if (p.vco2Wave === 'noise') {
      const ns = ctx.createBufferSource();
      ns.buffer = noiseBufferRef.current!;
      ns.loop = true;
      osc2 = ns;
    } else {
      const o = ctx.createOscillator();
      o.type = p.vco2Wave === 'saw' ? 'sawtooth' : 'triangle';
      o.frequency.value = vco2Freq;
      osc2 = o;
    }

    const osc1Gain = ctx.createGain();
    const osc2Gain = ctx.createGain();
    osc1Gain.gain.value = p.vco1Level;
    osc2Gain.gain.value = p.vco2Level;

    // Drive waveshaper (post-mixer, pre-filter)
    const driveWs = ctx.createWaveShaper();
    const k = p.drive * 400;
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = k > 0 ? ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x)) : x;
    }
    driveWs.curve = curve;

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoffBase = filterCutoffHz(p.filterCutoff) + (p.filterKeytrack * baseFreq * 2);
    filter.frequency.value = Math.min(20000, cutoffBase);
    filter.Q.value = p.filterRes * 25;

    const filterEgGain = ctx.createGain();

    // Amp
    const ampGain = ctx.createGain();
    ampGain.gain.value = 0;

    // Route: osc1+osc2 → gains → drive → filter (+ filterEG) → amp → delay
    if (p.vco2Mode === 'ring' && osc2 instanceof OscillatorNode) {
      // Ring mod: multiply osc1 * osc2 via a gain node
      const ringGain = ctx.createGain();
      ringGain.gain.value = 0;
      osc1Gain.connect(ringGain.gain); // amplitude modulation
      osc2.connect(ringGain);
      ringGain.connect(driveWs);
      osc1Gain.connect(driveWs); // dry osc1 mix
    } else {
      osc1.connect(osc1Gain);
      osc2.connect(osc2Gain);
      osc1Gain.connect(driveWs);
      osc2Gain.connect(driveWs);
    }

    driveWs.connect(filter);
    filterEgGain.connect(filter.frequency);
    filter.connect(ampGain);
    ampGain.connect(delayInputRef.current!);

    // LFO routing for this note's filter
    if (lfoGainCutoffRef.current) lfoGainCutoffRef.current.connect(filter.frequency);
    if (lfoGainPitchRef.current && osc2 instanceof OscillatorNode) lfoGainPitchRef.current.connect(osc2.frequency);

    // EG
    const attack = egTimeSec(p.egAttack);
    const decay = egTimeSec(p.egDecay);
    const egIntHz = p.egTarget === 'cutoff' ? p.egInt * 5000 : 0;
    const egIntPitch = p.egTarget !== 'cutoff' ? p.egInt * 2 : 0; // octaves up for pitch

    ampGain.gain.setValueAtTime(0, now);
    filterEgGain.gain.setValueAtTime(0, now);

    if (p.egType === 'gate') {
      // Gate: instant on, decay on release
      ampGain.gain.setValueAtTime(0.8, now);
      filterEgGain.gain.setValueAtTime(egIntHz, now);
    } else if (p.egType === 'ad') {
      // A/D: attack then immediate decay
      ampGain.gain.linearRampToValueAtTime(0.8, now + attack);
      ampGain.gain.linearRampToValueAtTime(0.0001, now + attack + decay);
      filterEgGain.gain.linearRampToValueAtTime(egIntHz, now + attack);
      filterEgGain.gain.linearRampToValueAtTime(0, now + attack + decay);
    } else {
      // A/G/D: attack, hold (gate), decay on release
      ampGain.gain.linearRampToValueAtTime(0.8, now + attack);
      filterEgGain.gain.linearRampToValueAtTime(egIntHz, now + attack);
    }

    // Pitch EG
    if (egIntPitch > 0 && osc1 instanceof OscillatorNode) {
      osc1.frequency.setValueAtTime(vco1Freq * Math.pow(2, egIntPitch), now);
      osc1.frequency.exponentialRampToValueAtTime(vco1Freq, now + attack + 0.02);
    }

    osc1.start(now);
    osc2.start(now);

    activeNotesRef.current.set(midiNote, {
      osc1, osc2, osc1Gain, osc2Gain, ampGain, filter, filterEgGain, baseFreq,
    });
  }, [getCtx]);

  const noteOff = useCallback((midiNote: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const note = activeNotesRef.current.get(midiNote);
    if (!note) return;
    const now = ctx.currentTime;
    const p = paramsRef.current;

    if (p.egType === 'agd') {
      const decay = egTimeSec(p.egDecay);
      note.ampGain.gain.cancelScheduledValues(now);
      note.ampGain.gain.setValueAtTime(note.ampGain.gain.value, now);
      note.ampGain.gain.linearRampToValueAtTime(0.0001, now + decay);
      note.filterEgGain.gain.cancelScheduledValues(now);
      note.filterEgGain.gain.setValueAtTime(note.filterEgGain.gain.value, now);
      note.filterEgGain.gain.linearRampToValueAtTime(0, now + decay);
      const stopAt = now + decay + 0.05;
      try { note.osc1.stop(stopAt); } catch {}
      try { note.osc2.stop(stopAt); } catch {}
    } else if (p.egType === 'gate') {
      const release = 0.05;
      note.ampGain.gain.cancelScheduledValues(now);
      note.ampGain.gain.setValueAtTime(0.8, now);
      note.ampGain.gain.linearRampToValueAtTime(0.0001, now + release);
      const stopAt = now + release + 0.05;
      try { note.osc1.stop(stopAt); } catch {}
      try { note.osc2.stop(stopAt); } catch {}
    } else {
      // AD: already auto-decaying, just schedule stop
      const decay = egTimeSec(p.egDecay);
      const stopAt = now + decay + 0.1;
      try { note.osc1.stop(stopAt); } catch {}
      try { note.osc2.stop(stopAt); } catch {}
    }

    activeNotesRef.current.delete(midiNote);
  }, []);

  const updateParams = useCallback((partial: Partial<KorgParams>) => {
    paramsRef.current = { ...paramsRef.current, ...partial };
    const p = paramsRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;

    if (masterRef.current && partial.masterVol !== undefined)
      masterRef.current.gain.setValueAtTime(p.masterVol, now);

    if (delayNodeRef.current && partial.delayTime !== undefined)
      delayNodeRef.current.delayTime.setValueAtTime(0.05 + p.delayTime * 0.95, now);
    if (delayFbRef.current && partial.delayFeedback !== undefined)
      delayFbRef.current.gain.setValueAtTime(p.delayFeedback * 0.85, now);
    if (delayMixRef.current && partial.delayMix !== undefined) {
      delayMixRef.current.gain.setValueAtTime(p.delayMix, now);
      dryGainRef.current?.gain.setValueAtTime(1 - p.delayMix * 0.5, now);
    }

    if (lfoRef.current) {
      if (partial.lfoRate !== undefined || partial.lfoMode !== undefined) {
        const rateMult = p.lfoMode === 'fast' ? 5 : p.lfoMode === 'slow' ? 0.2 : 1;
        lfoRef.current.frequency.setValueAtTime((0.1 + p.lfoRate * 19.9) * rateMult, now);
      }
      if (partial.lfoWave !== undefined)
        lfoRef.current.type = p.lfoWave === 'sq' ? 'square' : p.lfoWave === 'saw' ? 'sawtooth' : 'triangle';
    }
    if (lfoGainPitchRef.current && (partial.lfoInt !== undefined || partial.lfoTarget !== undefined))
      lfoGainPitchRef.current.gain.setValueAtTime(p.lfoTarget === 'pitch' ? p.lfoInt * 100 : 0, now);
    if (lfoGainCutoffRef.current && (partial.lfoInt !== undefined || partial.lfoTarget !== undefined))
      lfoGainCutoffRef.current.gain.setValueAtTime(p.lfoTarget === 'cutoff' ? p.lfoInt * 2000 : 0, now);

    activeNotesRef.current.forEach(note => {
      if (partial.filterCutoff !== undefined || partial.filterRes !== undefined || partial.filterKeytrack !== undefined) {
        const cutoffBase = filterCutoffHz(p.filterCutoff) + (p.filterKeytrack * note.baseFreq * 2);
        note.filter.frequency.setValueAtTime(Math.min(20000, cutoffBase), now);
        note.filter.Q.setValueAtTime(p.filterRes * 25, now);
      }
      if (partial.vco1Level !== undefined) note.osc1Gain.gain.setValueAtTime(p.vco1Level, now);
      if (partial.vco2Level !== undefined) note.osc2Gain.gain.setValueAtTime(p.vco2Level, now);
    });
  }, []);

  return { noteOn, noteOff, updateParams };
}
