import { MapPin, Disc3 } from 'lucide-react';
import { SectionHeader } from './TracksSection';
import type { Artist } from '../data/tracks';

interface ArtistsSectionProps {
  artists: Artist[];
}

export default function ArtistsSection({ artists }: ArtistsSectionProps) {
  return (
    <section id="artists" className="py-20 px-4 max-w-7xl mx-auto">
      <SectionHeader label="Roster" title="ARTISTS" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {artists.map(artist => (
          <div
            key={artist.id}
            className="border p-5 group cursor-pointer transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            {/* Avatar */}
            <div
              className="w-12 h-12 flex items-center justify-center text-lg font-black mb-4 border-2"
              style={{ borderColor: artist.accentColor, color: artist.accentColor }}
            >
              {artist.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>

            <div className="font-black text-xl uppercase mb-1 tracking-tight group-hover:opacity-70 transition-opacity" style={{ color: 'var(--text)' }}>
              {artist.name}
            </div>

            <div className="flex items-center gap-1 mb-3">
              <MapPin size={10} style={{ color: 'var(--muted)' }} />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{artist.origin}</span>
            </div>

            <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--muted)' }}>
              {artist.bio}
            </p>

            <div className="flex items-center gap-1.5 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <Disc3 size={12} style={{ color: artist.accentColor }} />
              <span className="text-xs font-bold" style={{ color: artist.accentColor }}>{artist.tracks}</span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>releases</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
