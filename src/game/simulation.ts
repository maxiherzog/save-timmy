import { playCrashSound, playWhaleSound } from './audio';
import type { CharacterId } from './characters';
import { createMap, HEAL_ZONES, BARGE, anySandbank, pointInHealZone, DOCK_ZONE } from './map';
import type { GameState, PlayerInput, Whale, Boat } from './types';
import { MAP_W, MAP_H, WHALE_MAX_HP, TRAMPELN_STAMINA_MAX, TRAMPELN_COST, TRAMPELN_REGEN, BARGE_DRIFT_INTERVAL, BARGE_DRIFT_DURATION, HEAL_RATE_PER_SEC } from './types';

export function createInitialWhale(): Whale {
  return {
    x: 180,
    y: MAP_H / 2,
    heading: Math.PI,
    hp: WHALE_MAX_HP,
    state: 'swimming',
    wanderHeading: Math.PI,
    wanderTimer: 3,
    bargeTimer: 0,
    strandTimer: 0,
    healCooldown: 0,
    soundCooldown: 5,
    panicTimer: 0,
    ignoreBanksUntil: 7, // 7 seconds grace period
    accumulatedDamage: 0,
  };
}

export function createBoat(index: number, _total: number): Boat {
  // Spread boats along the dock shore (bottom edge)
  // Each boat points upwards (-PI/2)
  return {
    x: DOCK_ZONE.x + 40 + (index % 10) * 35,
    y: DOCK_ZONE.y + DOCK_ZONE.h - 30,
    heading: -Math.PI / 2, 
    vx: 0,
    vy: 0,
    speed: 0,
    hupenCooldown: 0,
    trampelnCooldown: 0,
    ramCooldown: 0,
    trampelnStamina: TRAMPELN_STAMINA_MAX,
    stunnedUntil: 0,
    alive: true,
    stats: { hupen: 0, trampeln: 0, rams: 0, healTime: 0 },
  };
}

export function createInitialState(code: string, impostersCount: number = 1): GameState {
  const seed = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const sandbanks = createMap(seed);
  return {
    code,
    phase: 'lobby',
    playTime: 0,
    countdownUntil: 0,
    impostersCount,
    players: {},
    whale: createInitialWhale(),
    sandbanks,
    healZones: HEAL_ZONES,
    barge: BARGE,
    vote: { active: false, calledBy: '', calledByCharacter: null, endsAt: 0, votes: {} },
    ended: null,
    bannerMessage: '',
    bannerUntil: 0,
    fx: [],
    bargeDrift: { nextDriftAt: 0, driftingUntil: 0, vx: 0, vy: 0 },
  };
}

let fxIdCounter = 1;

const BOAT_MAX_SPEED = 170;
const BOAT_RADIUS = 20;
const WHALE_RADIUS = 34;

function resolveCircleAABB(entity: {x: number, y: number}, radius: number, rx: number, ry: number, rw: number, rh: number) {
  const cx = Math.max(rx, Math.min(entity.x, rx + rw));
  const cy = Math.max(ry, Math.min(entity.y, ry + rh));
  const dx = entity.x - cx;
  const dy = entity.y - cy;
  const distSq = dx * dx + dy * dy;
  
  if (distSq < radius * radius && distSq > 0.0001) {
    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;
    entity.x += (dx / dist) * overlap;
    entity.y += (dy / dist) * overlap;
  }
}

function handleBargeCollision(entity: {x: number, y: number}, radius: number, state: GameState) {
  const b = state.barge;
  // Top wall
  resolveCircleAABB(entity, radius, b.x, b.y, b.w, b.wallThickness);
  // Bottom wall
  resolveCircleAABB(entity, radius, b.x, b.y + b.h - b.wallThickness, b.w, b.wallThickness);
  // Right wall
  resolveCircleAABB(entity, radius, b.x + b.w - b.wallThickness, b.y, b.wallThickness, b.h);
}

function updateBoat(p: { id: string, boat: Boat }, input: PlayerInput, dt: number, state: GameState, now: number) {
  const { boat } = p;
  if (!boat.alive) return;

  const isStunned = now < boat.stunnedUntil;

  // 1. Inputs
  let throttle = 0;
  let steering = 0;
  
  if (!isStunned) {
    // Throttle UI sends negative Y (up is negative in browser space), so we invert it.
    throttle = Math.max(0, Math.min(1, -input.joystickY));
    steering = Math.max(-1, Math.min(1, input.joystickX));
  }

  const BOAT_ENGINE_FORCE = 80; // Reduced from 160 for even slower boats
  const BOAT_TURN_SPEED = 2.0; // Slightly reduced turn speed to match slower velocity

  // 2. Turning
  const currentSpeed = Math.sqrt(boat.vx * boat.vx + boat.vy * boat.vy);
  // Turn speed is proportional to how fast we are moving, with a small base turn rate to allow turning from a standstill
  const turnFactor = Math.min(1, currentSpeed / 25 + 0.3); // Adjusted for lower top speed
  boat.heading += steering * BOAT_TURN_SPEED * turnFactor * dt;

  // 3. Engine Force
  const force = throttle * BOAT_ENGINE_FORCE;
  const fx = Math.cos(boat.heading) * force;
  const fy = Math.sin(boat.heading) * force;

  boat.vx += fx * dt;
  boat.vy += fy * dt;

  // 4. Drag & Keel Effect (Local space velocity)
  const cos = Math.cos(boat.heading);
  const sin = Math.sin(boat.heading);
  
  let forwardVel = boat.vx * cos + boat.vy * sin;
  let lateralVel = -boat.vx * sin + boat.vy * cos;

  // Apply friction
  forwardVel *= Math.max(0, 1 - 1.0 * dt); // Water resistance (forward drag - slightly lowered so it glides nicely)
  lateralVel *= Math.max(0, 1 - 5.0 * dt); // Keel effect prevents sliding (lateral drag)

  // Back to world space
  boat.vx = forwardVel * cos - lateralVel * sin;
  boat.vy = forwardVel * sin + lateralVel * cos;
  boat.speed = Math.sqrt(boat.vx * boat.vx + boat.vy * boat.vy);

  const onShallow = anySandbank(state.sandbanks, boat.x, boat.y);
  if (onShallow && boat.ramCooldown <= 0 && currentSpeed > 80) {
    boat.ramCooldown = 0.8;
    state.fx.push({ id: fxIdCounter++, kind: 'crash', x: boat.x, y: boat.y, t: performance.now() / 1000 });
    playCrashSound(Math.min(1, currentSpeed / 200));
    boat.vx *= -0.4;
    boat.vy *= -0.4;
  }
  const speedMul = onShallow ? 0.35 : 1;
  if (onShallow && currentSpeed > 20) {
    boat.vx *= Math.max(0, 1 - 3.0 * dt);
    boat.vy *= Math.max(0, 1 - 3.0 * dt);
  }

  boat.x += boat.vx * dt * speedMul;
  boat.y += boat.vy * dt * speedMul;

  if (boat.x < 30) { boat.x = 30; boat.vx = 0; }
  if (boat.x > MAP_W - 30) { boat.x = MAP_W - 30; boat.vx = 0; }
  if (boat.y < 30) { boat.y = 30; boat.vy = 0; }
  if (boat.y > MAP_H - 30) { boat.y = MAP_H - 30; boat.vy = 0; }

  boat.hupenCooldown = Math.max(0, boat.hupenCooldown - dt);
  boat.trampelnCooldown = Math.max(0, boat.trampelnCooldown - dt);
  boat.ramCooldown = Math.max(0, boat.ramCooldown - dt);
  boat.trampelnStamina = Math.min(TRAMPELN_STAMINA_MAX, boat.trampelnStamina + TRAMPELN_REGEN * dt);
  // 5. Wakes
  if (currentSpeed > 30 && Math.random() < 0.15) {
    // Spawn at the nose
    state.fx.push({ id: fxIdCounter++, kind: 'wake', x: boat.x + Math.cos(boat.heading) * 20, y: boat.y + Math.sin(boat.heading) * 20, t: now, heading: boat.heading });
  }

  handleBargeCollision(boat, BOAT_RADIUS, state);
}

function resolveCollision(a: {x: number, y: number}, b: {x: number, y: number}, radiusSum: number) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < radiusSum && dist > 0.01) {
    const overlap = radiusSum - dist;
    const nx = dx / dist;
    const ny = dy / dist;
    const pushX = nx * (overlap / 2);
    const pushY = ny * (overlap / 2);
    a.x += pushX;
    a.y += pushY;
    b.x -= pushX;
    b.y -= pushY;
  }
}
// (Wait, I already added resolveCollision in the previous edit, but it was just above updateBoat)


function applyPush(whale: Whale, srcX: number, srcY: number, radius: number, strength: number, causesPanic: boolean = false) {
  const dx = whale.x - srcX;
  const dy = whale.y - srcY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > radius || dist < 0.01) return;
  const falloff = 1 - dist / radius;
  
  // Make it easier to push Timmy off the sandbank (1.5 instead of 0.9)
  const stuckMul = whale.state === 'stranded' ? 1.5 : 1;
  const f = strength * falloff * 160 * stuckMul;
  
  whale.x += (dx / dist) * f * 0.016;
  whale.y += (dy / dist) * f * 0.016;
  whale.wanderHeading = Math.atan2(dy, dx);
  
  if (causesPanic) {
    whale.panicTimer = Math.max(whale.panicTimer, 1.5 * falloff);
  }
}

function updateWhale(state: GameState, dt: number) {
  const w = state.whale;
  if (w.state === 'dead') return;

  const hpBefore = w.hp;
  state.playTime += dt;

  w.soundCooldown -= dt;
  if (w.soundCooldown <= 0) {
    w.soundCooldown = 8 + Math.random() * 10;
    playWhaleSound(0.5 + w.hp / WHALE_MAX_HP * 0.5);
    
    // Create blow/fountain effect and push nearby boats
    state.fx.push({ id: fxIdCounter++, kind: 'blow', x: w.x, y: w.y, t: performance.now() / 1000 });
    for (const p of Object.values(state.players)) {
      if (!p.boat.alive) continue;
      const dx = p.boat.x - w.x;
      const dy = p.boat.y - w.y;
      const distSq = dx * dx + dy * dy;
      const blowRadius = 250;
      if (distSq < blowRadius * blowRadius && distSq > 1) {
        const dist = Math.sqrt(distSq);
        const pushForce = 300 * (1 - dist / blowRadius);
        p.boat.vx += (dx / dist) * pushForce;
        p.boat.vy += (dy / dist) * pushForce;
      }
    }
  }

  w.panicTimer = Math.max(0, w.panicTimer - dt);
  w.wanderTimer -= dt;
  if (w.wanderTimer <= 0) {
    w.wanderTimer = 1.5 + Math.random() * 1.5;
    
    // Sometimes actively steer towards a sandbank to make it harder
    const shouldSeekSandbank = state.playTime > w.ignoreBanksUntil && Math.random() < 0.35;
    
    if (shouldSeekSandbank && state.sandbanks.length > 0) {
      // Find a random sandbank in the middle (ignore coastlines)
      const innerBanks = state.sandbanks.filter(sb => sb.name !== '');
      if (innerBanks.length > 0) {
        const targetBank = innerBanks[Math.floor(Math.random() * innerBanks.length)];
        w.wanderHeading = Math.atan2(targetBank.y - w.y, targetBank.x - w.x);
        w.wanderTimer += 1.5; // Steer towards it a bit longer
      }
    } else {
      w.wanderHeading += (Math.random() - 0.5) * 1.5;
    }
  }

  if (w.state !== 'stranded' && state.playTime <= w.ignoreBanksUntil) {
    // Only avoid sandbanks during grace period
    const lookDist = 75;
    const ax = w.x + Math.cos(w.wanderHeading) * lookDist;
    const ay = w.y + Math.sin(w.wanderHeading) * lookDist;
    if (anySandbank(state.sandbanks, ax, ay)) {
      w.wanderHeading += (Math.random() < 0.5 ? -1 : 1) * 0.9;
    }
  }

  const hpMul = w.hp < 10 ? 0.5 : w.hp < 30 ? 0.75 : 1;
  const panicMul = w.panicTimer > 0 ? 1.8 : 1; // Speed up when panicked
  const baseSpeed = 28 * hpMul * panicMul;

  const shallow = anySandbank(state.sandbanks, w.x, w.y);
  if (shallow) {
    w.state = 'stranded';
    w.strandTimer += dt;
    const dmgPerSec = Math.max(0, Math.min(1.6, (w.strandTimer - 2) * 0.5));
    w.hp -= dt * dmgPerSec;
  } else {
    w.state = w.hp <= 0 ? 'dead' : w.hp < 15 ? 'dying' : 'swimming';
    w.strandTimer = 0;
  }

  if (w.state === 'swimming' || w.state === 'dying') {
    w.heading += (w.wanderHeading - w.heading) * dt * 0.8;
    
    // Edge avoidance steering
    const edgeMargin = 150;
    let steerX = 0;
    let steerY = 0;
    if (w.x < edgeMargin) steerX = 0.5 * (1 - w.x / edgeMargin);
    else if (w.x > MAP_W - edgeMargin) steerX = -0.5 * (1 - (MAP_W - w.x) / edgeMargin);
    
    if (w.y < edgeMargin) steerY = 0.5 * (1 - w.y / edgeMargin);
    else if (w.y > MAP_H - edgeMargin) steerY = -0.5 * (1 - (MAP_H - w.y) / edgeMargin);
    
    if (steerX !== 0 || steerY !== 0) {
      const targetHeading = Math.atan2(steerY, steerX);
      w.wanderHeading += (targetHeading - w.wanderHeading) * dt * 0.5;
    }

    w.x += Math.cos(w.heading) * baseSpeed * dt;
    w.y += Math.sin(w.heading) * baseSpeed * dt;
    
    // Wakes
    if (baseSpeed > 5 && Math.random() < 0.1) {
      // Spawn at the nose
      state.fx.push({ id: fxIdCounter++, kind: 'wake', x: w.x + Math.cos(w.heading) * 40, y: w.y + Math.sin(w.heading) * 40, t: performance.now() / 1000, heading: w.heading });
    }
  }
  
  // Hard boundaries as safety
  if (w.x < 60) { w.x = 60; w.wanderHeading = 0; }
  if (w.x > MAP_W - 60) { w.x = MAP_W - 60; w.wanderHeading = Math.PI; }
  if (w.y < 60) { w.y = 60; w.wanderHeading = Math.PI / 2; }
  if (w.y > MAP_H - 60) { w.y = MAP_H - 60; w.wanderHeading = -Math.PI / 2; }


  if (pointInHealZone(w.x, w.y)) {
    w.healCooldown -= dt;
    if (w.healCooldown <= 0) {
      w.hp = Math.min(WHALE_MAX_HP, w.hp + HEAL_RATE_PER_SEC * dt);
    }
  }

  const b = state.barge;
  if (w.x >= b.x && w.x <= b.x + b.w && w.y >= b.y && w.y <= b.y + b.h) {
    w.bargeTimer += dt;
  } else {
    w.bargeTimer = Math.max(0, w.bargeTimer - dt * 0.5);
  }

  for (const p of Object.values(state.players)) {
    if (!p.boat.alive) continue;
    const dx = w.x - p.boat.x;
    const dy = w.y - p.boat.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Use resolveCollision to prevent overlap, but keep the ram mechanic
    const radiusSum = WHALE_RADIUS + BOAT_RADIUS;
    if (dist < radiusSum) {
      resolveCollision(w, p.boat, radiusSum);
      if (p.boat.ramCooldown <= 0) {
        const speedFactor = 0.5 + Math.min(1, p.boat.speed / BOAT_MAX_SPEED);
        w.hp -= 5 * speedFactor;
        p.boat.stats.rams += 1;
        p.boat.ramCooldown = 1;
        state.fx.push({ id: fxIdCounter++, kind: 'crash', x: p.boat.x, y: p.boat.y, t: performance.now() / 1000 });
        playCrashSound(speedFactor);
      }
    }
    if (p.input.hupen && p.boat.hupenCooldown <= 0) {
      p.boat.hupenCooldown = 3;
      p.boat.stats.hupen += 1;
      applyPush(w, p.boat.x, p.boat.y, 230, 1.0, true);
      state.fx.push({ id: fxIdCounter++, kind: 'hupen', x: p.boat.x, y: p.boat.y, t: performance.now() / 1000 });
    }
    if (p.input.trampeln && p.boat.trampelnCooldown <= 0 && p.boat.trampelnStamina >= 1) {
      p.boat.trampelnCooldown = 1;
      p.boat.stats.trampeln += 1;
      const stamFrac = Math.max(0.15, p.boat.trampelnStamina / TRAMPELN_STAMINA_MAX);
      p.boat.trampelnStamina = Math.max(0, p.boat.trampelnStamina - TRAMPELN_COST);
      applyPush(w, p.boat.x, p.boat.y, 380 * (0.5 + 0.5 * stamFrac), 0.4 * stamFrac, false);
      state.fx.push({ id: fxIdCounter++, kind: 'trampeln', x: p.boat.x, y: p.boat.y, t: performance.now() / 1000 });
      
      // Also push other boats slightly when trampeling
      for (const otherP of Object.values(state.players)) {
        if (!otherP.boat.alive || otherP.id === p.id) continue;
        const bdx = otherP.boat.x - p.boat.x;
        const bdy = otherP.boat.y - p.boat.y;
        const bDistSq = bdx * bdx + bdy * bdy;
        const trampelRadius = 380 * (0.5 + 0.5 * stamFrac);
        if (bDistSq < trampelRadius * trampelRadius && bDistSq > 1) {
           const bDist = Math.sqrt(bDistSq);
           const pushF = 15 * (1 - bDist / trampelRadius) * stamFrac;
           otherP.boat.vx += (bdx / bDist) * pushF;
           otherP.boat.vy += (bdy / bDist) * pushF;
        }
      }
    }
    if (pointInHealZone(w.x, w.y)) {
      p.boat.stats.healTime += dt;
    }
  }

  w.hp = Math.max(0, Math.min(WHALE_MAX_HP, w.hp));
  const hpChange = w.hp - hpBefore;
  
  w.accumulatedDamage += hpChange;

  if (Math.abs(w.accumulatedDamage) >= 1) {
    state.fx.push({
      id: fxIdCounter++,
      kind: 'damage',
      x: w.x + (Math.random() - 0.5) * 80,
      y: w.y - 20 + (Math.random() - 0.5) * 40,
      t: performance.now() / 1000,
      amount: w.accumulatedDamage,
    });
    w.accumulatedDamage = 0;
  }
  
  handleBargeCollision(w, WHALE_RADIUS, state);
}

function updateBargeDrift(state: GameState, dt: number, now: number) {
  const d = state.bargeDrift;
  if (d.nextDriftAt === 0) d.nextDriftAt = now + BARGE_DRIFT_INTERVAL;
  if (now >= d.nextDriftAt && now >= d.driftingUntil) {
    const angle = Math.random() * Math.PI * 2;
    d.vx = Math.cos(angle) * (12 + Math.random() * 10);
    d.vy = Math.sin(angle) * (12 + Math.random() * 10) * 0.6;
    d.driftingUntil = now + BARGE_DRIFT_DURATION;
    d.nextDriftAt = now + BARGE_DRIFT_INTERVAL + Math.random() * 15;
    state.bannerMessage = 'Die Barge treibt mit dem Wind ab!';
    state.bannerUntil = now + 3;
  }
  if (now < d.driftingUntil) {
    const b = state.barge;
    const taper = Math.max(0, (d.driftingUntil - now) / BARGE_DRIFT_DURATION);
    b.x += d.vx * dt * taper;
    b.y += d.vy * dt * taper;
    if (b.x < MAP_W * 0.55) { b.x = MAP_W * 0.55; d.vx = Math.abs(d.vx); }
    if (b.x > MAP_W - b.w - 20) { b.x = MAP_W - b.w - 20; d.vx = -Math.abs(d.vx); }
    if (b.y < MAP_H * 0.25) { b.y = MAP_H * 0.25; d.vy = Math.abs(d.vy); }
    if (b.y > MAP_H - b.h - 40) { b.y = MAP_H - b.h - 40; d.vy = -Math.abs(d.vy); }
  }
}

export function stepSimulation(state: GameState, dt: number, now: number): GameState {
  if (state.phase === 'countdown' && now >= state.countdownUntil) {
    state.phase = 'playing';
    state.playTime = 0;
    if (state.whale) state.whale.ignoreBanksUntil = now + 7;
  }

  if (state.phase === 'voting' && state.vote.active && now >= state.vote.endsAt) {
    resolveVote(state);
  }

  if (state.phase !== 'playing' && state.phase !== 'countdown') return state;
  
  if (state.phase === 'playing') {
      const fxCutoff = now - 2;
      if (state.fx.length > 0) state.fx = state.fx.filter((f) => f.t > fxCutoff);
    
      const players = Object.values(state.players);
      for (const p of players) {
        if (p.connected) updateBoat(p, p.input, dt, state, now);
      }
    
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          const p1 = players[i], p2 = players[j];
          if (!p1.boat.alive || !p2.boat.alive) continue;
          const radiusSum = BOAT_RADIUS * 2;
          const dx = p1.boat.x - p2.boat.x, dy = p1.boat.y - p2.boat.y;
          if (dx * dx + dy * dy < radiusSum * radiusSum) {
            resolveCollision(p1.boat, p2.boat, radiusSum);
            
            if (p1.boat.ramCooldown <= 0 && p2.boat.ramCooldown <= 0) {
              playCrashSound(1);
              state.fx.push({ id: fxIdCounter++, kind: 'crash', x: (p1.boat.x + p2.boat.x) / 2, y: (p1.boat.y + p2.boat.y) / 2, t: now });
              
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = dx / dist;
              const ny = dy / dist;
              const bumpForce = 220;
              p1.boat.vx += nx * bumpForce;
              p1.boat.vy += ny * bumpForce;
              p2.boat.vx -= nx * bumpForce;
              p2.boat.vy -= ny * bumpForce;
    
              p1.boat.ramCooldown = 0.5; p2.boat.ramCooldown = 0.5;
              p1.boat.stunnedUntil = now + 2;
              p2.boat.stunnedUntil = now + 2;
            }
          }
        }
      }
    
      updateWhale(state, dt);
      updateBargeDrift(state, dt, now);
    
      if (state.whale.hp <= 0 && state.whale.state !== 'dead') {
        state.whale.state = 'dead';
        endMatch(state, 'imposter', 'whale_died');
      } else if (state.whale.bargeTimer >= 3 && state.whale.hp > 0 && state.whale.state !== 'dead') {
        endMatch(state, 'rescuers', 'barge');
      }
  }
  return state;
}

export function endMatch(state: GameState, winner: 'rescuers' | 'imposter', reason: any) {
  if (state.ended) return;
  const imposterIds = (state as any)._imposterIds as string[] | undefined || [];
  const imposterCharacters: CharacterId[] = [];
  const imposterNames: string[] = [];
  
  for (const id of imposterIds) {
    if (state.players[id]) {
      imposterCharacters.push(state.players[id].characterId);
      imposterNames.push(state.players[id].name);
    }
  }

  state.ended = { winner, reason, imposterIds, imposterCharacters, imposterNames };
  state.phase = 'ended';
}

export function startVote(state: GameState, callerId: string, now: number) {
  if (state.vote.active || state.phase !== 'playing') return;
  const caller = state.players[callerId];
  if (!caller || caller.pressConferenceUsed) return;
  caller.pressConferenceUsed = true;
  state.phase = 'voting';
  state.vote = { active: true, calledBy: callerId, calledByCharacter: caller.characterId, endsAt: now + 30, votes: {} };
}

export function castVote(state: GameState, voterId: string, targetId: string) {
  if (!state.vote.active || !state.players[voterId]?.boat.alive) return;
  if (voterId === targetId) return; // Cannot vote for yourself
  state.vote.votes[voterId] = targetId;
}

export function resolveVote(state: GameState) {
  const tally: Record<string, number> = {};
  for (const target of Object.values(state.vote.votes)) {
    tally[target] = (tally[target] || 0) + 1;
  }
  const alivePlayers = Object.values(state.players).filter((p) => p.boat.alive);
  const threshold = Math.floor(alivePlayers.length / 2) + 1;
  let ejected: string | null = null;
  let topCount = 0;
  for (const [tgt, count] of Object.entries(tally)) {
    if (count > topCount) { topCount = count; ejected = tgt; }
  }
  
  if (ejected && ejected !== 'skip' && topCount >= threshold) {
    if (state.players[ejected]) {
      state.players[ejected].boat.alive = false;
      state.bannerMessage = `${state.players[ejected].name} wurde des Amtes enthoben!`;
      state.bannerUntil = performance.now() / 1000 + 4;
    }
  } else {
    state.bannerMessage = 'Die Abstimmung ergab keine Mehrheit.';
    state.bannerUntil = performance.now() / 1000 + 4;
  }
  
  state.vote = { active: false, calledBy: '', calledByCharacter: null, endsAt: 0, votes: {} };
  state.phase = 'playing';
}
