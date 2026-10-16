import { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Square, Volume2, ChevronRight } from 'lucide-react';
import { useAudioEngine, defaultTracks } from '../hooks/useAudioEngine';
import type { Track } from '../hooks/useAudioEngine';

const PRESETS: Record<string, { name: string; patterns: boolean[][] }> = {
  basic: {
    name: 'Basic Tekno',
    patterns: [
      [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
      [false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, false],
      [false, false, false, true, false, false, false, false, false, false, false, true, false, false, false, false],
    ],
  },
  hard: {
    name: 'Hard Tekno',
    patterns: [
      [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      [true, false, false, false, false, false, true, false, false, false, false, false, true, false, false, false],
      [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, true],
      [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
      [false, true, false, false, false, true, false, true, false, false, false, true, false, true, false, false],
    ],
  },
  industrial: {
    name: 'Industrial',
    patterns: [
      [true, false, false, true, false, false, true, false, true, false, false, true, false, false, true, false],
      [false, false, true, false, false, false, false, true, false, false, true, false, false, false, false, false],
      [false, false, false, false, true, false, false, true, false, false, false, false, true, false, false, true],
      [true, true, false, true, true, true, false, true, true, true, false, true, true, true, false, true],
      [false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false],
      [true, false, false, false, true, false, true, false, false, true, false, false, true, false, true, false],
    ],
  },
};

export default function Creator() {
  const [tracks, setTracks] = useState<Track[]>(defaultTracks);
  const [bpm, setBpm] = useState(145);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const engine = useAudioEngine();
  const tracksRef = useRef(tracks);
  const bpmRef = useRef(bpm);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  const toggleStep = useCallback((trackIdx: number, stepIdx: number) => {
    setTracks(prev => prev.map((t, i) =>
      i === trackIdx
        ? { ...t, steps: t.steps.map((s, j) => j === stepIdx ? !s : s) }
        : t
    ));
  }, []);

  const setVolume = useCallback((trackIdx: number, vol: number) => {
    setTracks(prev => prev.map((t, i) => i === trackIdx ? { ...t, volume: vol } : t));
  }, []);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
      setCurrentStep(-1);
    } else {
      setIsPlaying(true);
      engine.start(
        () => ({ tracks: tracksRef.current, bpm: bpmRef.current }),
        (step) => setCurrentStep(step),
      );
    }
  }, [isPlaying, engine]);

  const loadPreset = useCallback((key: string) => {
    const preset = PRESETS[key];
    if (!preset) return;
    setTracks(prev => prev.map((t, i) => ({ ...t, steps: preset.patterns[i] ?? t.steps })));
  }, []);

  const clearAll = useCallback(() => {
    setTracks(prev => prev.map(t => ({ ...t, steps: Array(16).fill(false) })));
  }, []);

  const handlePreview = useCallback((trackIdx: number) => {
    const t = tracksRef.current[trackIdx];
    engine.preview(t.id, t.volume);
  }, [engine]);

  return (
    <section id="studio" className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <span className="text-xs font-bold tracking-widest mb-2 block" style={{ color: '#4a6cf7' }}>STUDIO</span>
            <h2 className="text-3xl font-black text-white">Beat Machine</h2>
            <p className="mt-1 text-sm" style={{ color: '#666' }}>Create tekno patterns in your browser</p>
          </div>

          {/* Presets + Clear */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => loadPreset(key)}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                {p.name}
              </button>
            ))}
            <button onClick={clearAll} className="px-3 py-1.5 text-xs rounded-lg transition-colors hover:text-white" style={{ color: '#666' }}>
              Clear
            </button>
          </div>
        </div>

        {/* Sequencer */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          {/* Step numbers */}
          <div className="flex items-center px-4 pt-4 pb-1" style={{ gap: 4 }}>
            <div style={{ width: 88 }} />
            <div style={{ width: 28 }} />
            {Array.from({ length: 16 }, (_, i) => (
              <div
                key={i}
                className="flex-1 text-center text-xs font-mono"
                style={{ color: i % 4 === 0 ? '#666' : '#333', minWidth: 0 }}
              >
                {i % 4 === 0 ? i + 1 : '·'}
              </div>
            ))}
            <div style={{ width: 72 }} />
          </div>

          {/* Tracks */}
          <div className="px-4 pb-4 space-y-1">
            {tracks.map((track, ti) => (
              <div key={track.id} className="flex items-center" style={{ gap: 4 }}>
                {/* Label */}
                <button
                  className="text-xs font-bold text-left flex-shrink-0 rounded px-1 py-1 transition-colors hover:opacity-80"
                  style={{ width: 88, color: track.color }}
                  onClick={() => handlePreview(ti)}
                  title={`Preview ${track.label}`}
                >
                  {track.label}
                </button>

                {/* Drag handle placeholder keeps alignment */}
                <div style={{ width: 28 }} />

                {/* Steps */}
                {track.steps.map((active, si) => {
                  const isCurrent = isPlaying && si === currentStep;
                  const isGroup = si % 4 === 0;
                  return (
                    <button
                      key={si}
                      onClick={() => toggleStep(ti, si)}
                      className="flex-1 rounded transition-all"
                      style={{
                        height: 32,
                        minWidth: 0,
                        background: active
                          ? isCurrent ? track.color : track.color + 'cc'
                          : isCurrent ? '#333' : isGroup ? '#252525' : '#1e1e1e',
                        border: `1px solid ${active ? 'transparent' : isGroup ? '#2a2a2a' : '#222'}`,
                        transform: active && isCurrent ? 'scale(1.08)' : 'scale(1)',
                        boxShadow: active && isCurrent ? `0 0 8px ${track.color}88` : 'none',
                      }}
                    />
                  );
                })}

                {/* Volume */}
                <div className="flex items-center gap-1.5 flex-shrink-0" style={{ width: 72 }}>
                  <Volume2 size={11} style={{ color: '#555', flexShrink: 0 }} />
                  <input
                    type="range"
                    min={0} max={1} step={0.01}
                    value={track.volume}
                    onChange={e => setVolume(ti, parseFloat(e.target.value))}
                    className="flex-1"
                    style={{ accentColor: track.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Transport bar */}
          <div className="flex items-center gap-4 px-4 py-3 border-t" style={{ borderColor: '#2a2a2a', background: '#161616' }}>
            {/* Play / Stop */}
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all"
              style={{
                background: isPlaying ? '#e63946' : '#4a6cf7',
                color: '#fff',
              }}
            >
              {isPlaying
                ? <><Square size={14} fill="currentColor" /> Stop</>
                : <><Play size={14} fill="currentColor" /> Play</>
              }
            </button>

            {/* BPM */}
            <div className="flex items-center gap-3 flex-1 max-w-xs">
              <span className="text-xs font-mono font-bold text-white">{bpm}</span>
              <span className="text-xs" style={{ color: '#555' }}>BPM</span>
              <input
                type="range"
                min={100} max={180} step={1}
                value={bpm}
                onChange={e => setBpm(parseInt(e.target.value))}
                className="flex-1"
                style={{ accentColor: '#4a6cf7' }}
              />
            </div>

            {/* Step indicator dots */}
            <div className="flex gap-0.5 ml-auto">
              {Array.from({ length: 16 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-colors"
                  style={{
                    width: 6,
                    height: 6,
                    background: isPlaying && i === currentStep ? '#4a6cf7' : i % 4 === 0 ? '#333' : '#222',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Tip */}
        <p className="mt-4 text-xs flex items-center gap-1" style={{ color: '#444' }}>
          <ChevronRight size={12} /> Click a track label to preview that sound. Click grid cells to toggle steps.
        </p>
      </div>
    </section>
  );
}
