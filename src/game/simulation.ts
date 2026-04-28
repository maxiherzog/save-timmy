import type { GameState, PlayerInput, Whale, Boat } from './types';
import { MAP_W, MAP_H, DAY_LENGTH, MAX_DAYS, WHALE_MAX_HP, TRAMPELN_STAMINA_MAX, TRAMPELN_COST, TRAMPELN_REGEN, BARGE_DRIFT_INTERVAL, BARGE_DRIFT_DURATION } from './types';
import { SANDBANKS, HEAL_ZONES, BARGE, COAST_TOP, COAST_BOTTOM, anySandbank, pointInHealZone } from './map';
import type { CharacterId } from './characters';

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
  };
}

export function createBoat(index: number, total: number): Boat {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const cx = MAP_W / 2;
  const cy = MAP_H / 2;
  return {
    x: cx + Math.cos(angle) * 220,
    y: cy + Math.sin(angle) * 140,
    heading: angle + Math.PI,
    vx: 0,
    vy: 0,
    speed: 0,
    hupenCooldown: 0,
    trampelnCooldown: 0,
    ramCooldown: 0,
    trampelnStamina: TRAMPELN_STAMINA_MAX,
    alive: true,
    stats: { hupen: 0, trampeln: 0, rams: 0, healTime: 0 },
  };
}

export function createInitialState(code: string): GameState {
  return {
    code,
    phase: 'lobby',
    day: 1,
    dayProgress: 0,
    dayLength: DAY_LENGTH,
    maxDays: MAX_DAYS,
    players: {},
    whale: createInitialWhale(),
    sandbanks: SANDBANKS,
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

const BOAT_ACCEL = 260;
const BOAT_MAX_SPEED = 170;
const BOAT_FRICTION = 0.94;
const BOAT_RADIUS = 22;
const WHALE_RADIUS = 34;

function updateBoat(boat: Boat, input: PlayerInput, dt: number) {
  if (!boat.alive) return;
  const ix = Math.max(-1, Math.min(1, input.joystickX));
  const iy = Math.max(-1, Math.min(1, input.joystickY));
  const mag = Math.sqrt(ix * ix + iy * iy);
  if (mag > 0.08) {
    const nx = ix / Math.max(mag, 1);
    const ny = iy / Math.max(mag, 1);
    boat.vx += nx * BOAT_ACCEL * dt;
    boat.vy += ny * BOAT_ACCEL * dt;
    boat.heading = Math.atan2(ny, nx);
  }
  boat.vx *= Math.pow(BOAT_FRICTION, dt * 60);
  boat.vy *= Math.pow(BOAT_FRICTION, dt * 60);
  const speed = Math.sqrt(boat.vx * boat.vx + boat.vy * boat.vy);
  if (speed > BOAT_MAX_SPEED) {
    boat.vx = (boat.vx / speed) * BOAT_MAX_SPEED;
    boat.vy = (boat.vy / speed) * BOAT_MAX_SPEED;
  }

  // Sandbank slowdown - boats that stray onto a bank are dragged to a crawl
  const onShallow = anySandbank(boat.x, boat.y);
  const speedMul = onShallow ? 0.35 : 1;
  if (onShallow) {
    boat.vx *= Math.pow(0.82, dt * 60);
    boat.vy *= Math.pow(0.82, dt * 60);
  }

  boat.x += boat.vx * dt * speedMul;
  boat.y += boat.vy * dt * speedMul;
  boat.speed = Math.sqrt(boat.vx * boat.vx + boat.vy * boat.vy) * speedMul;

  // Clamp to map
  if (boat.x < 30) { boat.x = 30; boat.vx = 0; }
  if (boat.x > MAP_W - 30) { boat.x = MAP_W - 30; boat.vx = 0; }
  if (boat.y < COAST_TOP + 20) { boat.y = COAST_TOP + 20; boat.vy = 0; }
  if (boat.y > COAST_BOTTOM - 20) { boat.y = COAST_BOTTOM - 20; boat.vy = 0; }

  boat.hupenCooldown = Math.max(0, boat.hupenCooldown - dt);
  boat.trampelnCooldown = Math.max(0, boat.trampelnCooldown - dt);
  boat.ramCooldown = Math.max(0, boat.ramCooldown - dt);
  boat.trampelnStamina = Math.min(TRAMPELN_STAMINA_MAX, boat.trampelnStamina + TRAMPELN_REGEN * dt);
}

function applyPush(whale: Whale, srcX: number, srcY: number, radius: number, strength: number) {
  const dx = whale.x - srcX;
  const dy = whale.y - srcY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > radius || dist < 0.01) return;
  const falloff = 1 - dist / radius;
  // When stranded the whale resists pushing - needs persistent coordinated effort
  const stuckMul = whale.state === 'stranded' ? 0.5 : 1;
  const f = strength * falloff * 160 * stuckMul;
  whale.x += (dx / dist) * f * 0.016;
  whale.y += (dy / dist) * f * 0.016;
  // nudge heading to push direction
  whale.wanderHeading = Math.atan2(dy, dx);
}

function updateWhale(state: GameState, dt: number) {
  const w = state.whale;
  if (w.state === 'dead') return;

  w.wanderTimer -= dt;
  if (w.wanderTimer <= 0) {
    w.wanderTimer = 3 + Math.random() * 2;
    // westward bias initially, but drifts toward current heading
    w.wanderHeading += (Math.random() - 0.5) * 0.5;
  }

  // Instinctive sandbank avoidance: look-ahead; if water ahead would be shallow, steer away
  if (w.state !== 'stranded' && w.state !== 'dead') {
    const lookDist = 75;
    const ax = w.x + Math.cos(w.wanderHeading) * lookDist;
    const ay = w.y + Math.sin(w.wanderHeading) * lookDist;
    const aheadHit = anySandbank(ax, ay);
    if (aheadHit) {
      // Try left and right and pick the clearer side
      const left = w.wanderHeading - 0.9;
      const right = w.wanderHeading + 0.9;
      const lx = w.x + Math.cos(left) * lookDist;
      const ly = w.y + Math.sin(left) * lookDist;
      const rx = w.x + Math.cos(right) * lookDist;
      const ry = w.y + Math.sin(right) * lookDist;
      const leftBlocked = !!anySandbank(lx, ly);
      const rightBlocked = !!anySandbank(rx, ry);
      if (!leftBlocked && rightBlocked) w.wanderHeading = left;
      else if (!rightBlocked && leftBlocked) w.wanderHeading = right;
      else w.wanderHeading += (Math.random() < 0.5 ? -1 : 1) * 0.9;
    }
  }

  const hpMul = w.hp < 10 ? 0 : w.hp < 30 ? 0.5 : 1;
  const baseSpeed = 28 * hpMul;

  const shallow = anySandbank(w.x, w.y);
  if (shallow) {
    w.state = 'stranded';
    w.strandTimer += dt;
    // Ramped damage: grace period first, then slowly worsens. Starts at 0, up to ~2.2 HP/s
    const dmgPerSec = Math.max(0, Math.min(2.2, (w.strandTimer - 2) * 0.5));
    w.hp -= dt * dmgPerSec;
  } else {
    w.state = w.hp <= 0 ? 'dead' : w.hp < 15 ? 'dying' : 'swimming';
    w.strandTimer = 0;
  }

  if (w.state === 'swimming' || w.state === 'dying') {
    w.heading += (w.wanderHeading - w.heading) * dt * 0.8;
    w.x += Math.cos(w.heading) * baseSpeed * dt;
    w.y += Math.sin(w.heading) * baseSpeed * dt;
  }

  // clamp whale to water
  if (w.x < 60) { w.x = 60; w.wanderHeading = 0; }
  if (w.x > MAP_W - 60) { w.x = MAP_W - 60; w.wanderHeading = Math.PI; }
  if (w.y < COAST_TOP + 50) { w.y = COAST_TOP + 50; w.wanderHeading = Math.PI / 2; }
  if (w.y > COAST_BOTTOM - 50) { w.y = COAST_BOTTOM - 50; w.wanderHeading = -Math.PI / 2; }

  // Heal in bagger-rinne
  if (pointInHealZone(w.x, w.y)) {
    w.healCooldown -= dt;
    if (w.healCooldown <= 0) {
      w.hp = Math.min(WHALE_MAX_HP, w.hp + 1.5 * dt * 3);
    }
  }

  // Barge win
  const b = state.barge;
  const inBarge = w.x >= b.x && w.x <= b.x + b.w && w.y >= b.y && w.y <= b.y + b.h;
  if (inBarge) {
    w.bargeTimer += dt;
  } else {
    w.bargeTimer = Math.max(0, w.bargeTimer - dt * 0.5);
  }

  // Boat collisions + actions
  for (const p of Object.values(state.players)) {
    if (!p.boat.alive) continue;
    const dx = w.x - p.boat.x;
    const dy = w.y - p.boat.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < WHALE_RADIUS + BOAT_RADIUS && p.boat.ramCooldown <= 0) {
      const speedFactor = 0.5 + Math.min(1, p.boat.speed / BOAT_MAX_SPEED);
      w.hp -= 5 * speedFactor;
      p.boat.stats.rams += 1;
      p.boat.ramCooldown = 1;
      // push whale away
      const f = 80;
      if (dist > 0.01) {
        w.x += (dx / dist) * f * dt;
        w.y += (dy / dist) * f * dt;
      }
    }
    if (p.input.hupen && p.boat.hupenCooldown <= 0) {
      p.boat.hupenCooldown = 3;
      p.boat.stats.hupen += 1;
      const speedMul = 1 + Math.min(1, p.boat.speed / BOAT_MAX_SPEED) * 0.5;
      applyPush(w, p.boat.x, p.boat.y, 230, 1.0 * speedMul);
      state.fx.push({ id: fxIdCounter++, kind: 'hupen', x: p.boat.x, y: p.boat.y, t: performance.now() / 1000 });
    }
    if (p.input.trampeln && p.boat.trampelnCooldown <= 0 && p.boat.trampelnStamina >= 1) {
      p.boat.trampelnCooldown = 1;
      p.boat.stats.trampeln += 1;
      const stamFrac = Math.max(0.15, p.boat.trampelnStamina / TRAMPELN_STAMINA_MAX);
      p.boat.trampelnStamina = Math.max(0, p.boat.trampelnStamina - TRAMPELN_COST);
      const speedMul = 1 + Math.min(1, p.boat.speed / BOAT_MAX_SPEED) * 0.5;
      applyPush(w, p.boat.x, p.boat.y, 380 * (0.5 + 0.5 * stamFrac), 0.4 * speedMul * stamFrac);
      state.fx.push({ id: fxIdCounter++, kind: 'trampeln', x: p.boat.x, y: p.boat.y, t: performance.now() / 1000 });
    }
    if (pointInHealZone(w.x, w.y)) {
      p.boat.stats.healTime += dt;
    }
  }

  w.hp = Math.max(0, Math.min(WHALE_MAX_HP, w.hp));
}

function updateBargeDrift(state: GameState, dt: number, now: number) {
  const d = state.bargeDrift;
  if (d.nextDriftAt === 0) {
    d.nextDriftAt = now + BARGE_DRIFT_INTERVAL;
  }
  if (now >= d.nextDriftAt && now >= d.driftingUntil) {
    // Start a new drift
    const angle = Math.random() * Math.PI * 2;
    const speed = 12 + Math.random() * 10;
    d.vx = Math.cos(angle) * speed;
    d.vy = Math.sin(angle) * speed * 0.6;
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
    // Keep barge within the lower-right quadrant-ish area
    const minX = MAP_W * 0.55;
    const maxX = MAP_W - b.w - 20;
    const minY = MAP_H * 0.25;
    const maxY = MAP_H - b.h - 40;
    if (b.x < minX) { b.x = minX; d.vx = Math.abs(d.vx); }
    if (b.x > maxX) { b.x = maxX; d.vx = -Math.abs(d.vx); }
    if (b.y < minY) { b.y = minY; d.vy = Math.abs(d.vy); }
    if (b.y > maxY) { b.y = maxY; d.vy = -Math.abs(d.vy); }
  }
}

export function stepSimulation(state: GameState, dt: number, now: number): GameState {
  if (state.phase === 'ended' || state.phase === 'lobby' || state.phase === 'starting' || state.phase === 'ready') return state;

  if (state.phase === 'voting') {
    // Vote ends?
    if (now >= state.vote.endsAt) {
      resolveVote(state);
    }
    return state;
  }

  // Prune old fx (>2s)
  const fxCutoff = performance.now() / 1000 - 2;
  if (state.fx.length > 0) state.fx = state.fx.filter((f) => f.t > fxCutoff);

  // Day progression
  state.dayProgress += dt;
  if (state.dayProgress >= state.dayLength) {
    state.dayProgress = 0;
    state.day += 1;
    if (state.day > state.maxDays) {
      endMatch(state, 'imposter', 'timeout');
      return state;
    }
  }

  // Update boats
  for (const p of Object.values(state.players)) {
    if (p.connected) updateBoat(p.boat, p.input, dt);
  }

  updateWhale(state, dt);
  updateBargeDrift(state, dt, now);

  // Win / loss checks
  if (state.whale.hp <= 0 && state.whale.state !== 'dead') {
    state.whale.state = 'dead';
    endMatch(state, 'imposter', 'whale_died');
    return state;
  }

  if (state.whale.bargeTimer >= 3) {
    endMatch(state, 'rescuers', 'barge');
    return state;
  }

  return state;
}

export function endMatch(state: GameState, winner: 'rescuers' | 'imposter', reason: GameState['ended'] extends infer E ? E extends { reason: infer R } ? R : never : never) {
  if (state.ended) return;
  const imposterId = (state as any)._imposterId as string | undefined;
  let imposterCharacter: CharacterId = 'hilse';
  let imposterName = '';
  if (imposterId && state.players[imposterId]) {
    imposterCharacter = state.players[imposterId].characterId;
    imposterName = state.players[imposterId].name;
  }
  state.ended = {
    winner,
    reason,
    imposterId: imposterId ?? '',
    imposterCharacter,
    imposterName,
  };
  state.phase = 'ended';
}

export function startVote(state: GameState, callerId: string, now: number) {
  if (state.vote.active || state.phase !== 'playing') return;
  const caller = state.players[callerId];
  if (!caller || caller.pressConferenceUsed) return;
  caller.pressConferenceUsed = true;
  state.phase = 'voting';
  state.vote = {
    active: true,
    calledBy: callerId,
    calledByCharacter: caller.characterId,
    endsAt: now + 30,
    votes: {},
  };
}

export function castVote(state: GameState, voterId: string, targetId: string) {
  if (!state.vote.active) return;
  if (!state.players[voterId]?.boat.alive) return;
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
    const imposterId = (state as any)._imposterId as string | undefined;
    if (ejected === imposterId) {
      state.vote.active = false;
      endMatch(state, 'rescuers', 'imposter_voted');
      return;
    } else if (state.players[ejected]) {
      state.players[ejected].boat.alive = false;
      state.bannerMessage = `${state.players[ejected].name} wurde zurückgetreten!`;
      state.bannerUntil = performance.now() / 1000 + 4;
    }
  } else {
    state.bannerMessage = 'Keine Mehrheit. Wir haben Tag und Nacht gearbeitet.';
    state.bannerUntil = performance.now() / 1000 + 4;
  }
  state.vote = { active: false, calledBy: '', calledByCharacter: null, endsAt: 0, votes: {} };
  state.phase = 'playing';
}
