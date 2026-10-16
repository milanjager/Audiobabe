import { Calendar, MapPin } from 'lucide-react';
import { SectionHeader } from './TracksSection';
import type { Event } from '../data/tracks';

interface EventsSectionProps {
  events: Event[];
}

export default function EventsSection({ events }: EventsSectionProps) {
  return (
    <section id="events" className="py-20 px-4 max-w-7xl mx-auto">
      <SectionHeader label="Schedule" title="EVENTS" />

      <div className="space-y-3">
        {events.map((event, i) => (
          <div
            key={event.id}
            className="border group cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center gap-4 p-4"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            {/* Number */}
            <div
              className="text-4xl font-black w-12 shrink-0 text-center leading-none"
              style={{ color: 'var(--border)', fontVariantNumeric: 'tabular-nums' }}
            >
              {String(i + 1).padStart(2, '0')}
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0">
              <div className="font-black text-xl uppercase tracking-tight mb-1 group-hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text)' }}>
                {event.name}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {event.venue} · {event.city}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={10} />
                  {event.date}
                </span>
              </div>
            </div>

            {/* Lineup */}
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {event.lineup.map(name => (
                <span
                  key={name}
                  className="text-xs px-2 py-0.5 border font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                >
                  {name}
                </span>
              ))}
            </div>

            {/* Price */}
            <div className="shrink-0 text-right">
              <div className="text-lg font-black" style={{ color: 'var(--accent)' }}>{event.price}</div>
              <button
                className="mt-1 text-xs px-3 py-1 font-bold uppercase tracking-widest transition-all hover:opacity-80"
                style={{ background: 'var(--accent)', color: '#000' }}
              >
                Tickets
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
