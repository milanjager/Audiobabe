import { MapPin, Package } from 'lucide-react';
import { SectionHeader } from './TracksSection';
import type { Label } from '../data/tracks';

interface LabelsSectionProps {
  labels: Label[];
}

export default function LabelsSection({ labels }: LabelsSectionProps) {
  return (
    <section id="labels" className="py-20 px-4 max-w-7xl mx-auto">
      <SectionHeader label="Imprints" title="LABELS" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {labels.map(label => (
          <div
            key={label.id}
            className="border p-5 cursor-pointer group"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            {/* Color bar */}
            <div className="h-0.5 mb-4" style={{ background: label.color, boxShadow: `0 0 12px ${label.color}60` }} />

            <div className="font-black text-2xl uppercase mb-2 tracking-tight transition-opacity group-hover:opacity-70" style={{ color: 'var(--text)' }}>
              {label.name}
            </div>

            <div className="flex items-center gap-1 mb-4">
              <MapPin size={10} style={{ color: 'var(--muted)' }} />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{label.origin}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="text-lg font-black" style={{ color: label.color }}>{label.founded}</div>
                <div className="text-xs tracking-widest" style={{ color: 'var(--muted)' }}>FOUNDED</div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Package size={12} style={{ color: label.color }} />
                  <div className="text-lg font-black" style={{ color: label.color }}>{label.releases}</div>
                </div>
                <div className="text-xs tracking-widest" style={{ color: 'var(--muted)' }}>RELEASES</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
