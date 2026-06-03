// Reusable Tooltip component — wraps any element and shows a floating label.
// Usage: <Tooltip text="Save changes"><button>...</button></Tooltip>
// Position: 'top' | 'bottom' | 'left' | 'right' (default: 'top')

import { useState, useRef, useEffect } from 'react';

export default function Tooltip({ text, children, position = 'top', delay = 300, className = '' }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  const show = () => { timer.current = setTimeout(() => setVisible(true), delay); };
  const hide = () => { clearTimeout(timer.current); setVisible(false); };

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!text) return children;

  const posClasses = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top:    'top-full left-1/2 -translate-x-1/2 border-t-gray-700 border-x-transparent border-b-transparent border-4',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-700 border-x-transparent border-t-transparent border-4',
    left:   'left-full top-1/2 -translate-y-1/2 border-l-gray-700 border-y-transparent border-r-transparent border-4',
    right:  'right-full top-1/2 -translate-y-1/2 border-r-gray-700 border-y-transparent border-l-transparent border-4',
  };

  return (
    <div className={`relative inline-flex ${className}`} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div className={`absolute z-50 pointer-events-none ${posClasses[position]}`}>
          <div className="relative bg-gray-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-gray-600 max-w-[200px] text-center leading-snug">
            {text}
            <span className={`absolute ${arrowClasses[position]}`} style={{ width: 0, height: 0 }} />
          </div>
        </div>
      )}
    </div>
  );
}
