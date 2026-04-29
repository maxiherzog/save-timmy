import { playCrashSound, playWhaleSound } from './audio';
import type { CharacterId } from './characters';
import { createMap, HEAL_ZONES, BARGE, anySandbank, pointInHealZone } from './map';
import type { GameState, PlayerInput, Whale, Boat } from './types';
import { MAP_W, MAP_H, DAY_LENGTH, MAX_DAYS, WHALE_MAX_HP, TRAMPELN_STAMINA_MAX, TRAMPELN_COST, TRAMPELN_REGEN, BARGE_DRIFT_INTERVAL, BARGE_DRIFT_DURATION } from './types';

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
  const seed = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const sandbanks = createMap(seed);
  return {
    code,
    phase: 'lobby',
    day: 1,
    dayProgress: 0,
    dayLength: DAY_LENGTH,
    maxDays: MAX_DAYS,
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

const BOAT_ACCEL = 260;
const BOAT_MAX_SPEED = 170;
const BOAT_MIN_SPEED = 20;
const BOAT_FRICTION = 0.94;
const BOAT_RADIUS = 22;
const WHALE_RADIUS = 34;

function updateBoat(p: { id: string, boat: Boat }, input: PlayerInput, dt: number, state: GameState) {
  const { boat } = p;
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

  const onShallow = anySandbank(state.sandbanks, boat.x, boat.y);
  if (onShallow && boat.ramCooldown <= 0 && speed > 80) {
    boat.ramCooldown = 0.8;
    state.fx.push({ id: fxIdCounter++, kind: 'crash', x: boat.x, y: boat.y, t: performance.now() / 1000 });
    playCrashSound(speed / BOAT_MAX_SPEED);
    boat.vx *= -0.4;
    boat.vy *= -0.4;
  }
  const speedMul = onShallow ? 0.35 : 1;
  if (onShallow && speed > BOAT_MIN_SPEED) {
    boat.vx *= Math.pow(0.9, dt * 60);
    boat.vy *= Math.pow(0.9, dt * 60);
  }

  boat.x += boat.vx * dt * speedMul;
  boat.y += boat.vy * dt * speedMul;
  boat.speed = Math.sqrt(boat.vx * boat.vx + boat.vy * boat.vy) * speedMul;

  if (boat.x < 30) { boat.x = 30; boat.vx = 0; }
  if (boat.x > MAP_W - 30) { boat.x = MAP_W - 30; boat.vx = 0; }
  if (boat.y < 30) { boat.y = 30; boat.vy = 0; }
  if (boat.y > MAP_H - 30) { boat.y = MAP_H - 30; boat.vy = 0; }

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
  const stuckMul = whale.state === 'stranded' ? 0.5 : 1;
  const f = strength * falloff * 160 * stuckMul;
  whale.x += (dx / dist) * f * 0.016;
  whale.y += (dy / dist) * f * 0.016;
  whale.wanderHeading = Math.atan2(dy, dx);
}

function updateWhale(state: GameState, dt: number) {
  const w = state.whale;
  if (w.state === 'dead') return;

  w.soundCooldown -= dt;
  if (w.soundCooldown <= 0) {
    w.soundCooldown = 8 + Math.random() * 10;
    playWhaleSound(0.5 + w.hp / WHALE_MAX_HP * 0.5);
  }

  w.wanderTimer -= dt;
  if (w.wanderTimer <= 0) {
    w.wanderTimer = 3 + Math.random() * 2;
    w.wanderHeading += (Math.random() - 0.5) * 0.5;
  }

  if (w.state !== 'stranded') {
    const lookDist = 75;
    const ax = w.x + Math.cos(w.wanderHeading) * lookDist;
    const ay = w.y + Math.sin(w.wanderHeading) * lookDist;
    if (anySandbank(state.sandbanks, ax, ay)) {
      w.wanderHeading += (Math.random() < 0.5 ? -1 : 1) * 0.9;
    }
  }

  const hpMul = w.hp < 10 ? 0 : w.hp < 30 ? 0.5 : 1;
  const baseSpeed = 28 * hpMul;

  const shallow = anySandbank(state.sandbanks, w.x, w.y);
  if (shallow) {
    w.state = 'stranded';
    w.strandTimer += dt;
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

  if (w.x < 60) { w.x = 60; w.wanderHeading = 0; }
  if (w.x > MAP_W - 60) { w.x = MAP_W - 60; w.wanderHeading = Math.PI; }
  if (w.y < 60) { w.y = 60; w.wanderHeading = Math.PI / 2; }
  if (w.y > MAP_H - 60) { w.y = MAP_H - 60; w.wanderHeading = -Math.PI / 2; }

  if (pointInHealZone(w.x, w.y)) {
    w.healCooldown -= dt;
    if (w.healCooldown <= 0) {
      w.hp = Math.min(WHALE_MAX_HP, w.hp + 1.5 * dt * 3);
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
    if (dist < WHALE_RADIUS + BOAT_RADIUS && p.boat.ramCooldown <= 0) {
      const speedFactor = 0.5 + Math.min(1, p.boat.speed / BOAT_MAX_SPEED);
      w.hp -= 5 * speedFactor;
      p.boat.stats.rams += 1;
      p.boat.ramCooldown = 1;
      if (dist > 0.01) {
        w.x += (dx / dist) * 80 * dt;
        w.y += (dy / dist) * 80 * dt;
      }
    }
    if (p.input.hupen && p.boat.hupenCooldown <= 0) {
      p.boat.hupenCooldown = 3;
      p.boat.stats.hupen += 1;
      applyPush(w, p.boat.x, p.boat.y, 230, 1.0);
      state.fx.push({ id: fxIdCounter++, kind: 'hupen', x: p.boat.x, y: p.boat.y, t: performance.now() / 1000 });
    }
    if (p.input.trampeln && p.boat.trampelnCooldown <= 0 && p.boat.trampelnStamina >= 1) {
      p.boat.trampelnCooldown = 1;
      p.boat.stats.trampeln += 1;
      const stamFrac = Math.max(0.15, p.boat.trampelnStamina / TRAMPELN_STAMINA_MAX);
      p.boat.trampelnStamina = Math.max(0, p.boat.trampelnStamina - TRAMPELN_COST);
      applyPush(w, p.boat.x, p.boat.y, 380 * (0.5 + 0.5 * stamFrac), 0.4 * stamFrac);
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
  if (state.phase === 'voting' && state.vote.active && now >= state.vote.endsAt) {
    resolveVote(state);
  }

  if (state.phase !== 'playing') return state;

  const fxCutoff = now - 2;
  if (state.fx.length > 0) state.fx = state.fx.filter((f) => f.t > fxCutoff);

  state.dayProgress += dt;
  if (state.dayProgress >= state.dayLength) {
    state.dayProgress = 0;
    state.day += 1;
    if (state.day > state.maxDays) {
      endMatch(state, 'imposter', 'timeout');
      return state;
    }
  }

  const players = Object.values(state.players);
  for (const p of players) {
    if (p.connected) updateBoat(p, p.input, dt, state);
  }

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i], p2 = players[j];
      if (!p1.boat.alive || !p2.boat.alive || p1.boat.ramCooldown > 0.5 || p2.boat.ramCooldown > 0.5) continue;
      const dx = p1.boat.x - p2.boat.x, dy = p1.boat.y - p2.boat.y;
      if (dx * dx + dy * dy < (BOAT_RADIUS * 2) ** 2) {
        playCrashSound(1);
        state.fx.push({ id: fxIdCounter++, kind: 'crash', x: (p1.boat.x + p2.boat.x) / 2, y: (p1.boat.y + p2.boat.y) / 2, t: now });
        p1.boat.ramCooldown = 1; p2.boat.ramCooldown = 1;
        const speed1 = Math.sqrt(p1.boat.vx ** 2 + p1.boat.vy ** 2);
        const speed2 = Math.sqrt(p2.boat.vx ** 2 + p2.boat.vy ** 2);
        if (speed1 > 30) { p2.boat.vx += p1.boat.vx * 0.4; p2.boat.vy += p1.boat.vy * 0.4; }
        if (speed2 > 30) { p1.boat.vx += p2.boat.vx * 0.4; p1.boat.vy += p2.boat.vy * 0.4; }
      }
    }
  }

  updateWhale(state, dt);
  updateBargeDrift(state, dt, now);

  if (state.whale.hp <= 0 && state.whale.state !== 'dead') {
    state.whale.state = 'dead';
    endMatch(state, 'imposter', 'whale_died');
  } else if (state.whale.bargeTimer >= 3) {
    endMatch(state, 'rescuers', 'barge');
  }
  return state;
}

export function endMatch(state: GameState, winner: 'rescuers' | 'imposter', reason: any) {
  if (state.ended) return;
  const imposterId = (state as any)._imposterId as string | undefined;
  let imposterCharacter: CharacterId = 'hilse', imposterName = '';
  if (imposterId && state.players[imposterId]) {
    imposterCharacter = state.players[imposterId].characterId;
    imposterName = state.players[imposterId].name;
  }
  state.ended = { winner, reason, imposterId: imposterId ?? '', imposterCharacter, imposterName };
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
      endMatch(state, 'rescuers', 'imposter_voted');
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
