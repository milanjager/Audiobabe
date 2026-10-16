import { useState, useCallback } from 'react';
import PromoBar from './components/PromoBar';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ReleasesGrid from './components/ReleasesGrid';
import Testimonials from './components/Testimonials';
import Press from './components/Press';
import About from './components/About';
import Footer from './components/Footer';
import CartPanel from './components/CartPanel';
import { releases, testimonials, pressItems } from './data/releases';
import type { Release } from './data/releases';

interface CartItem { release: Release; qty: number; }

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((id: string) => {
    const release = releases.find(r => r.id === id);
    if (!release) return;
    setCartItems(prev => {
      const existing = prev.find(i => i.release.id === id);
      if (existing) return prev.map(i => i.release.id === id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { release, qty: 1 }];
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems(prev => prev.filter(i => i.release.id !== id));
  }, []);

  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div style={{ background: '#141414', minHeight: '100vh' }}>
      <PromoBar />
      <Navbar cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />

      <main>
        <Hero onAddToCart={addToCart} />
        <ReleasesGrid releases={releases} onAddToCart={addToCart} />
        <Testimonials testimonials={testimonials} />
        <Press items={pressItems} />
        <About />
        <Footer />
      </main>

      <CartPanel
        open={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
      />
    </div>
  );
}
