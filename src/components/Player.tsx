import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { Track } from '../data/tracks';

interface PlayerProps {
  track: Track | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Player({ track, isPlaying, onPlayPause, onNext, onPrev }: PlayerProps) {
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(75);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress(p => p >= 100 ? 0 : p + 0.1);
      }, 100);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  useEffect(() => {
    setProgress(0);
  }, [track]);

  const bars = Array.from({ length: 32 }, (_, i) => i);

  if (!track) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{ background: 'rgba(10,10,10,0.98)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Track info */}
        <div className="flex items-center gap-3 w-48 shrink-0">
          <div
            className="w-9 h-9 shrink-0 flex items-center justify-center text-xs font-bold"
            style={{ background: track.coverColor, border: '1px solid var(--border)', color: 'var(--accent)' }}
          >
            {isPlaying ? (
              <div className="flex items-end gap-0.5 h-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1 animate-pulse-bar" style={{ background: 'var(--accent)', height: '100%', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            ) : (
              track.bpm
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{track.title}</div>
            <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>{track.artist}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-4">
            <button className="hidden sm:block transition-opacity hover:opacity-70" style={{ color: 'var(--muted)' }}>
              <Shuffle size={14} />
            </button>
            <button onClick={onPrev} className="transition-opacity hover:opacity-70" style={{ color: 'var(--text)' }}>
              <SkipBack size={16} />
            </button>
            <button
              onClick={onPlayPause}
              className="w-8 h-8 flex items-center justify-center transition-all hover:scale-105"
              style={{ background: 'var(--accent)' }}
            >
              {isPlaying
                ? <Pause size={14} fill="#000" color="#000" />
                : <Play size={14} fill="#000" color="#000" style={{ marginLeft: 1 }} />
              }
            </button>
            <button onClick={onNext} className="transition-opacity hover:opacity-70" style={{ color: 'var(--text)' }}>
              <SkipForward size={16} />
            </button>
            <button className="hidden sm:block transition-opacity hover:opacity-70" style={{ color: 'var(--muted)' }}>
              <Repeat size={14} />
            </button>
          </div>

          {/* Progress */}
          <div className="w-full max-w-sm flex items-center gap-2">
            <span className="text-xs w-8 text-right" style={{ color: 'var(--muted)', fontSize: '10px' }}>
              {Math.floor(progress / 100 * 7)}:{String(Math.floor((progress / 100 * 42) % 60)).padStart(2, '0')}
            </span>
            <div
              className="flex-1 h-0.5 rounded-full cursor-pointer"
              style={{ background: 'var(--border)' }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setProgress(((e.clientX - rect.left) / rect.width) * 100);
              }}
            >
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
            </div>
            <span className="text-xs w-8" style={{ color: 'var(--muted)', fontSize: '10px' }}>{track.duration}</span>
          </div>
        </div>

        {/* Visualizer + volume */}
        <div className="hidden lg:flex items-center gap-4 w-48 justify-end">
          <div className="flex items-end gap-0.5 h-5">
            {bars.map((i) => (
              <div
                key={i}
                className={isPlaying ? 'animate-pulse-bar' : ''}
                style={{
                  width: '2px',
                  background: 'var(--accent)',
                  height: isPlaying ? `${8 + Math.sin(i * 0.6) * 6 + 6}px` : '3px',
                  opacity: isPlaying ? 0.7 : 0.3,
                  animationDelay: `${i * 0.04}s`,
                  animationDuration: `${0.5 + Math.sin(i) * 0.2}s`,
                  transition: 'height 0.3s',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Volume2 size={12} style={{ color: 'var(--muted)' }} />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="w-16 h-0.5 appearance-none cursor-pointer"
              style={{ accentColor: 'var(--accent)', background: `linear-gradient(to right, var(--accent) ${volume}%, var(--border) ${volume}%)` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
