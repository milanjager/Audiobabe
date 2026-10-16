export default function About() {
  return (
    <section id="about" className="py-16 px-6" style={{ borderTop: '1px solid #2a2a2a' }}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-12 items-start">
        <div className="md:w-1/2">
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#888' }}>Tools for tekno</h2>
          <h3 className="text-3xl font-black text-white mb-4 leading-tight">
            Music made by people<br />for people.
          </h3>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#888' }}>
            Tekno Babe is an independent underground music platform, artist-run and community-owned.
            We curate and distribute tekno, industrial, and raw electronic music — no algorithms, no filler.
            Every release is hand-picked by people who live and breathe the sound.
          </p>
          <a href="#releases" className="btn-primary inline-block px-6 py-2.5 text-sm">
            Discover our Releases
          </a>
        </div>

        {/* Decorative grid of releases */}
        <div className="md:w-1/2 grid grid-cols-3 gap-2">
          {['artwork-gradient-1','artwork-gradient-2','artwork-gradient-3','artwork-gradient-4','artwork-gradient-5','artwork-gradient-6'].map((cls, i) => (
            <div key={i} className={`${cls} rounded-lg aspect-square flex items-center justify-center`} style={{ border: '1px solid #2a2a2a' }}>
              <div className="text-xs font-black opacity-50 text-white">TB</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
