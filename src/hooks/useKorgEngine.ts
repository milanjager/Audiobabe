import { useRef, useCallback } from 'react';

export interface KorgParams {
  masterVol: number;
  vco1Wave: 'saw' | 'tri' | 'sq' | 'noise';
  vco1Octave: number;
  vco1Pitch: number;
  vco1Shape: number;
  vco1Level: number;
  vco2Wave: 'saw' | 'tri' | 'sq' | 'noise';
  vco2Octave: number;
  vco2Pitch: number;
  vco2Shape: number;
  vco2Level: number;
  vco2Sync: boolean;
  filterCutoff: number;
  filterRes: number;
  filterEgInt: number;
  filterKeytrack: number;
  filterDrive: number;
  egAttack: number;
  egDecay: number;
  egSustain: number;
  egRelease: number;
  lfoWave: 'saw' | 'tri' | 'sq' | 'sh';
  lfoRate: number;
  lfoInt: number;
  lfoTarget: 'pitch' | 'cutoff' | 'shape';
  delayTime: number;
  delayFeedback: number;
  delayHipass: number;
  delayMix: number;
}

export function defaultKorgParams(): KorgParams {
  return {
    masterVol: 0.75,
    vco1Wave: 'saw', vco1Octave: 0, vco1Pitch: 0, vco1Shape: 0.1, vco1Level: 0.75,
    vco2Wave: 'sq', vco2Octave: -1, vco2Pitch: 0.14, vco2Shape: 0.5, vco2Level: 0.4, vco2Sync: false,
    filterCutoff: 0.45, filterRes: 0.3, filterEgInt: 0.6, filterKeytrack: 0.5, filterDrive: 0.15,
    egAttack: 0.05, egDecay: 0.35, egSustain: 0.6, egRelease: 0.3,
    lfoWave: 'tri', lfoRate: 0.2, lfoInt: 0.15, lfoTarget: 'cutoff',
    delayTime: 0.35, delayFeedback: 0.4, delayHipass: 0.2, delayMix: 0.2,
  };
}

type WaveType = 'saw' | 'tri' | 'sq' | 'noise';

interface ActiveNote {
  osc1: OscillatorNode | AudioBufferSourceNode;
  osc2: OscillatorNode | AudioBufferSourceNode;
  osc1Gain: GainNode;
  osc2Gain: GainNode;
  ampGain: GainNode;
  filter: BiquadFilterNode;
  filterEgGain: GainNode;
  midiNote: number;
  baseFreq: number;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function octaveMultiplier(oct: number): number {
  return Math.pow(2, oct);
}

function pitchOffset(pitch: number): number {
  return Math.pow(2, (pitch * 7) / 12);
}

function filterCutoffHz(normalized: number): number {
  return 20 * Math.pow(1000, normalized);
}

function egTime(v: number, max: number): number {
  return 0.001 + v * v * max;
}

function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function createOscNode(
  ctx: AudioContext,
  wave: WaveType,
  freq: number,
  noiseBuffer: AudioBuffer,
): OscillatorNode | AudioBufferSourceNode {
  if (wave === 'noise') {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    return src;
  }
  const osc = ctx.createOscillator();
  osc.type = wave === 'saw' ? 'sawtooth' : wave === 'tri' ? 'triangle' : 'square';
  osc.frequency.value = freq;
  return osc;
}

export function useKorgEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);

  // Delay chain
  const dryGainRef = useRef<GainNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayFbRef = useRef<GainNode | null>(null);
  const delayHpRef = useRef<BiquadFilterNode | null>(null);
  const delayMixRef = useRef<GainNode | null>(null);
  const delayInputRef = useRef<GainNode | null>(null);

  // LFO
  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);

  const activeNotesRef = useRef<Map<number, ActiveNote>>(new Map());
  const paramsRef = useRef<KorgParams>(defaultKorgParams());

  const setupAudioGraph = useCallback((ctx: AudioContext) => {
    const master = ctx.createGain();
    master.gain.value = paramsRef.current.masterVol;
    master.connect(ctx.destination);
    masterRef.current = master;

    noiseBufferRef.current = makeNoiseBuffer(ctx);

    // Delay chain: delayInput → delayNode → delayHp → delayFb → delayNode (loop)
    //                                                 → delayMix → master
    const delayInput = ctx.createGain();
    const delayNode = ctx.createDelay(2.0);
    const delayHp = ctx.createBiquadFilter();
    const delayFb = ctx.createGain();
    const delayMix = ctx.createGain();
    const dryGain = ctx.createGain();

    const p = paramsRef.current;
    delayNode.delayTime.value = 0.05 + p.delayTime * 0.95;
    delayHp.type = 'highpass';
    delayHp.frequency.value = 50 + p.delayHipass * 4950;
    delayFb.gain.value = p.delayFeedback * 0.9;
    delayMix.gain.value = p.delayMix;
    dryGain.gain.value = 1 - p.delayMix * 0.5;

    delayInput.connect(delayNode);
    delayNode.connect(delayHp);
    delayHp.connect(delayFb);
    delayFb.connect(delayNode);
    delayHp.connect(delayMix);
    delayMix.connect(master);
    delayInput.connect(dryGain);
    dryGain.connect(master);

    delayInputRef.current = delayInput;
    delayNodeRef.current = delayNode;
    delayHpRef.current = delayHp;
    delayFbRef.current = delayFb;
    delayMixRef.current = delayMix;
    dryGainRef.current = dryGain;

    // LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = p.lfoWave === 'sq' ? 'square' : p.lfoWave === 'saw' ? 'sawtooth' : 'triangle';
    lfo.frequency.value = 0.1 + p.lfoRate * 29.9;
    lfoGain.gain.value = p.lfoInt * (p.lfoTarget === 'pitch' ? 100 : p.lfoTarget === 'cutoff' ? 2000 : 0);
    lfo.connect(lfoGain);
    lfo.start();
    lfoRef.current = lfo;
    lfoGainRef.current = lfoGain;
  }, []);

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      setupAudioGraph(ctx);
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [setupAudioGraph]);

  const noteOn = useCallback((midiNote: number) => {
    const ctx = getCtx();
    const p = paramsRef.current;
    const now = ctx.currentTime;

    // Kill existing note if retriggered
    const existing = activeNotesRef.current.get(midiNote);
    if (existing) {
      try { existing.ampGain.gain.cancelScheduledValues(now); existing.ampGain.gain.setValueAtTime(0, now); } catch {}
    }

    const baseFreq = midiToFreq(midiNote);

    const vco1Freq = baseFreq * octaveMultiplier(p.vco1Octave) * pitchOffset(p.vco1Pitch);
    const vco2Freq = p.vco2Sync ? vco1Freq : baseFreq * octaveMultiplier(p.vco2Octave) * pitchOffset(p.vco2Pitch);

    const osc1 = createOscNode(ctx, p.vco1Wave, vco1Freq, noiseBufferRef.current!);
    const osc2 = createOscNode(ctx, p.vco2Wave, vco2Freq, noiseBufferRef.current!);

    const osc1Gain = ctx.createGain();
    const osc2Gain = ctx.createGain();
    osc1Gain.gain.value = p.vco1Level;
    osc2Gain.gain.value = p.vco2Level;

    const driveWs = ctx.createWaveShaper();
    const driveAmount = p.filterDrive * 400;
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = driveAmount > 0 ? ((Math.PI + driveAmount) * x) / (Math.PI + driveAmount * Math.abs(x)) : x;
    }
    driveWs.curve = curve;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoffBase = filterCutoffHz(p.filterCutoff) + (p.filterKeytrack * baseFreq * 0.5);
    filter.frequency.value = cutoffBase;
    filter.Q.value = p.filterRes * 25;

    const filterEgGain = ctx.createGain();

    const ampGain = ctx.createGain();
    ampGain.gain.value = 0;

    // Connect: osc → gain → drive → filter → amp → delay
    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc1Gain.connect(driveWs);
    osc2Gain.connect(driveWs);
    driveWs.connect(filter);

    // Filter EG modulation
    filterEgGain.connect(filter.frequency);
    const egIntHz = (p.filterEgInt * 2 - 1) * 5000;

    filter.connect(ampGain);
    ampGain.connect(delayInputRef.current!);

    // LFO routing
    const lfoGain = lfoGainRef.current;
    if (lfoGain) {
      if (p.lfoTarget === 'pitch') {
        if (osc1 instanceof OscillatorNode) lfoGain.connect(osc1.frequency);
        if (osc2 instanceof OscillatorNode) lfoGain.connect(osc2.frequency);
      } else if (p.lfoTarget === 'cutoff') {
        lfoGain.connect(filter.frequency);
      }
    }

    // ADSR - Amp
    const attack = egTime(p.egAttack, 5);
    const decay = egTime(p.egDecay, 5);
    const sustain = p.egSustain;

    ampGain.gain.setValueAtTime(0, now);
    ampGain.gain.linearRampToValueAtTime(0.8, now + attack);
    ampGain.gain.linearRampToValueAtTime(sustain * 0.8, now + attack + decay);

    // ADSR - Filter EG
    filterEgGain.gain.setValueAtTime(0, now);
    filterEgGain.gain.linearRampToValueAtTime(egIntHz, now + attack);
    filterEgGain.gain.linearRampToValueAtTime(egIntHz * sustain, now + attack + decay);

    osc1.start(now);
    osc2.start(now);

    activeNotesRef.current.set(midiNote, {
      osc1, osc2, osc1Gain, osc2Gain, ampGain, filter, filterEgGain, midiNote, baseFreq,
    });
  }, [getCtx]);

  const noteOff = useCallback((midiNote: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const note = activeNotesRef.current.get(midiNote);
    if (!note) return;
    const now = ctx.currentTime;
    const p = paramsRef.current;
    const release = egTime(p.egRelease, 8);

    note.ampGain.gain.cancelScheduledValues(now);
    note.ampGain.gain.setValueAtTime(note.ampGain.gain.value, now);
    note.ampGain.gain.linearRampToValueAtTime(0.0001, now + release);

    note.filterEgGain.gain.cancelScheduledValues(now);
    note.filterEgGain.gain.setValueAtTime(note.filterEgGain.gain.value, now);
    note.filterEgGain.gain.linearRampToValueAtTime(0, now + release);

    const stopTime = now + release + 0.05;
    try { note.osc1.stop(stopTime); } catch {}
    try { note.osc2.stop(stopTime); } catch {}

    activeNotesRef.current.delete(midiNote);
  }, []);

  const updateParams = useCallback((partial: Partial<KorgParams>) => {
    paramsRef.current = { ...paramsRef.current, ...partial };
    const p = paramsRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;

    if (masterRef.current && partial.masterVol !== undefined) {
      masterRef.current.gain.setValueAtTime(partial.masterVol, now);
    }

    if (delayNodeRef.current && partial.delayTime !== undefined) {
      delayNodeRef.current.delayTime.setValueAtTime(0.05 + p.delayTime * 0.95, now);
    }
    if (delayFbRef.current && partial.delayFeedback !== undefined) {
      delayFbRef.current.gain.setValueAtTime(p.delayFeedback * 0.9, now);
    }
    if (delayHpRef.current && partial.delayHipass !== undefined) {
      delayHpRef.current.frequency.setValueAtTime(50 + p.delayHipass * 4950, now);
    }
    if (delayMixRef.current && partial.delayMix !== undefined) {
      delayMixRef.current.gain.setValueAtTime(p.delayMix, now);
    }
    if (dryGainRef.current && partial.delayMix !== undefined) {
      dryGainRef.current.gain.setValueAtTime(1 - p.delayMix * 0.5, now);
    }

    if (lfoRef.current) {
      if (partial.lfoRate !== undefined) {
        lfoRef.current.frequency.setValueAtTime(0.1 + p.lfoRate * 29.9, now);
      }
      if (partial.lfoWave !== undefined) {
        lfoRef.current.type = p.lfoWave === 'sq' ? 'square' : p.lfoWave === 'saw' ? 'sawtooth' : 'triangle';
      }
    }
    if (lfoGainRef.current && (partial.lfoInt !== undefined || partial.lfoTarget !== undefined)) {
      lfoGainRef.current.gain.setValueAtTime(
        p.lfoInt * (p.lfoTarget === 'pitch' ? 100 : p.lfoTarget === 'cutoff' ? 2000 : 0),
        now,
      );
    }

    // Update active notes
    activeNotesRef.current.forEach(note => {
      if (partial.filterCutoff !== undefined || partial.filterRes !== undefined || partial.filterKeytrack !== undefined) {
        const cutoffBase = filterCutoffHz(p.filterCutoff) + (p.filterKeytrack * note.baseFreq * 0.5);
        note.filter.frequency.setValueAtTime(cutoffBase, now);
        note.filter.Q.setValueAtTime(p.filterRes * 25, now);
      }
      if (partial.vco1Level !== undefined) note.osc1Gain.gain.setValueAtTime(p.vco1Level, now);
      if (partial.vco2Level !== undefined) note.osc2Gain.gain.setValueAtTime(p.vco2Level, now);
    });
  }, []);

  return { noteOn, noteOff, updateParams };
}
