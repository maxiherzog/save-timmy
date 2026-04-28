import { useEffect, useRef, useState } from 'react';

type Props = {
  onChange: (x: number, y: number) => void;
  size?: number;
};

export function Joystick({ onChange, size = 180 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef(false);

  useEffect(() => {
    function pos(e: PointerEvent) {
      const rect = ref.current!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const max = size / 2 - 16;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > max) {
        dx = (dx / d) * max;
        dy = (dy / d) * max;
      }
      setKnob({ x: dx, y: dy });
      onChange(dx / max, dy / max);
    }
    function down(e: PointerEvent) {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
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
      setKnob({ x: 0, y: 0 });
      onChange(0, 0);
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
  }, [onChange, size]);

  return (
    <div
      ref={ref}
      className="relative rounded-full bg-slate-800/80 border-4 border-slate-600 touch-none select-none"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute rounded-full bg-gradient-to-br from-teal-300 to-teal-500 shadow-lg border-2 border-white/40"
        style={{
          width: size * 0.42,
          height: size * 0.42,
          left: size / 2 - (size * 0.42) / 2 + knob.x,
          top: size / 2 - (size * 0.42) / 2 + knob.y,
          transition: active.current ? 'none' : 'all 0.15s ease-out',
        }}
      />
    </div>
  );
}
