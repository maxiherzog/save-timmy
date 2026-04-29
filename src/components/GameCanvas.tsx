import { useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import { MAP_W, MAP_H, HEAL_ZONES } from '../game/map';
import { characterById } from '../game/characters';
import { WHALE_MAX_HP } from '../game/types';

type Props = { state: GameState };

export function GameCanvas({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let raf: number;
    let whalePhase = 0;
    let lastT = performance.now();

    function resize() {
      const rect = container!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      canvas!.style.width = `${rect.width}px`;
      canvas!.style.height = `${rect.height}px`;
    }
    resize();
    window.addEventListener('resize', resize);

    function render() {
      const now = performance.now();
      const dt = (now - lastT) / 1000;
      lastT = now;
      whalePhase += dt;

      const s = stateRef.current;
      const ctx = canvas!.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;
      const rect = container!.getBoundingClientRect();
      const scaleX = (rect.width * dpr) / MAP_W;
      const scaleY = (rect.height * dpr) / MAP_H;
      const scale = Math.min(scaleX, scaleY);
      const ox = (rect.width * dpr - MAP_W * scale) / 2;
      const oy = (rect.height * dpr - MAP_H * scale) / 2;

      ctx.save();
      ctx.fillStyle = '#052e3a';
      ctx.fillRect(0, 0, canvas!.width, canvas!.height);
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);

      const tProg = s.dayProgress / s.dayLength;
      const dayHue = tProg < 0.7 ? 195 : 220;
      const dayLight = tProg < 0.6 ? 35 : tProg < 0.85 ? 22 : 14;
      ctx.fillStyle = `hsl(${dayHue}, 55%, ${dayLight}%)`;
      ctx.fillRect(0, 0, MAP_W, MAP_H);
      
      for (const z of HEAL_ZONES) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
        ctx.fillRect(z.x, z.y, z.w, z.h);
      }

      for (const sb of s.sandbanks) {
        if (sb.poly.length < 3) continue;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(sb.poly[0][0], sb.poly[0][1]);
        for (let i = 1; i < sb.poly.length; i++) ctx.lineTo(sb.poly[i][0], sb.poly[i][1]);
        ctx.closePath();
        ctx.fillStyle = '#b89866';
        ctx.fill();
        ctx.restore();
      }

      const b = s.barge;
      ctx.fillStyle = '#3a2418';
      ctx.fillRect(b.x, b.y, b.w, b.h);

      const w = s.whale;
      if (w.state !== 'dead') {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.heading);
        ctx.globalAlpha = w.hp < 30 ? 0.6 : w.hp < 15 ? 0.35 : 1;
        drawWhale(ctx, w, whalePhase);
        ctx.restore();
      }

      for (const p of Object.values(s.players)) {
        if (!p.boat.alive) continue;
        const c = characterById(p.characterId);
        ctx.save();
        ctx.translate(p.boat.x, p.boat.y);
        ctx.rotate(p.boat.heading);
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-18, -12);
        ctx.lineTo(-18, 12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      drawFx(ctx, s);

      ctx.restore();
      raf = requestAnimationFrame(render);
    }

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <HUD state={state} />
    </div>
  );
}

function drawWhale(ctx: CanvasRenderingContext2D, whale: GameState['whale'], phase: number) {
  const bob = Math.sin(phase * 2) * 2;
  const anim = Math.sin(phase * 2.2) * (whale.state === 'stranded' ? 0.2 : 1);

  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.ellipse(0, bob, 48, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d1d5db';
  ctx.beginPath();
  ctx.ellipse(-4, 8 + bob, 38, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.moveTo(-46, bob);
  ctx.bezierCurveTo(-55, -8 + bob, -58, -14 + bob + anim * 5, -64, -16 + bob + anim * 8);
  ctx.bezierCurveTo(-60, bob, -60, bob, -64, 16 + bob - anim * 8);
  ctx.bezierCurveTo(-58, 14 + bob, -55, 8 + bob, -46, bob);
  ctx.closePath();
  ctx.fill();

  let mouthY = 2;
  let eyeBrowTranslate = 2;
  if (whale.state === 'stranded' || whale.hp < 30) {
    mouthY = -2;
    eyeBrowTranslate = -1;
  } else if (whale.hp < 60) {
    mouthY = 0;
    eyeBrowTranslate = 1;
  }

  const eyeX = 28;
  const eyeY = -6 + bob;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(eyeX + 1, eyeY, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(eyeX - 2, eyeY - 3 + eyeBrowTranslate);
  ctx.bezierCurveTo(eyeX, eyeY - 4 + eyeBrowTranslate, eyeX + 2, eyeY - 3 + eyeBrowTranslate, eyeX + 3, eyeY - 2 + eyeBrowTranslate);
  ctx.stroke();

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(26, 4 + bob);
  ctx.bezierCurveTo(30, 4 + bob + mouthY, 34, 4 + bob + mouthY, 38, 4 + bob);
  ctx.stroke();
}

function drawFx(ctx: CanvasRenderingContext2D, state: GameState) {
  const now = performance.now() / 1000;
  for (const fx of state.fx as any[]) {
    const age = now - fx.t;
    if (fx.kind === 'hupen') {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - age / 0.3);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 230 * (age / 0.3), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (fx.kind === 'crash') {
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const life = Math.max(0, 1 - age / (0.4 + i * 0.05));
        ctx.fillStyle = i % 2 === 0 ? '#ffab40' : '#ffe8c8';
        ctx.globalAlpha = life * 0.8;
        ctx.beginPath();
        const angle = fx.id * 1.2 + i * 1.3;
        const dist = 20 + i * 4 + (1 - life) * 30;
        const size = 3 + (1 - life) * 8;
        ctx.arc(fx.x + Math.cos(angle) * dist, fx.y + Math.sin(angle) * dist, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

function HUD({ state }: { state: GameState }) {
  const hpPct = (state.whale.hp / WHALE_MAX_HP) * 100;
  const dayLeft = Math.max(0, state.dayLength - state.dayProgress);
  const isNight = state.dayProgress / state.dayLength > 0.7;
  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
        <div className="text-xs font-bold tracking-widest text-white/80">TIMMY</div>
        <div className="w-[420px] h-8 bg-black/50 rounded-full overflow-hidden border-2 border-white/30 relative">
          <div
            className="h-full transition-all duration-150"
            style={{
              width: `${hpPct}%`,
              background: hpPct > 60 ? 'linear-gradient(90deg,#10b981,#22c55e)' : hpPct > 30 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#b91c1c,#ef4444)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
            {Math.round(state.whale.hp)} / {WHALE_MAX_HP}
          </div>
        </div>
      </div>
      <div className="absolute top-4 right-4 bg-black/60 rounded-lg px-4 py-3 text-white pointer-events-none">
        <div className="text-xs uppercase tracking-wider text-white/60">Tag</div>
        <div className="text-2xl font-black">
          {state.day} / {state.maxDays}
        </div>
        <div className="text-xs text-white/70">
          {isNight ? 'Nacht' : 'Tag'} · noch {Math.ceil(dayLeft)}s
        </div>
      </div>
    </>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
