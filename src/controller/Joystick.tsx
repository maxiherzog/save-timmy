import { useEffect, useRef, useState } from 'react';

type Props = {
  onChange: (x: number, y: number) => void;
  size?: number;
};

export function Joystick({ onChange, size = 180 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [knobX, setKnobX] = useState(0); // Only tracking X for steering
  const active = useRef(false);

  useEffect(() => {
    function pos(e: PointerEvent) {
      const rect = ref.current!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      let dx = e.clientX - cx;
      const max = size / 2 - 16;
      if (Math.abs(dx) > max) {
        dx = Math.sign(dx) * max;
      }
      setKnobX(dx);
      // We only emit X for steering
      onChange(dx / max, 0);
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
      setKnobX(0);
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

  // Visual rotation based on X
  const rotation = (knobX / (size / 2 - 16)) * 90; // Max 90 degrees

  return (
    <div
      ref={ref}
      className="relative rounded-full touch-none select-none overflow-visible"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center text-[100px] origin-center"
        style={{
          transition: active.current ? 'none' : 'transform 0.2s ease-out',
          transform: `rotate(${rotation}deg)`
        }}
      >
        <span className="drop-shadow-2xl">☸️</span>
      </div>
    </div>
  );
}
