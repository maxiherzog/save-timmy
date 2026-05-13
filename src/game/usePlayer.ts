import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CharacterId } from './characters';
import type { GameState, PlayerInput } from './types';
import {
  sendEvent,
  subscribePrivate,
  subscribeRoom,
  type SecretRole,
} from './net';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Add a type for the channel with state
type ChannelWithState = RealtimeChannel & { state: string };

export function usePlayer(code: string, playerId: string, name: string) {
  const [state, setState] = useState<GameState | null>(null);
  const [role, setRole] = useState<SecretRole | null>(null);
  const [assignments, setAssignments] = useState<Record<string, CharacterId>>({});
  const [ping, setPing] = useState<number>(0);
  const pingRef = useRef(ping);
  useEffect(() => {
    pingRef.current = ping;
  }, [ping]);

  const chRef = useRef<ChannelWithState | null>(null);
  const privateRef = useRef<ReturnType<typeof subscribePrivate> | null>(null);
  const inputRef = useRef<PlayerInput>({ joystickX: 0, joystickY: 0, hupen: false, trampeln: false });

  useEffect(() => {
    if (!code || !playerId || !name) return;

    const ch = subscribeRoom(code, {
      onEvent: (e) => {
        if (e.type === 'pong' && e.playerId === playerId) {
          setPing(performance.now() - e.t);
        }
        if (e.type === 'press-conference-started') {
          if (chRef.current) sendEvent(chRef.current, { type: 'request-state', playerId }).catch(() => {});
        }
      },
      onState: (msg) => setState(msg.state as GameState),
      onAssignments: (list) => {
        const map: Record<string, CharacterId> = {};
        for (const a of list) map[a.playerId] = a.characterId;
        setAssignments(map);
      },
    }) as ChannelWithState;
    chRef.current = ch;

    const priv = subscribePrivate(code, playerId, (r) => setRole(r));
    privateRef.current = priv;

    // Announce join after channel subscribes
    const announce = setInterval(() => {
      if (ch.state === 'joined') {
        sendEvent(ch, { type: 'join', playerId, name }).catch(() => {});
        sendEvent(ch, { type: 'request-state', playerId }).catch(() => {});
        clearInterval(announce);
      }
    }, 200);

    // Heartbeat input
    const heartbeat = setInterval(() => {
      if (chRef.current) {
        sendEvent(chRef.current, { type: 'input', playerId, input: { ...inputRef.current }, ping: pingRef.current }).catch(() => {});
      }
    }, 100);

    // Ping loop
    const pingLoop = setInterval(() => {
      if (chRef.current && chRef.current.state === 'joined') {
        sendEvent(chRef.current, { type: 'ping', playerId, t: performance.now() }).catch(() => {});
      }
    }, 1000);

    return () => {
      clearInterval(announce);
      clearInterval(heartbeat);
      clearInterval(pingLoop);
      if (chRef.current) {
        sendEvent(chRef.current, { type: 'leave', playerId }).catch(() => {});
        supabase.removeChannel(chRef.current);
      }
      if (privateRef.current) supabase.removeChannel(privateRef.current);
    };
  }, [code, playerId, name]);

  function setInput(input: Partial<PlayerInput>) {
    inputRef.current = { ...inputRef.current, ...input };
  }

  function pressConference() {
    if (chRef.current) sendEvent(chRef.current, { type: 'press-conference', playerId }).catch(() => {});
  }

  function vote(targetId: string) {
    if (chRef.current) sendEvent(chRef.current, { type: 'vote', playerId, targetId }).catch(() => {});
  }

  function ready() {
    if (chRef.current) sendEvent(chRef.current, { type: 'ready', playerId }).catch(() => {});
  }

  return { state, role, assignments, ping, setInput, pressConference, vote, ready };
}
