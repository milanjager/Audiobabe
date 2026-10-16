import { ShoppingCart, User } from 'lucide-react';

interface NavbarProps {
  cartCount: number;
  onCartOpen: () => void;
}

export default function Navbar({ cartCount, onCartOpen }: NavbarProps) {

  return (
    <nav className="sticky top-0 z-40 border-b" style={{ background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(12px)', borderColor: '#2a2a2a' }}>
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="font-black text-lg tracking-tight text-white">
          TEKNO BABE<span style={{ color: '#4a6cf7' }}>.</span>
        </a>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {['Releases', 'Artists', 'Free', 'Support', 'About'].map(link => (
            <a key={link} href={`#${link.toLowerCase()}`} className="nav-link">{link}</a>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <button
            onClick={onCartOpen}
            className="relative flex items-center gap-1.5 nav-link"
          >
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center" style={{ background: '#4a6cf7', fontSize: '10px' }}>
                {cartCount}
              </span>
            )}
            <ShoppingCart size={18} />
          </button>
          <a href="#" className="hidden md:flex items-center gap-1.5 nav-link text-sm">
            <User size={16} /> Login
          </a>
        </div>
      </div>
    </nav>
  );
}
