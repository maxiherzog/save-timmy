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

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';
export type { ConnectionStatus };

export function usePlayer(code: string, playerId: string, name: string) {
  const [state, setState] = useState<GameState | null>(null);
  const [role, setRole] = useState<SecretRole | null>(null);
  const [assignments, setAssignments] = useState<Record<string, CharacterId>>({});
  const [ping, setPing] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const lastStateVersion = useRef(0);
  const pingRef = useRef(ping);
  useEffect(() => {
    pingRef.current = ping;
  }, [ping]);

  const chRef = useRef<ReturnType<typeof subscribeRoom> | null>(null);
  const privateRef = useRef<ReturnType<typeof subscribePrivate> | null>(null);
  const inputRef = useRef<PlayerInput>({ joystickX: 0, joystickY: 0, hupen: false, trampeln: false });
  const reconTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!code || !playerId || !name) return;

    function connect(attempt = 0) {
      console.log(`[Player ${playerId}] connect() called, attempt #${attempt}`);
      if (reconTimer.current) clearTimeout(reconTimer.current);
      if (chRef.current) supabase.removeChannel(chRef.current);
      if (privateRef.current) supabase.removeChannel(privateRef.current);

      setConnectionStatus('connecting');

      const ch = subscribeRoom(code, {
        onEvent: (e) => {
          if (e.type === 'pong' && e.playerId === playerId) {
            setPing(performance.now() - e.t);
          }
        },
        onState: (msg) => {
          const newState = msg.state as GameState;
          if (lastStateVersion.current !== 0 && newState.version < lastStateVersion.current) return;
          if (lastStateVersion.current !== 0 && newState.version > lastStateVersion.current + 1) {
            sendEvent(ch, { type: 'request-state', playerId }).catch(() => {});
          }
          setState(newState);
          lastStateVersion.current = newState.version;
        },
        onAssignments: (list) => {
          const map: Record<string, CharacterId> = {};
          for (const a of list) map[a.playerId] = a.characterId;
          setAssignments(map);
        },
      });

      ch.on('system', {}, (payload) => {
        if (payload.status === 'error') {
          setConnectionStatus('disconnected');
        }
      });
      
      ch.subscribe((status) => {
        console.log(`[Player ${playerId}] subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          sendEvent(ch, { type: 'join', playerId, name }).catch(() => {});
          sendEvent(ch, { type: 'request-state', playerId }).catch(() => {});
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
          setConnectionStatus('disconnected');
          const delay = Math.min(30000, 1000 * Math.pow(2, attempt)); // Exponential backoff
          console.log(`[Player ${playerId}] disconnected, retrying in ${delay}ms...`);
          reconTimer.current = window.setTimeout(() => connect(attempt + 1), delay);
        }
      });
      
      chRef.current = ch;

      const priv = subscribePrivate(code, playerId, (r) => setRole(r));
      priv.subscribe();
      privateRef.current = priv;
    }
    
    connect();

    // Heartbeat input
    const heartbeat = setInterval(() => {
      if (chRef.current && chRef.current.state === 'joined') {
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
      if (reconTimer.current) clearTimeout(reconTimer.current);
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

  return { state, role, assignments, ping, setInput, pressConference, vote, ready, connectionStatus };
}

