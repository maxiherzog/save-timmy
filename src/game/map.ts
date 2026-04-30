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
  rng: () => number,
): Array<[number, number]> {
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
  rng: () => number,
): Array<[number, number]> {
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

function makeBank(cx: number, cy: number, rx: number, ry: number, name: string, rng: () => number, jitter = 0.35): Sandbank {
  const poly = organicBlob(cx, cy, rx, ry, 32, jitter, rng);
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

function makeCoastBank(side: 'top' | 'bottom' | 'left' | 'right', start: number, end: number, dMin: number, dMax: number, rng: () => number): Sandbank {
  const poly = coastlinePoly(side, start, end, dMin, dMax, 28, rng);
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

const SANDBANK_NAMES = [
  'Niendorf Riff', 'Timmendorf Untiefe', 'Poel Platte', 'Wismar Schlick', 
  'Boltenhagen Bank', 'Schlutuper Sand', 'Travemünde Rinne', 'Priwall Untiefe',
  'Fehmarn Belt Bank', 'Grömitzer Düne', 'Kellenhusen Riff'
];

export function createMap(seed: number): Sandbank[] {
  const rng = mulberry32(seed);
  const sandbanks: Sandbank[] = [];

  // 1. Continuous coastline around the entire map (creating an invisible wall of sand)
  const wallThickness = 40; // Reduced thickness
  const wallVariance = 15; // Reduced variance for smoother coastline
  
  sandbanks.push(makeCoastBank('top', 0, MAP_W, wallThickness - wallVariance, wallThickness + wallVariance, rng));
  sandbanks.push(makeCoastBank('bottom', 0, MAP_W, wallThickness - wallVariance, wallThickness + wallVariance, rng));
  sandbanks.push(makeCoastBank('left', 0, MAP_H, wallThickness - wallVariance, wallThickness + wallVariance, rng));
  sandbanks.push(makeCoastBank('right', 0, MAP_H, wallThickness - wallVariance, wallThickness + wallVariance, rng));

  // 2. Generate random inner sandbanks
  const numBanks = 4 + Math.floor(rng() * 4); // 4 to 7 inner banks
  const takenAreas: {x: number, y: number, rx: number, ry: number}[] = [];
  
  // Clone and shuffle names based on PRNG
  const availableNames = [...SANDBANK_NAMES].sort(() => rng() - 0.5);

  for (let i = 0; i < numBanks; i++) {
    let x = 0, y = 0, rx = 0, ry = 0;
    let attempts = 0;
    let overlaps = true;

    while (overlaps && attempts < 30) {
      rx = 80 + rng() * 60; // Random width
      ry = 40 + rng() * 40;  // Random height
      // Keep away from the outer walls and the barge area
      x = wallThickness + rx + 50 + rng() * (MAP_W - 2 * (wallThickness + rx + 50));
      y = wallThickness + ry + 50 + rng() * (MAP_H - 2 * (wallThickness + ry + 50));
      
      // Keep away from Barge area (bottom right)
      if (x > MAP_W - 450 && y > MAP_H - 450) {
        attempts++;
        continue;
      }
      
      // Keep away from Whale spawn (center left)
      if (x < 300 && y > MAP_H/2 - 150 && y < MAP_H/2 + 150) {
        attempts++;
        continue;
      }

      // Keep away from Harbor zones
      let nearHarbor = false;
      for (const zone of HARBOR_ZONES) {
        if (Math.sqrt(Math.pow(x - zone.x, 2) + Math.pow(y - zone.y, 2)) < (rx + ry) * 1.5) {
          nearHarbor = true;
          break;
        }
      }
      if (nearHarbor) {
        attempts++;
        continue;
      }

      overlaps = false;
      for (const area of takenAreas) {
        const dist = Math.sqrt(Math.pow(x - area.x, 2) + Math.pow(y - area.y, 2));
        if (dist < (rx + area.rx) * 1.3 || dist < (ry + area.ry) * 1.3) {
          overlaps = true;
          break;
        }
      }
      attempts++;
    }

    if (!overlaps) {
      const name = availableNames.pop() || '';
      sandbanks.push(makeBank(x, y, rx, ry, name, rng, 0.2 + rng()*0.1)); // Reduced jitter for smoother shapes
      takenAreas.push({x, y, rx, ry});
    }
  }

  return sandbanks;
}

export const HEAL_ZONES: HealZone[] = [
  { x: 280, y: 440, w: 180, h: 40 },
  { x: 820, y: 720, w: 220, h: 40 },
];

export const HARBOR_ZONES: {x: number, y: number}[] = [
  { x: 100, y: 100 },
  { x: 100, y: 200 },
  { x: 100, y: 300 },
  { x: 100, y: 400 },
];

export const BARGE: Barge = {
  x: MAP_W - 280,
  y: MAP_H - 280,
  w: 132,
  h: 120,
  wallThickness: 20,
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
  if (x < sb.x - sb.rx - 4 || x > sb.x + sb.rx + 4) return false;
  if (y < sb.y - sb.ry - 4 || y > sb.y + sb.ry + 4) return false;
  return pointInPoly(x, y, sb.poly);
}

export function anySandbank(sandbanks: Sandbank[], x: number, y: number): Sandbank | null {
  for (const sb of sandbanks) if (pointInSandbank(x, y, sb)) return sb;
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
