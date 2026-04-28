import type { Sandbank, Barge, HealZone } from './types';
import { MAP_W, MAP_H } from './types';

// Simple deterministic PRNG so the map looks the same for everyone
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function organicBlob(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  points: number,
  jitter: number,
  seed: number,
): Array<[number, number]> {
  const rng = mulberry32(seed);
  const poly: Array<[number, number]> = [];
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2;
    const noise = 1 + (rng() - 0.5) * jitter;
    const px = cx + Math.cos(t) * rx * noise;
    const py = cy + Math.sin(t) * ry * noise;
    poly.push([px, py]);
  }
  return poly;
}

function coastlinePoly(
  side: 'top' | 'bottom' | 'left' | 'right',
  start: number,
  end: number,
  depthMin: number,
  depthMax: number,
  segments: number,
  seed: number,
): Array<[number, number]> {
  const rng = mulberry32(seed);
  const poly: Array<[number, number]> = [];
  const depths: number[] = [];
  for (let i = 0; i <= segments; i++) {
    depths.push(depthMin + rng() * (depthMax - depthMin));
  }
  // Smooth depths a bit
  for (let k = 0; k < 2; k++) {
    for (let i = 1; i < depths.length - 1; i++) {
      depths[i] = (depths[i - 1] + depths[i] + depths[i + 1]) / 3;
    }
  }

  if (side === 'top') {
    poly.push([start, 0]);
    for (let i = 0; i <= segments; i++) {
      const x = start + ((end - start) * i) / segments;
      poly.push([x, depths[i]]);
    }
    poly.push([end, 0]);
  } else if (side === 'bottom') {
    poly.push([start, MAP_H]);
    for (let i = 0; i <= segments; i++) {
      const x = start + ((end - start) * i) / segments;
      poly.push([x, MAP_H - depths[i]]);
    }
    poly.push([end, MAP_H]);
  } else if (side === 'left') {
    poly.push([0, start]);
    for (let i = 0; i <= segments; i++) {
      const y = start + ((end - start) * i) / segments;
      poly.push([depths[i], y]);
    }
    poly.push([0, end]);
  } else {
    poly.push([MAP_W, start]);
    for (let i = 0; i <= segments; i++) {
      const y = start + ((end - start) * i) / segments;
      poly.push([MAP_W - depths[i], y]);
    }
    poly.push([MAP_W, end]);
  }
  return poly;
}

function bbox(poly: Array<[number, number]>) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

function makeBank(cx: number, cy: number, rx: number, ry: number, name: string, seed: number, jitter = 0.35): Sandbank {
  const poly = organicBlob(cx, cy, rx, ry, 18, jitter, seed);
  const bb = bbox(poly);
  return {
    x: cx,
    y: cy,
    rx: (bb.maxX - bb.minX) / 2,
    ry: (bb.maxY - bb.minY) / 2,
    name,
    poly,
  };
}

function makeCoastBank(side: 'top' | 'bottom' | 'left' | 'right', start: number, end: number, dMin: number, dMax: number, seed: number): Sandbank {
  const poly = coastlinePoly(side, start, end, dMin, dMax, 14, seed);
  const bb = bbox(poly);
  return {
    x: (bb.minX + bb.maxX) / 2,
    y: (bb.minY + bb.maxY) / 2,
    rx: (bb.maxX - bb.minX) / 2,
    ry: (bb.maxY - bb.minY) / 2,
    name: '',
    poly,
  };
}

export const SANDBANKS: Sandbank[] = [
  // Inner named shoals - organic blob shapes
  makeBank(560, 340, 110, 62, 'Sandbank Niendorf', 101, 0.32),
  makeBank(920, 480, 140, 72, 'Timmendorf Shoals', 102, 0.38),
  makeBank(1140, 290, 100, 56, 'Sandbank Poel', 103, 0.34),
  makeBank(720, 640, 120, 62, 'Wismar Flats', 104, 0.36),
  makeBank(1160, 620, 95, 54, 'Boltenhagen Bank', 105, 0.30),

  // Continuous coastline - top (narrower than before for more water)
  makeCoastBank('top', 0, MAP_W, 55, 105, 201),
  // Bottom - leave a clear approach near barge (right third)
  makeCoastBank('bottom', 0, 1200, 55, 100, 202),
  makeCoastBank('bottom', 1200, MAP_W, 30, 55, 203),
  // Left coastline
  makeCoastBank('left', 180, MAP_H - 180, 60, 115, 204),
  // Right coastline - only upper portion, keep barge approach open
  makeCoastBank('right', 180, 460, 55, 100, 205),
];

export const HEAL_ZONES: HealZone[] = [
  { x: 280, y: 440, w: 180, h: 40 },
  { x: 820, y: 720, w: 220, h: 40 },
];

export const BARGE: Barge = {
  x: MAP_W - 260,
  y: MAP_H - 260,
  w: 200,
  h: 170,
  openingY: MAP_H - 180,
  openingSize: 100,
};

export const COAST_TOP = 90;
export const COAST_BOTTOM = MAP_H - 90;

function pointInPoly(x: number, y: number, poly: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInSandbank(x: number, y: number, sb: Sandbank): boolean {
  // Quick bbox check first
  if (x < sb.x - sb.rx - 4 || x > sb.x + sb.rx + 4) return false;
  if (y < sb.y - sb.ry - 4 || y > sb.y + sb.ry + 4) return false;
  return pointInPoly(x, y, sb.poly);
}

export function anySandbank(x: number, y: number): Sandbank | null {
  for (const sb of SANDBANKS) if (pointInSandbank(x, y, sb)) return sb;
  return null;
}

export function pointInHealZone(x: number, y: number): boolean {
  for (const z of HEAL_ZONES) {
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return true;
  }
  return false;
}

export function pointInBarge(x: number, y: number): boolean {
  const b = BARGE;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

export { MAP_W, MAP_H };
