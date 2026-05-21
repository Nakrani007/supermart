// BachatTracker — Real-time savings display in cart.
// "Bachat" = savings in Hindi/Gujarati. Shown prominently to reinforce value.
// Animates when savings increase to delight the user.

import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '../../utils/currency.js';

export default function BachatTracker({ savings, subtotal }) {
  const [animate, setAnimate] = useState(false);
  const prevSavings = useRef(savings);

  // Pulse animation whenever savings increases
  useEffect(() => {
    if (savings > prevSavings.current) {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 600);
      prevSavings.current = savings;
      return () => clearTimeout(t);
    }
    prevSavings.current = savings;
  }, [savings]);

  if (savings <= 0) return null;

  const savingsPct = subtotal > 0 ? Math.round((savings / (subtotal + savings)) * 100) : 0;

  return (
    <div
      className={`
        flex items-center gap-3 rounded-xl px-4 py-3
        bg-amber-50 border border-amber-200
        transition-transform duration-300
        ${animate ? 'scale-105' : 'scale-100'}
      `}
    >
      {/* Piggy bank icon */}
      <span className="text-2xl select-none">🪙</span>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">
          Aapni Bachat
        </p>
        <p className="text-lg font-bold text-amber-800 leading-tight">
          {formatPrice(savings)}{' '}
          <span className="text-sm font-normal text-amber-600">
            ({savingsPct}% off)
          </span>
        </p>
      </div>

      {/* Animated coin stack visual */}
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: Math.min(Math.ceil(savingsPct / 20), 5) }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 w-6 bg-amber-400 rounded-full"
            style={{ opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}
