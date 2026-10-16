import type { Testimonial } from '../data/releases';

interface TestimonialsProps {
  testimonials: Testimonial[];
}

export default function Testimonials({ testimonials }: TestimonialsProps) {
  return (
    <section className="py-16 px-6" style={{ borderTop: '1px solid #2a2a2a' }}>
      <div className="max-w-7xl mx-auto">
        <h2 className="text-sm font-semibold mb-8" style={{ color: '#888' }}>What artists are saying</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testimonials.map((t, i) => (
            <div key={i} className="testimonial-card">
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#ccc' }}>{t.quote}</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: t.color + '33', border: `1px solid ${t.color}66`, color: t.color }}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs" style={{ color: '#666' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
