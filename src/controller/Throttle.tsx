import { useEffect, useRef, useState } from 'react';

type Props = {
  onChange: (value: number) => void;
  height?: number;
};

export function Throttle({ onChange, height = 200 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(0); // 0 to 1
  const active = useRef(false);

  useEffect(() => {
    function pos(e: PointerEvent) {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      // Y is inverted (0 is bottom, 1 is top)
      let relativeY = rect.bottom - e.clientY;
      let val = relativeY / rect.height;
      val = Math.max(0, Math.min(1, val));
      
      // Snap to 0 if very low
      if (val < 0.1) val = 0;
      
      setValue(val);
      onChange(val);
    }

    function down(e: PointerEvent) {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      // Add a little padding to the hit area
      if (
        e.clientX < rect.left - 20 ||
        e.clientX > rect.right + 20 ||
        e.clientY < rect.top - 20 ||
        e.clientY > rect.bottom + 20
      )
        return;
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

  return (
    <div
      ref={ref}
      className="relative w-16 bg-slate-800/80 border-4 border-slate-600 rounded-full touch-none select-none shadow-inner"
      style={{ height }}
    >
      {/* Track markers */}
      <div className="absolute inset-0 flex flex-col justify-between py-4 opacity-30">
        <div className="w-4 h-0.5 bg-white mx-auto" />
        <div className="w-2 h-0.5 bg-white mx-auto" />
        <div className="w-4 h-0.5 bg-white mx-auto" />
        <div className="w-2 h-0.5 bg-white mx-auto" />
        <div className="w-4 h-0.5 bg-white mx-auto" />
      </div>
      
      {/* Handle */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-16 h-12 bg-gradient-to-b from-slate-200 to-slate-400 rounded-xl border-2 border-slate-500 shadow-xl flex items-center justify-center cursor-pointer"
        style={{
          bottom: `calc(${value * 100}% - 24px)`,
          transition: active.current ? 'none' : 'bottom 0.1s',
        }}
      >
        <div className="w-8 h-1 bg-slate-600 rounded-full shadow-sm" />
      </div>
    </div>
  );
}
