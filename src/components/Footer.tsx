export default function Footer() {
  const links = [
    ['All Releases', 'Free Downloads', 'Support', 'Blog'],
    ['Refund Policy', 'Privacy Policy', 'Press Kit', 'Contact'],
  ];

  return (
    <footer className="py-12 px-6" style={{ borderTop: '1px solid #2a2a2a' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
          <div>
            <div className="font-black text-xl text-white mb-2">
              TEKNO BABE<span style={{ color: '#4a6cf7' }}>.</span>
            </div>
            <p className="text-sm max-w-xs" style={{ color: '#666' }}>
              Underground tekno platform. Independent. Artist-run. Uncompromising.
            </p>
          </div>

          <div className="flex gap-12">
            {links.map((col, i) => (
              <ul key={i} className="space-y-2">
                {col.map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm transition-colors hover:text-white" style={{ color: '#666' }}>{link}</a>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8" style={{ borderTop: '1px solid #2a2a2a' }}>
          <span className="text-xs" style={{ color: '#444' }}>© 2026 Tekno Babe. All rights reserved.</span>
          <div className="flex gap-4 text-xs" style={{ color: '#666' }}>
            {['YouTube', 'Instagram', 'Bandcamp', 'SoundCloud', 'Discord'].map(s => (
              <a key={s} href="#" className="hover:text-white transition-colors">{s}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
