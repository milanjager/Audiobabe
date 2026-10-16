import { X, ShoppingCart } from 'lucide-react';
import type { Release } from '../data/releases';

interface CartItem {
  release: Release;
  qty: number;
}

interface CartPanelProps {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
}

export default function CartPanel({ open, items, onClose, onRemove }: CartPanelProps) {
  const total = items.reduce((sum, i) => sum + i.release.price * i.qty, 0);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: 360,
          background: '#1a1a1a',
          borderLeft: '1px solid #2a2a2a',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#2a2a2a' }}>
          <div className="flex items-center gap-2 font-semibold text-white">
            <ShoppingCart size={16} /> Cart
          </div>
          <button onClick={onClose} className="transition-opacity hover:opacity-70" style={{ color: '#888' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#666' }}>
              <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No items in cart</p>
              <p className="text-xs mt-1">Buy 2 releases and get 1 free</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map(({ release }) => (
                <li key={release.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#222', border: '1px solid #2a2a2a' }}>
                  <div className={`${release.artClass} w-10 h-10 rounded-lg flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{release.title}</div>
                    <div className="text-xs" style={{ color: '#888' }}>${release.price.toFixed(2)}</div>
                  </div>
                  <button onClick={() => onRemove(release.id)} className="hover:opacity-70 transition-opacity" style={{ color: '#666' }}>
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-5 border-t" style={{ borderColor: '#2a2a2a' }}>
            <div className="flex justify-between text-sm mb-4">
              <span style={{ color: '#888' }}>Subtotal</span>
              <span className="font-semibold text-white">${total.toFixed(2)}</span>
            </div>
            <button className="btn-primary w-full py-3 text-sm">Checkout</button>
          </div>
        )}
      </div>
    </>
  );
}
