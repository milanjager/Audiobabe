import { Radio, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

export default function Navbar({ activeSection, onNavigate }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = ['Tracks', 'Artists', 'Labels', 'Events'];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button
          onClick={() => onNavigate('hero')}
          className="flex items-center gap-2 group"
        >
          <Radio size={20} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text)' }}>
            AUDIO<span style={{ color: 'var(--accent)' }}>BABE</span>
          </span>
          <span className="text-xs px-1.5 py-0.5 font-bold tracking-widest uppercase" style={{ background: 'var(--accent)', color: '#000' }}>TEKNO</span>
        </button>

        <div className="hidden md:flex items-center gap-6">
          {navItems.map(item => (
            <button
              key={item}
              onClick={() => onNavigate(item.toLowerCase())}
              className="text-xs font-semibold tracking-widest uppercase transition-colors"
              style={{ color: activeSection === item.toLowerCase() ? 'var(--accent)' : 'var(--muted)' }}
            >
              {item}
            </button>
          ))}
        </div>

        <button
          className="md:hidden p-1"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ color: 'var(--muted)' }}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t px-4 py-3 flex flex-col gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          {navItems.map(item => (
            <button
              key={item}
              onClick={() => { onNavigate(item.toLowerCase()); setMenuOpen(false); }}
              className="text-xs font-semibold tracking-widest uppercase text-left"
              style={{ color: activeSection === item.toLowerCase() ? 'var(--accent)' : 'var(--muted)' }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
