import type { CharacterId } from './characters';

export type PlayerInput = {
  joystickX: number;
  joystickY: number;
  hupen: boolean;
  trampeln: boolean;
};

export type Boat = {
  x: number;
  y: number;
  heading: number;
  vx: number;
  vy: number;
  speed: number;
  hupenCooldown: number;
  trampelnCooldown: number;
  ramCooldown: number;
  trampelnStamina: number;
  alive: boolean;
  stats: {
    hupen: number;
    trampeln: number;
    rams: number;
    healTime: number;
  };
};

export type Whale = {
  x: number;
  y: number;
  heading: number;
  hp: number;
  state: 'swimming' | 'stranded' | 'dying' | 'dead';
  wanderHeading: number;
  wanderTimer: number;
  bargeTimer: number;
  strandTimer: number;
  healCooldown: number;
};

export type Sandbank = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  name: string;
  poly: Array<[number, number]>;
};

export type HealZone = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Barge = {
  x: number;
  y: number;
  w: number;
  h: number;
  openingY: number;
  openingSize: number;
};

export type Player = {
  id: string;
  name: string;
  characterId: CharacterId;
  boat: Boat;
  input: PlayerInput;
  pressConferenceUsed: boolean;
  ready: boolean;
  connected: boolean;
  lastSeen: number;
};

export type VoteState = {
  active: boolean;
  calledBy: string;
  calledByCharacter: CharacterId | null;
  endsAt: number;
  votes: Record<string, string>;
};

export type GameState = {
  code: string;
  phase: 'lobby' | 'starting' | 'ready' | 'playing' | 'voting' | 'ended';
  day: number;
  dayProgress: number;
  dayLength: number;
  maxDays: number;
  players: Record<string, Player>;
  whale: Whale;
  sandbanks: Sandbank[];
  healZones: HealZone[];
  barge: Barge;
  vote: VoteState;
  ended: null | {
    winner: 'rescuers' | 'imposter';
    reason: 'barge' | 'whale_died' | 'imposter_voted' | 'timeout';
    imposterId: string;
    imposterCharacter: CharacterId;
    imposterName: string;
  };
  bannerMessage: string;
  bannerUntil: number;
  fx: Array<{ id: number; kind: 'hupen' | 'trampeln'; x: number; y: number; t: number }>;
  bargeDrift: {
    nextDriftAt: number;
    driftingUntil: number;
    vx: number;
    vy: number;
  };
};

export const TRAMPELN_STAMINA_MAX = 100;
export const TRAMPELN_COST = 22;
export const TRAMPELN_REGEN = 10;

export const MAP_W = 1600;
export const MAP_H = 900;
export const DAY_LENGTH = 70;
export const MAX_DAYS = 5;
export const WHALE_MAX_HP = 65;
export const BARGE_DRIFT_INTERVAL = 45;
export const BARGE_DRIFT_DURATION = 6;
