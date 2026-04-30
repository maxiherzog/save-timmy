import { useEffect, useRef, useState } from 'react';
import rudderSvg from '../assets/rudder.svg';

type Props = {
  onChange: (value: number) => void;
};

export function SteeringSlider({ onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(0); // -1 to 1
  const active = useRef(false);

  useEffect(() => {
    function pos(e: PointerEvent) {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      // Handle is 64px wide (w-16). Max travel from center is (width - 64) / 2.
      const max = (rect.width - 64) / 2;
      let dx = e.clientX - cx;
      
      let val = dx / max;
      val = Math.max(-1, Math.min(1, val));
      
      setValue(val);
      onChange(val);
    }

    function down(e: PointerEvent) {
      if (!ref.current) return;
      active.current = true;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      pos(e);
    }

    function move(e: PointerEvent) {
      if (!active.current) return;
      pos(e);
    }

    function up() {
      if (!active.current) return;
      active.current = false;
      setValue(0);
      onChange(0);
    }

    const el = ref.current!;
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [onChange]);

  // Map value (-1 to 1) to percent (0 to 1)
  const percent = (value + 1) / 2;

  return (
    <div
      ref={ref}
      className="relative w-full h-20 bg-slate-800/80 border-4 border-slate-600 rounded-full touch-none select-none shadow-inner flex items-center"
    >
      {/* Center marker */}
      <div className="absolute left-1/2 top-2 bottom-2 w-1 bg-white/10 -translate-x-1/2 rounded-full" />
      
      {/* Track markers */}
      <div className="absolute inset-0 flex justify-between items-center px-6 opacity-20 pointer-events-none">
        <div className="w-1 h-4 bg-white rounded-full" />
        <div className="w-1 h-4 bg-white rounded-full" />
      </div>
      
      {/* Handle */}
      <div
        className="absolute top-1 bottom-1 w-16 bg-gradient-to-b from-slate-200 to-slate-400 rounded-full border-2 border-slate-500 shadow-xl flex items-center justify-center cursor-pointer overflow-hidden"
        style={{
          left: `calc(${percent * 100}% - ${percent * 64}px)`,
          transition: active.current ? 'none' : 'left 0.15s ease-out',
        }}
      >
        {/* Render the rudder svg slightly rotated to indicate steering direction if desired, or just static */}
        <img 
          src={rudderSvg} 
          draggable="false" 
          className="w-8 h-8 object-contain opacity-80 filter invert-[0.8]"
          style={{ transform: `rotate(${value * 45}deg)` }}
        />
      </div>
    </div>
  );
}
