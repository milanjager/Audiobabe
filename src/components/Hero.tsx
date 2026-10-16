import { releases } from '../data/releases';

interface HeroProps {
  onAddToCart: (id: string) => void;
}

export default function Hero({ onAddToCart }: HeroProps) {
  const featured = releases[1]; // VOID PROTOCOL

  return (
    <section className="hero-bg py-20 px-6 text-center relative overflow-hidden">
      <div className="max-w-3xl mx-auto">
        {/* Product badge */}
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black" style={{ background: '#1a0533', border: '1px solid #3a1055', color: '#bf5fff' }}>
            TB
          </div>
          <span className="text-white font-semibold text-lg">{featured.title}</span>
          <span className="badge-new">New</span>
        </div>

        {/* Headline */}
        <h1 className="font-black text-5xl md:text-7xl mb-5 leading-tight tracking-tight text-white">
          Machine Unlocked
        </h1>
        <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: '#999' }}>
          {featured.description}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            className="btn-primary px-8 py-3 text-sm"
            onClick={() => onAddToCart(featured.id)}
          >
            Buy Now – ${featured.price.toFixed(2)}
          </button>
          <button className="btn-secondary px-8 py-3 text-sm">
            Discover {featured.title}
          </button>
        </div>
      </div>

      {/* Product art */}
      <div className="mt-16 max-w-4xl mx-auto rounded-2xl overflow-hidden" style={{ border: '1px solid #2a2a2a', background: '#111' }}>
        <div className={`${featured.artClass} h-72 md:h-96 flex items-center justify-center relative`}>
          {/* Abstract tekno art */}
          <svg width="100%" height="100%" viewBox="0 0 800 400" className="absolute inset-0">
            {[...Array(8)].map((_, i) => (
              <g key={i}>
                <line
                  x1={100 + i * 90} y1="0" x2={60 + i * 80} y2="400"
                  stroke="#bf5fff" strokeWidth="0.5" strokeOpacity="0.3"
                />
                <circle cx={120 + i * 85} cy={80 + (i % 3) * 100} r={2 + i * 0.5}
                  fill="#bf5fff" fillOpacity="0.5" />
              </g>
            ))}
            {[...Array(5)].map((_, i) => (
              <rect key={i} x={50 + i * 140} y={150 + (i % 2) * 60}
                width={30 + i * 5} height={40 + i * 10}
                fill="none" stroke="#bf5fff" strokeWidth="0.5" strokeOpacity="0.4" />
            ))}
          </svg>
          <div className="relative z-10 text-center">
            <div className="text-5xl font-black tracking-tighter mb-2" style={{ color: '#bf5fff', textShadow: '0 0 40px rgba(191,95,255,0.5)' }}>
              {featured.title}
            </div>
            <div className="text-sm font-semibold tracking-widest uppercase" style={{ color: '#888' }}>
              {featured.artist} · {featured.bpm} BPM · {featured.tracks} TRACKS
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
