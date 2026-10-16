import { Radio } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t py-10 px-4" style={{ borderColor: 'var(--border)' }}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Radio size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-bold tracking-[0.2em] uppercase">
            AUDIO<span style={{ color: 'var(--accent)' }}>BABE</span>
          </span>
          <span className="text-xs px-1.5 py-0.5 font-bold tracking-widest" style={{ background: 'var(--accent)', color: '#000' }}>TEKNO</span>
        </div>

        <div className="text-xs tracking-wider" style={{ color: 'var(--muted)' }}>
          © 2026 AUDIOBABE TEKNO — ALL RIGHTS RESERVED
        </div>

        <div className="flex gap-4 text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
          <a href="#" className="hover:opacity-70 transition-opacity">About</a>
          <a href="#" className="hover:opacity-70 transition-opacity">Submit</a>
          <a href="#" className="hover:opacity-70 transition-opacity">Contact</a>
        </div>
      </div>
    </footer>
  );
}
