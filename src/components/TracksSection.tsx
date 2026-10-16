import { Play, Clock, Music2 } from 'lucide-react';
import type { Track } from '../data/tracks';

interface TracksSectionProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onSelect: (track: Track) => void;
}

export default function TracksSection({ tracks, currentTrack, isPlaying, onSelect }: TracksSectionProps) {
  return (
    <section id="tracks" className="py-20 px-4 max-w-7xl mx-auto">
      <SectionHeader label="Catalog" title="TRACKS" />

      <div className="border" style={{ borderColor: 'var(--border)' }}>
        {/* Table header */}
        <div
          className="hidden md:grid grid-cols-[auto_1fr_1fr_1fr_auto_auto_auto] gap-4 px-4 py-2 border-b text-xs font-bold tracking-widest uppercase"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
        >
          <span className="w-6">#</span>
          <span>Title</span>
          <span>Artist</span>
          <span>Label</span>
          <span>BPM</span>
          <span>Genre</span>
          <span><Clock size={12} /></span>
        </div>

        {tracks.map((track, i) => {
          const active = currentTrack?.id === track.id;
          return (
            <div
              key={track.id}
              className="track-hover grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_1fr_1fr_auto_auto_auto] gap-4 px-4 py-3 border-b items-center cursor-pointer group"
              style={{ borderColor: 'var(--border)', background: active ? 'var(--surface-2)' : undefined }}
              onClick={() => onSelect(track)}
            >
              {/* Index / play button */}
              <div className="w-6 flex items-center justify-center">
                {active && isPlaying ? (
                  <div className="flex items-end gap-0.5 h-3">
                    {[0, 1, 2].map(j => (
                      <div key={j} className="w-0.5 animate-pulse-bar" style={{ background: 'var(--accent)', height: '100%', animationDelay: `${j * 0.15}s` }} />
                    ))}
                  </div>
                ) : (
                  <>
                    <span className="text-xs group-hover:hidden" style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}>{i + 1}</span>
                    <Play size={12} fill="currentColor" className="hidden group-hover:block" style={{ color: 'var(--accent)', marginLeft: 1 }} />
                  </>
                )}
              </div>

              {/* Title + cover dot */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 shrink-0 flex items-center justify-center" style={{ background: track.coverColor }}>
                  <Music2 size={12} style={{ color: 'var(--accent)', opacity: 0.8 }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: active ? 'var(--accent)' : 'var(--text)' }}>
                    {track.title}
                  </div>
                  <div className="text-xs md:hidden" style={{ color: 'var(--muted)' }}>{track.artist} · {track.bpm} BPM</div>
                </div>
              </div>

              <div className="hidden md:block text-sm truncate" style={{ color: 'var(--muted)' }}>{track.artist}</div>
              <div className="hidden md:block text-xs truncate" style={{ color: 'var(--muted)' }}>{track.label}</div>
              <div className="hidden md:block text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>{track.bpm}</div>
              <div className="hidden md:block text-xs truncate" style={{ color: 'var(--muted)' }}>{track.genre}</div>
              <div className="hidden md:block text-xs font-mono" style={{ color: 'var(--muted)' }}>{track.duration}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-10">
      <div className="text-xs font-bold tracking-[0.4em] uppercase mb-2" style={{ color: 'var(--accent)' }}>{label}</div>
      <h2 className="text-4xl md:text-6xl font-black uppercase leading-none" style={{ letterSpacing: '-0.02em' }}>{title}</h2>
      <div className="mt-3 h-px" style={{ background: `linear-gradient(to right, var(--accent), transparent)`, maxWidth: '200px' }} />
    </div>
  );
}
