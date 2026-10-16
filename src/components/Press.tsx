import { Award } from 'lucide-react';
import type { PressItem } from '../data/releases';

interface PressProps {
  items: PressItem[];
}

export default function Press({ items }: PressProps) {
  return (
    <section className="py-16 px-6" style={{ borderTop: '1px solid #2a2a2a' }}>
      <div className="max-w-7xl mx-auto">
        <h2 className="text-sm font-semibold mb-8" style={{ color: '#888' }}>Praise from the press</h2>

        <div className="flex flex-wrap gap-3">
          {items.map((item, i) => (
            <div key={i} className="press-badge">
              <Award size={16} style={{ color: '#4a6cf7', flexShrink: 0 }} />
              <div>
                <div className="font-bold text-white text-sm">{item.outlet}</div>
                <div style={{ color: '#888', fontSize: '11px' }}>{item.award} · {item.year}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
