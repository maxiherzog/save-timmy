import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { GameState, PlayerInput } from './types';
import type { CharacterId } from './characters';

// Channel naming
export const roomChannelName = (code: string) => `room-${code}`;
export const playerChannelName = (code: string, playerId: string) => `player-${code}-${playerId}`;

export type NetEvent =
  | { type: 'join'; playerId: string; name: string }
  | { type: 'leave'; playerId: string }
  | { type: 'input'; playerId: string; input: PlayerInput }
  | { type: 'start'; token: string }
  | { type: 'press-conference'; playerId: string }
  | { type: 'vote'; playerId: string; targetId: string }
  | { type: 'request-state'; playerId: string }
  | { type: 'rematch'; token: string }
  | { type: 'ready'; playerId: string }
  | { type: 'ping'; playerId: string; t: number }
  | { type: 'pong'; playerId: string; t: number };

export type BroadcastState = {
  type: 'state';
  state: Omit<GameState, '_imposterId'>;
};

export type SecretRole = {
  type: 'role';
  role: 'imposter' | 'rescuer';
  character: CharacterId;
};

export function subscribeRoom(
  code: string,
  handlers: {
    onEvent?: (e: NetEvent) => void;
    onState?: (s: BroadcastState) => void;
    onAssignments?: (a: { playerId: string; characterId: CharacterId }[]) => void;
  }
): RealtimeChannel {
  const ch = supabase.channel(roomChannelName(code), {
    config: { broadcast: { self: false, ack: false } },
  });
  if (handlers.onEvent) {
    ch.on('broadcast', { event: 'event' }, (msg) => handlers.onEvent!(msg.payload as NetEvent));
  }
  if (handlers.onState) {
    ch.on('broadcast', { event: 'state' }, (msg) => handlers.onState!(msg.payload as BroadcastState));
  }
  if (handlers.onAssignments) {
    ch.on('broadcast', { event: 'assignments' }, (msg) =>
      handlers.onAssignments!(msg.payload as { playerId: string; characterId: CharacterId }[])
    );
  }
  ch.subscribe();
  return ch;
}

export function subscribePrivate(
  code: string,
  playerId: string,
  onRole: (r: SecretRole) => void
): RealtimeChannel {
  const ch = supabase.channel(playerChannelName(code, playerId), {
    config: { broadcast: { self: false } },
  });
  ch.on('broadcast', { event: 'role' }, (msg) => onRole(msg.payload as SecretRole));
  ch.subscribe();
  return ch;
}

export async function sendEvent(ch: RealtimeChannel, e: NetEvent) {
  await ch.send({ type: 'broadcast', event: 'event', payload: e });
}

export async function sendState(ch: RealtimeChannel, state: GameState) {
  const clean = { ...state } as any;
  delete clean.sandbanks;
  delete clean.whale;
  delete clean.healZones;
  delete clean.barge;
  delete clean.fx;
  delete clean.bargeDrift;
  delete clean['_imposterIds'];

  await ch.send({ type: 'broadcast', event: 'state', payload: { type: 'state', state: clean } });
}

export async function sendAssignments(
  ch: RealtimeChannel,
  a: { playerId: string; characterId: CharacterId }[]
) {
  await ch.send({ type: 'broadcast', event: 'assignments', payload: a });
}

export async function sendRole(code: string, playerId: string, role: SecretRole) {
  const ch = supabase.channel(playerChannelName(code, playerId));
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve();
    });
  });
  await ch.send({ type: 'broadcast', event: 'role', payload: role });
  setTimeout(() => supabase.removeChannel(ch), 1500);
}
