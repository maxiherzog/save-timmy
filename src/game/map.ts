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

// Simple 2D noise implementation for patchy distribution
function noise2D(x: number, y: number, seed: number) {
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  
  const hash = (ix: number, iy: number) => {
    const h = seed ^ (ix * 374761393) ^ (iy * 668265263);
    return (Math.sin(h) * 10000) % 1;
  };

  const X = Math.floor(x);
  const Y = Math.floor(y);
  const xf = x - X;
  const yf = y - Y;

  const u = fade(xf);
  const v = fade(yf);

  const n00 = hash(X, Y);
  const n10 = hash(X + 1, Y);
  const n01 = hash(X, Y + 1);
  const n11 = hash(X + 1, Y + 1);

  return lerp(
    lerp(n00, n10, u),
    lerp(n01, n11, u),
    v
  );
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
  depthProfile?: (t: number) => number,
): Array<[number, number]> {
  const poly: Array<[number, number]> = [];
  const depths: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const baseDepth = depthMin + rng() * (depthMax - depthMin);
    const offset = depthProfile ? depthProfile(t) : 0;
    depths.push(baseDepth + offset);
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
    decorations: [],
    visible: true,
  };
}

function makeCoastBank(side: 'top' | 'bottom' | 'left' | 'right', start: number, end: number, dMin: number, dMax: number, rng: () => number, visible = true, depthProfile?: (t: number) => number): Sandbank {
  const poly = coastlinePoly(side, start, end, dMin, dMax, 28, rng, depthProfile);
  const bb = bbox(poly);
  return {
    x: (bb.minX + bb.maxX) / 2,
    y: (bb.minY + bb.maxY) / 2,
    rx: (bb.maxX - bb.minX) / 2,
    ry: (bb.maxY - bb.minY) / 2,
    name: '',
    poly,
    decorations: [],
    visible,
  };
}

const SANDBANK_NAMES = [
  'Niendorf Riff', 'Timmendorf Untiefe', 'Poel Platte', 'Wismar Schlick', 
  'Boltenhagen Bank', 'Schlutuper Sand', 'Travemünde Rinne', 'Priwall Untiefe',
  'Fehmarn Belt Bank', 'Grömitzer Düne', 'Kellenhusen Riff'
];

const DECORATION_ASSETS = {
  foliage: ['bush1.png', 'bush2.png', 'bush3.png', 'bush4.png', 'grass1.png', 'grass2.png'],
  stones: ['stone1.png', 'stone2.png', 'stone3.png', 'stone4.png', 'stone5.png'],
  pebbles: ['pebbles1.png', 'pebbles2.png', 'pebbles3.png'],
  shells: ['seashell1.png', 'seashell2.png', 'seashell3.png'],
  trees: ['tree1.png', 'tree2.png'],
  house: 'lighthouse1.png',
};

function populateDecorations(sandbanks: Sandbank[], rng: () => number, seed: number) {
  let lighthousePlaced = false;

  for (const sb of sandbanks) {
    const isCoast = sb.name === '';
    const bb = bbox(sb.poly);
    const area = (bb.maxX - bb.minX) * (bb.maxY - bb.minY);
    
    // Increase potential placements to allow the probability filter to work
    const count = Math.floor((area / (isCoast ? 400 : 800)) * (0.8 + rng() * 0.4));
    
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 10) {
        const x = bb.minX + rng() * (bb.maxX - bb.minX);
        const y = bb.minY + rng() * (bb.maxY - bb.minY);

        if (pointInPoly(x, y, sb.poly)) {
          let foliageNoise = noise2D(x * 0.005, y * 0.005, seed);
          // Bias foliage downwards (y increases downwards)
          foliageNoise *= (0.5 + (y / MAP_H) * 1.0); 
          
          let stoneNoise = noise2D(x * 0.01, y * 0.01, seed + 123);
          // Slightly reduce stone frequency near the bottom to let trees shine
          if (y > MAP_H * 0.7) stoneNoise *= 0.7;

          let asset = '';
          let scale = 0.12 + rng() * 0.05;
          
          if (isCoast) {
            const roll = rng();
            if (!lighthousePlaced && roll < 0.01) {
              asset = DECORATION_ASSETS.house;
              scale = 0.2;
              lighthousePlaced = true;
            } else if (roll < 0.5) {
              // Probability scales with foliageNoise
              if (rng() < foliageNoise * 1.5) {
                asset = DECORATION_ASSETS.foliage[Math.floor(rng() * DECORATION_ASSETS.foliage.length)];
              }
            } else if (roll < 0.7) {
              // Probability scales with stoneNoise
              if (rng() < stoneNoise * 1.2) {
                asset = DECORATION_ASSETS.stones[Math.floor(rng() * DECORATION_ASSETS.stones.length)];
              }
            } else if (roll < 0.85) {
              if (rng() < stoneNoise * 0.8) {
                asset = DECORATION_ASSETS.pebbles[Math.floor(rng() * DECORATION_ASSETS.pebbles.length)];
              }
            } else if (roll < 0.95) {
              // Trees: stronger dependence on noise
              if (rng() < foliageNoise * foliageNoise * 2.0) {
                asset = DECORATION_ASSETS.trees[Math.floor(rng() * DECORATION_ASSETS.trees.length)];
                scale = 0.2 + rng() * 0.1;
              }
            } else {
              if (rng() < stoneNoise * 0.5) {
                asset = DECORATION_ASSETS.shells[Math.floor(rng() * DECORATION_ASSETS.shells.length)];
                scale = 0.08 + rng() * 0.04;
              }
            }
          } else {
            const roll = rng();
            if (roll < 0.6) {
              if (rng() < stoneNoise * 1.0) {
                asset = DECORATION_ASSETS.pebbles[Math.floor(rng() * DECORATION_ASSETS.pebbles.length)];
              }
            } else if (roll < 0.9) {
              if (rng() < stoneNoise * 0.8) {
                asset = DECORATION_ASSETS.stones[Math.floor(rng() * DECORATION_ASSETS.stones.length)];
              }
            } else {
              if (rng() < stoneNoise * 0.4) {
                asset = DECORATION_ASSETS.shells[Math.floor(rng() * DECORATION_ASSETS.shells.length)];
                scale = 0.05 + rng() * 0.03;
              }
            }
          }

          if (asset) {
            const maxRot = 2 * (Math.PI / 180);
            sb.decorations.push({
              asset,
              x,
              y,
              scale,
              rotation: (rng() - 0.5) * 2 * maxRot,
              mirrored: rng() > 0.5,
            });
          }
          break;
        }
        attempts++;
      }
    }
    // Sort decorations by Y coordinate to ensure correct layering (Y-sorting)
    sb.decorations.sort((a, b) => a.y - b.y);
  }
}

export function createMap(seed: number): Sandbank[] {

  const rng = mulberry32(seed);
  const sandbanks: Sandbank[] = [];

  // 1. Continuous coastline around the entire map (creating an invisible wall of sand)
  const wallThickness = 40; 
  const wallVariance = 15; 
  
  sandbanks.push(makeCoastBank('top', 0, MAP_W, wallThickness - wallVariance, wallThickness + wallVariance, rng));
  
  // Bottom coast with a kink and flat right part
  sandbanks.push(makeCoastBank('bottom', 0, MAP_W, wallThickness - wallVariance, wallThickness + wallVariance, rng, true, (t) => {
    // t is from 0 to 1 across the bottom edge
    // Flat part on the right (e.g. last 20%)
    if (t > 0.8) return -wallVariance; // Push it towards the edge to make it flat
    // Kink around 60-70%
    if (t > 0.6 && t < 0.7) return 20; 
    return 0;
  }));
  
  sandbanks.push(makeCoastBank('left', 0, MAP_H, wallThickness - wallVariance, wallThickness + wallVariance, rng, false));
  sandbanks.push(makeCoastBank('right', 0, MAP_H, wallThickness - wallVariance, wallThickness + wallVariance, rng, false));

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

  populateDecorations(sandbanks, rng, seed);

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
