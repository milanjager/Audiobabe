import { ShoppingCart, ArrowRight } from 'lucide-react';
import type { Release } from '../data/releases';

interface ReleasesGridProps {
  releases: Release[];
  onAddToCart: (id: string) => void;
}

function Badge({ type }: { type?: 'new' | 'sale' | 'ltd' }) {
  if (!type) return null;
  const cls = type === 'new' ? 'badge-new' : type === 'sale' ? 'badge-sale' : 'badge-ltd';
  const label = type === 'new' ? 'New' : type === 'sale' ? 'Sale' : 'Limited';
  return <span className={cls}>{label}</span>;
}

export default function ReleasesGrid({ releases, onAddToCart }: ReleasesGridProps) {
  return (
    <section id="releases" className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-sm font-semibold mb-8" style={{ color: '#888' }}>Featured Releases</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {releases.map(release => (
            <div key={release.id} className="card-bg overflow-hidden flex flex-col">
              {/* Artwork */}
              <div className={`${release.artClass} h-44 flex items-center justify-center relative flex-shrink-0`}>
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <Badge type={release.badge} />
                </div>

                {/* Art text */}
                <div className="text-center px-4">
                  <div className="font-black text-xl leading-tight text-white opacity-90">{release.title}</div>
                  <div className="text-xs mt-1" style={{ color: '#888' }}>{release.artist}</div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col flex-1">
                <div className="font-semibold text-sm text-white mb-0.5">{release.title}</div>
                <div className="text-xs mb-3" style={{ color: '#888' }}>{release.tagline}</div>
                <p className="text-xs leading-relaxed mb-4 flex-1" style={{ color: '#777' }}>
                  {release.description.slice(0, 90)}…
                </p>

                <div className="text-xs mb-3" style={{ color: '#666' }}>
                  {release.tracks} tracks · {release.bpm} BPM · {release.format}
                </div>

                {/* Price + actions */}
                <div className="flex items-center gap-2 mt-auto">
                  <button
                    className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
                    onClick={() => onAddToCart(release.id)}
                  >
                    <ShoppingCart size={12} />
                    {release.id === '1' ? `$${release.price}/mo` : `$${release.price}`}
                    {release.originalPrice && (
                      <span className="line-through opacity-50 text-xs">${release.originalPrice}</span>
                    )}
                  </button>
                  <button className="btn-secondary p-2">
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
