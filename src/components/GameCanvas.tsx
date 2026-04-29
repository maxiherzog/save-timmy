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

      // wave bands
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#ffffff';
      for (let y = 50; y < MAP_H; y += 40) {
        const offset = Math.sin(whalePhase * 0.6 + y * 0.01) * 10;
        ctx.fillRect(0, y + offset, MAP_W, 2);
      }
      ctx.globalAlpha = 1;
      
      for (const z of HEAL_ZONES) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(z.x, z.y, z.w, z.h);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '600 16px "Comic Neue", system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Bagger-Rinne', z.x + z.w / 2, z.y + z.h / 2 + 5);
      }

      // Sandbanks
      for (const sb of s.sandbanks) {
        if (sb.poly.length < 3) continue;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(sb.poly[0][0], sb.poly[0][1]);
        for (let i = 1; i < sb.poly.length; i++) ctx.lineTo(sb.poly[i][0], sb.poly[i][1]);
        ctx.closePath();
        
        ctx.fillStyle = '#b89866';
        ctx.fill();
        
        ctx.save();
        ctx.clip();
        const grad = ctx.createRadialGradient(sb.x, sb.y, 0, sb.x, sb.y, Math.max(sb.rx, sb.ry) * 1.1);
        grad.addColorStop(0, '#ecd7a3');
        grad.addColorStop(0.7, '#d4b27a');
        grad.addColorStop(1, '#b89866');
        ctx.fillStyle = grad;
        ctx.fillRect(sb.x - sb.rx - 10, sb.y - sb.ry - 10, sb.rx * 2 + 20, sb.ry * 2 + 20);
        
        if (sb.rx > 80 && sb.ry > 40) {
          ctx.fillStyle = 'rgba(80, 100, 55, 0.25)';
          for (let gi = 0; gi < 4; gi++) {
            const gx = sb.x + Math.cos(gi * 1.7) * sb.rx * 0.4;
            const gy = sb.y + Math.sin(gi * 2.3) * sb.ry * 0.4;
            ctx.beginPath();
            ctx.arc(gx, gy, 6 + gi, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
        
        ctx.strokeStyle = 'rgba(90,70,40,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        
        // Restore text drawing for sandbanks
        if (sb.name) {
          ctx.save();
          ctx.fillStyle = 'rgba(40,30,20,0.7)';
          ctx.font = '700 16px "Comic Neue", system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(sb.name, sb.x, sb.y + 6);
          ctx.restore();
        }
      }

      const b = s.barge;
      const drifting = s.bargeDrift && performance.now() / 1000 < s.bargeDrift.driftingUntil;
      ctx.fillStyle = '#3a2418';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#1a3a50';
      ctx.fillRect(b.x + 14, b.y + 14, b.w - 28, b.h - 28);
      ctx.fillStyle = '#0ea5a0';
      ctx.fillRect(b.x - 6, b.y + b.h / 2 - 40, 12, 80);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.lineWidth = 1;
      ctx.fillStyle = '#fbbf24';
      ctx.font = '700 22px "Comic Neue", system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('BARGE', b.x + b.w / 2, b.y + b.h / 2 + 8);
      if (drifting) {
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);
        ctx.setLineDash([]);
        ctx.fillStyle = '#fbbf24';
        ctx.font = '700 14px "Comic Neue", system-ui';
        ctx.fillText('WIND-DRIFT', b.x + b.w / 2, b.y - 12);
        ctx.restore();
      }


      const w = s.whale;
      if (w.state !== 'dead') {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.heading);
        ctx.globalAlpha = w.hp < 30 ? 0.6 : w.hp < 15 ? 0.35 : 1;
        drawWhale(ctx, w, whalePhase);
        ctx.restore();

        if (w.hp > 40 && Math.sin(whalePhase * 1.2) > 0.7) {
          ctx.save();
          ctx.translate(w.x, w.y);
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.ellipse(0, -30, 4, 18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 4;
        ctx.font = '700 18px "Comic Neue", system-ui';
        ctx.textAlign = 'center';
        ctx.strokeText('TIMMY', w.x, w.y - 40);
        ctx.fillText('TIMMY', w.x, w.y - 40);
      } else {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.translate(w.x, w.y);
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.ellipse(0, 0, 48, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (const p of Object.values(s.players)) {
        if (!p.boat.alive) continue;
        const c = characterById(p.characterId);
        ctx.save();
        ctx.translate(p.boat.x, p.boat.y);
        ctx.rotate(p.boat.heading);
        
        ctx.globalAlpha = Math.min(0.4, p.boat.speed / 200);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-28, 0, 28, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-18, -12);
        ctx.lineTo(-18, 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = c.accent;
        ctx.fillRect(-12, -4, 16, 8);
        ctx.restore();

        ctx.save();
        ctx.translate(p.boat.x, p.boat.y - 32);
        const text = p.name.toUpperCase();
        const charText = c.name;
        ctx.font = '800 18px "Comic Neue", system-ui';
        const wName = ctx.measureText(text).width;
        ctx.font = '600 13px "Comic Neue", system-ui';
        const wChar = ctx.measureText(charText).width;
        const tagW = Math.max(wName, wChar) + 20;
        const tagH = 46;
        ctx.fillStyle = 'rgba(5, 20, 30, 0.88)';
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 3;
        roundRect(ctx, -tagW / 2, -tagH, tagW, tagH, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '800 18px "Comic Neue", system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(text, 0, -24);
        ctx.fillStyle = c.accent;
        ctx.font = '600 13px "Comic Neue", system-ui';
        ctx.fillText(charText, 0, -8);
        ctx.restore();
      }

      drawFx(ctx, s);

      if (w.hp < 25 && w.state !== 'dead') {
        ctx.fillStyle = `rgba(139, 20, 40, ${(25 - w.hp) / 80})`;
        ctx.fillRect(0, 0, MAP_W, MAP_H);
      }
      if (w.state === 'dead') {
        ctx.fillStyle = 'rgba(20, 20, 30, 0.55)';
        ctx.fillRect(0, 0, MAP_W, MAP_H);
      }

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
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white font-['Comic_Neue']">
            {Math.round(state.whale.hp)} / {WHALE_MAX_HP}
          </div>
        </div>
      </div>
      <div className="absolute top-4 right-4 bg-black/60 rounded-lg px-4 py-3 text-white pointer-events-none">
        <div className="text-xs uppercase tracking-wider text-white/60">Tag</div>
        <div className="text-2xl font-black font-['Comic_Neue']">
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
