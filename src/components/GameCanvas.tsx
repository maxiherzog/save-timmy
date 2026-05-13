import { useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import { MAP_W, MAP_H } from '../game/map';
import { Heart, Anchor } from 'lucide-react';
import { characterById } from '../game/characters';
import { WHALE_MAX_HP, HEAL_RATE_PER_SEC } from '../game/types';
import starsSvg from '../assets/stars.svg?url';

const starsImg = new Image();
starsImg.src = starsSvg;

const decorationImages: Record<string, HTMLImageElement> = {};
const decorationFiles: Record<string, { default: string }> = import.meta.glob('../assets/decorations/*.png', { eager: true });

for (const path in decorationFiles) {
  const name = path.split('/').pop()!;
  const img = new Image();
  img.src = decorationFiles[path].default;
  decorationImages[name] = img;
}

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

      ctx.fillStyle = '#3a8ba8';
      ctx.fillRect(0, 0, MAP_W, MAP_H);

      // ambient waves
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 300; i++) {
        const x = (whalePhase * 15 + i * 137) % MAP_W;
        const y = (whalePhase * 10 + i * 193) % MAP_H;
        ctx.beginPath();
        ctx.arc(x, y, 6 + Math.sin(whalePhase * 2 + i) * 4, 0, Math.PI);
        ctx.stroke();
      }
      
      for (const z of s.healZones) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(z.x, z.y, z.w, z.h);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '600 16px "Comic Neue", system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`Bagger-Rinne (+${HEAL_RATE_PER_SEC} HP/s)`, z.x + z.w / 2, z.y + z.h / 2 + 5);
      }


        // Sandbanks
        for (const sb of s.sandbanks) {
          // Ripple stroke
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(sb.poly[0][0], sb.poly[0][1]);
          for (let i = 1; i < sb.poly.length; i++) ctx.lineTo(sb.poly[i][0], sb.poly[i][1]);
          ctx.closePath();
          // Per-bank pulsing phase
          const bankPhase = whalePhase * 2.5 + (sb.x * 0.01 + sb.y * 0.02);
          ctx.strokeStyle = `rgba(100, 200, 255, ${0.6 + Math.sin(bankPhase) * 0.4})`;
          ctx.lineWidth = 12 + Math.sin(bankPhase * 0.8) * 10;
          ctx.stroke();
          ctx.restore();

          // Shallow strip
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(sb.poly[0][0], sb.poly[0][1]);
          for (let i = 1; i < sb.poly.length; i++) ctx.lineTo(sb.poly[i][0], sb.poly[i][1]);
          ctx.closePath();
          ctx.strokeStyle = '#8ed3e3';
          ctx.lineWidth = 18;
          ctx.stroke();
          ctx.restore();

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

      // Draw decorations in a separate pass after all sandbanks are drawn
      for (const sb of s.sandbanks) {
        for (const dec of sb.decorations) {
          const img = decorationImages[dec.asset];
          if (!img || !img.complete) continue;
          ctx.save();
          ctx.translate(dec.x, dec.y);
          ctx.rotate(dec.rotation);
          if (dec.mirrored) ctx.scale(-1, 1);
          ctx.scale(dec.scale, dec.scale);
          ctx.drawImage(img, -img.width / 2, -img.height);
          ctx.restore();
        }
      }

      const b = s.barge;
      const drifting = s.bargeDrift && performance.now() / 1000 < s.bargeDrift.driftingUntil;
      
      // Draw Barge (U-Shape)
      ctx.fillStyle = '#3a2418';
      // Top
      ctx.fillRect(b.x, b.y, b.w, b.wallThickness);
      // Bottom
      ctx.fillRect(b.x, b.y + b.h - b.wallThickness, b.w, b.wallThickness);
      // Right
      ctx.fillRect(b.x + b.w - b.wallThickness, b.y, b.wallThickness, b.h);

      ctx.fillStyle = '#1a3a50';
      ctx.fillRect(b.x + 14, b.y + 14, b.w - 28, b.h - 28);
      
      // Remove the inner blue block and the vertical teal line as it's completely open now

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


      // Draw Below-FX (e.g. wakes)
      drawFxBelow(ctx, s);

      const w = s.whale;
      if (w.state !== 'dead') {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.heading);
        drawWhale(ctx, w, whalePhase);
        ctx.restore();

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
        
        const nowSec = now / 1000;
        const isStunned = nowSec < p.boat.stunnedUntil;

        // Visual Rudder (steering indicator)
        ctx.save();
        ctx.translate(-24, 0); // Positioned at the back of the boat
        // Rotate rudder up to ~45 degrees based on steering input
        ctx.rotate(p.input.joystickX * 0.8);
        ctx.fillStyle = '#475569'; // Slate 600
        ctx.fillRect(-8, -2, 12, 4);
        ctx.restore();

        ctx.globalAlpha = Math.min(0.4, p.boat.speed / 200);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-28, 0, 28, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Boat Body (Elliptical / Dinghy shape)
        ctx.fillStyle = c.color;
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Engine / Back
        ctx.fillStyle = c.accent;
        ctx.fillRect(-22, -6, 8, 12);

        // Front indicator (Arrow / Stripe)
        ctx.fillStyle = c.accent;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(8, -6);
        ctx.lineTo(8, 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        if (isStunned) {
          ctx.save();
          ctx.translate(p.boat.x, p.boat.y - 30);
          ctx.rotate(nowSec * 5);
          ctx.drawImage(starsImg, -16, -16, 32, 32);
          ctx.restore();
        }

        ctx.save();
        ctx.translate(p.boat.x, p.boat.y - 26);
        const text = p.name.toUpperCase();
        const charText = c.name;
        
        ctx.font = '800 14px "Comic Neue", system-ui';
        const wName = ctx.measureText(text).width;
        ctx.font = '600 10px "Comic Neue", system-ui';
        const wChar = ctx.measureText(charText).width;
        
        const tagW = Math.max(wName, wChar) + 16;
        const tagH = 34;
        
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = 'rgba(5, 20, 30, 0.55)';
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 2;
        roundRect(ctx, -tagW / 2, -tagH, tagW, tagH, 8);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '800 14px "Comic Neue", system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(text, 0, -18);
        
        ctx.fillStyle = c.color;
        ctx.font = '600 10px "Comic Neue", system-ui';
        ctx.fillText(charText, 0, -6);
        ctx.restore();
      }

      // Draw Above-FX
      drawFxAbove(ctx, s);

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
  const swimAnim = Math.sin(phase * 3) * (whale.state === 'stranded' ? 0 : 1);
  const isPanicked = whale.panicTimer > 0;
  
  // Blink every 3-5 seconds
  const isBlinking = Math.sin(phase * 1.5) > 0.98 || Math.sin(phase * 2.1) > 0.98;

  // Tail (fluke) - longer and more prominent, animated
  ctx.save();
  ctx.translate(-40, bob);
  ctx.rotate(swimAnim * 0.15); // Tail wag
  ctx.fillStyle = '#a8b6c4';
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-20, -5 + swimAnim * 5, -30, -20, -40, -25); // Top fluke tip
  ctx.bezierCurveTo(-32, -10, -32, 10, -40, 25); // Bottom fluke tip
  ctx.bezierCurveTo(-30, 20, -20, 5 - swimAnim * 5, 0, 0);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Back Fin (Dorsal)
  ctx.fillStyle = '#a8b6c4';
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -20 + bob);
  ctx.bezierCurveTo(-5, -35 + bob, 5, -30 + bob, 10, -20 + bob);
  ctx.fill();
  ctx.stroke();

  // Flipper (Pectoral fin) - Bottom/Back one (if we wanted true 3D, but we draw it over the body)
  
  // Main body (cute ellipse)
  ctx.fillStyle = '#a8b6c4';
  ctx.beginPath();
  ctx.ellipse(0, bob, 48, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // White belly
  ctx.fillStyle = '#eaf0f6';
  ctx.beginPath();
  // Draw perfectly over the bottom half of the body
  ctx.ellipse(0, bob, 48, 24, 0, 0, Math.PI, false);
  ctx.bezierCurveTo(-20, 12 + bob, 20, 12 + bob, 48, bob);
  ctx.fill();
  
  // Soft line for the top edge of the belly
  ctx.strokeStyle = '#8b9bb4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-48, bob);
  ctx.bezierCurveTo(-20, 12 + bob, 20, 12 + bob, 48, bob);
  ctx.stroke();

  // Throat pleats (light blue/grey lines on belly)
  ctx.strokeStyle = '#a8b6c4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-25, 12 + bob); ctx.quadraticCurveTo(0, 20 + bob, 35, 12 + bob);
  ctx.moveTo(-20, 16 + bob); ctx.quadraticCurveTo(0, 23 + bob, 30, 16 + bob);
  ctx.moveTo(-10, 20 + bob); ctx.quadraticCurveTo(0, 25 + bob, 20, 20 + bob);
  ctx.stroke();

  // Flipper (Pectoral fin) - animated
  ctx.save();
  ctx.translate(10, 15 + bob); // Pivot point where fin attaches to body
  ctx.rotate(-swimAnim * 0.2); // Flap animation
  ctx.fillStyle = '#a8b6c4';
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0); // Origin relative to pivot
  ctx.bezierCurveTo(-10, 15, -20, 30, -10, 25);
  ctx.bezierCurveTo(0, 20, 10, 10, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Bumps on face (Tubercles)
  ctx.fillStyle = '#a8b6c4';
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1.5;
  const bumps = [
    {x: 45, y: -8},
    {x: 38, y: -15},
    {x: 28, y: -20},
  ];
  for (const b of bumps) {
    ctx.beginPath();
    ctx.arc(b.x, b.y + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Eye
  const eyeX = 26;
  const eyeY = -4 + bob;
  if (isBlinking && !isPanicked && whale.state !== 'dead') {
    // Closed eye (blink)
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(eyeX - 4, eyeY);
    ctx.quadraticCurveTo(eyeX, eyeY + 2, eyeX + 4, eyeY);
    ctx.stroke();
  } else {
    // Open eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, isPanicked ? 6 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(eyeX + (isPanicked ? 0 : 1), eyeY, isPanicked ? 2 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Emotion / Mouth
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  
  if (isPanicked) {
    // Panic mouth :o
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.ellipse(30, 8 + bob, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (whale.state === 'stranded') {
    // Wiggly mouth ~
    ctx.moveTo(18, 8 + bob);
    ctx.quadraticCurveTo(23, 4 + bob, 28, 8 + bob);
    ctx.quadraticCurveTo(33, 12 + bob, 38, 8 + bob);
    ctx.stroke();
  } else if (whale.hp < 30) {
    // Sad mouth :(
    ctx.moveTo(22, 10 + bob);
    ctx.quadraticCurveTo(30, 4 + bob, 38, 10 + bob);
    ctx.stroke();
  } else {
    // Happy mouth :)
    ctx.moveTo(22, 6 + bob);
    ctx.quadraticCurveTo(30, 14 + bob, 38, 6 + bob);
    ctx.stroke();
  }
}

function drawFxBelow(ctx: CanvasRenderingContext2D, state: GameState) {
  const now = performance.now() / 1000;
  for (const fx of state.fx) {
    const age = now - fx.t;
    if (fx.kind === 'wake') {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.5 - age * 0.25);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2 + age * 2;
      ctx.translate(fx.x, fx.y);
      ctx.rotate(fx.heading!);
      
      const spread = 10 + age * 45;
      const length = 15 + age * 60;
      
      ctx.beginPath();
      ctx.moveTo(-length, -spread);
      ctx.quadraticCurveTo(-length * 0.4, -spread * 0.3, 0, 0);
      ctx.quadraticCurveTo(-length * 0.4, spread * 0.3, -length, spread);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawFxAbove(ctx: CanvasRenderingContext2D, state: GameState) {
  const now = performance.now() / 1000;
  for (const fx of state.fx) {
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
    } else if (fx.kind === 'sand') {
      ctx.save();
      const life = Math.max(0, 1 - age / 0.6);
      ctx.globalAlpha = life * 0.7;
      ctx.fillStyle = '#e5c99f'; // Sand color
      ctx.beginPath();
      // Drift upwards slightly and grow
      const dy = age * -15;
      const size = 3 + age * 8;
      ctx.arc(fx.x, fx.y + dy, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (fx.kind === 'blow') {
      ctx.save();
      const progress = age / 1.8; // Lasts 1.8 seconds
      if (progress < 1) {
        ctx.globalAlpha = Math.max(0, 1 - progress);
        ctx.fillStyle = '#e0f2fe'; // Water color (lighter)
        
        // Draw multiple droplets
        for (let i = 0; i < 25; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8; // Spray upwards
          const speed = 50 + Math.random() * 120;
          const gravity = 150;
          
          const dx = Math.cos(angle) * speed * age;
          const dy = Math.sin(angle) * speed * age + 0.5 * gravity * age * age; // Parabolic trajectory
          
          ctx.beginPath();
          ctx.arc(fx.x + dx, fx.y + dy - 30, 3 + Math.random() * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    } else if (fx.kind === 'trampeln') {
      ctx.save();
      const progress = age / 0.8;
      if (progress < 1) {
        ctx.globalAlpha = Math.max(0, 1 - progress);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6 * (1 - progress);
        ctx.beginPath();
        // Draw a growing wave ring
        ctx.arc(fx.x, fx.y, 40 + progress * 150, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    } else if (fx.kind === 'damage') {
      const life = Math.max(0, 1 - age / 1.5);
      ctx.save();
      ctx.globalAlpha = life;
      const isHeal = fx.amount > 0;
      ctx.fillStyle = isHeal ? '#4ade80' : '#f87171';
      ctx.font = '900 24px "Comic Neue", system-ui';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 4;
      const text = `${isHeal ? '+' : ''}${Math.round(fx.amount * 10) / 10}`;
      const yOff = -40 - age * 60;
      ctx.strokeText(text, fx.x, fx.y + yOff);
      ctx.fillText(text, fx.x, fx.y + yOff);
      ctx.restore();
    }
  }
}

function HUD({ state }: { state: GameState }) {
  const hpPct = (state.whale.hp / WHALE_MAX_HP) * 100;
  const bargePct = state.whale.bargeProgress * 100;
  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-10">
        <div className="w-[420px] h-8 bg-black/50 rounded-full overflow-hidden border-2 border-white/30 relative">
          <div
            className="h-full transition-all duration-150"
            style={{
              width: `${hpPct}%`,
              background: hpPct > 60 ? 'linear-gradient(90deg,#10b981,#22c55e)' : hpPct > 30 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#b91c1c,#ef4444)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-bold text-white font-['Comic_Neue']">
            <Heart fill="currentColor" className="w-4 h-4 text-rose-400" />
            {Math.round(state.whale.hp)} / {WHALE_MAX_HP}
          </div>
        </div>
        {bargePct > 1 && (
          <div className="w-[320px] h-6 bg-black/50 rounded-full overflow-hidden border-2 border-white/30 relative">
            <div
              className="h-full transition-all duration-150"
              style={{
                width: `${bargePct}%`,
                background: 'linear-gradient(90deg,#3b82f6,#60a5fa)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs font-bold text-white font-['Comic_Neue']">
              <Anchor className="w-3.5 h-3.5" />
              TIMMY IN SICHERHEIT BRINGEN
            </div>
          </div>
        )}
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
