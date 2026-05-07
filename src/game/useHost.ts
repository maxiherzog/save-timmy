import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CHARACTERS, type CharacterId } from './characters';
import { createBoat, createInitialState, stepSimulation, startVote, castVote } from './simulation';
import type { GameState } from './types';
import {
  sendAssignments,
  sendRole,
  sendState,
  sendEvent,
  subscribeRoom,
  type NetEvent,
} from './net';

// BROADCAST_HZ is no longer used, the game loop broadcasts every frame.

export function useHost(code: string, hostToken: string, imposterCount: number = 1, testMode: boolean = false) {
  const [state, setState] = useState<GameState | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const chRef = useRef<ReturnType<typeof subscribeRoom> | null>(null);
  const runningRef = useRef(false);

  // Helper to mutate state and increment version
  const mutate = (fn: (s: GameState) => void, broadcast = false) => {
    const s = stateRef.current;
    if (!s) return;
    fn(s);
    s.version = (s.version || 0) + 1;
    setState({ ...s });
    if (broadcast && chRef.current) {
      sendState(chRef.current, s).catch(() => {});
    }
  };

  useEffect(() => {
    if (!code) return;
    const init = createInitialState(code, imposterCount);
    stateRef.current = init;
    setState({ ...init });

    const ch = subscribeRoom(code, {
      onEvent: (e) => handleEvent(e),
    });
    chRef.current = ch;

    if (testMode) {
      handleEvent({ type: 'join', playerId: 'dummy-1', name: 'Dummy' });
      handleEvent({ type: 'join', playerId: 'dummy-2', name: 'Dummy 2' });
      // Wait a bit to ensure they are registered, then start
      setTimeout(() => {
        if (stateRef.current?.phase === 'lobby') {
          startMatch(imposterCount);
          setTimeout(() => {
            if (stateRef.current) {
              for (const p of Object.values(stateRef.current.players)) {
                mutate((s) => {
                  const player = s.players[p.id];
                  if (player) player.ready = true;
                });
              }
              checkAllReady();
            }
          }, 4000); // Wait for starting phase to finish
        }
      }, 500);
    }

    async function ensureRoom() {
      await supabase
        .from('rooms')
        .upsert({ code, state: 'lobby', host_token: hostToken }, { onConflict: 'code' });
    }
    ensureRoom();

    let last = performance.now();
    let frame: number;

    function loop() {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      mutate((s) => {
        const nowSec = now / 1000;
        for (const p of Object.values(s.players)) {
          if (p.connected && nowSec - p.lastSeen > 5) p.connected = false;
          if (nowSec - p.lastSeen > 30) delete s.players[p.id];
        }
        stepSimulation(s, dt, nowSec);
      }, true);

      frame = requestAnimationFrame(loop);
    }
    runningRef.current = true;
    frame = requestAnimationFrame(loop);

    return () => {
      runningRef.current = false;
      cancelAnimationFrame(frame);
      if (chRef.current) supabase.removeChannel(chRef.current);
    };
  }, [code, hostToken, imposterCount, testMode]);

  const handleEvent = (e: NetEvent) => {
    mutate((s) => {
      const now = performance.now() / 1000;
      if (e.type === 'join') {
        console.log(`[Host] received join event from ${e.playerId} (${e.name})`);
        if (s.phase !== 'lobby') return;
        if (s.players[e.playerId]) {
          s.players[e.playerId].connected = true;
          s.players[e.playerId].lastSeen = now;
          s.players[e.playerId].name = e.name;
        } else if (Object.keys(s.players).length < 8) {
          const idx = Object.keys(s.players).length;
          s.players[e.playerId] = {
            id: e.playerId, name: e.name, characterId: 'hilse', boat: createBoat(idx, 8),
            input: { joystickX: 0, joystickY: 0, hupen: false, trampeln: false },
            pressConferenceUsed: false, ready: false, connected: true, lastSeen: now, ping: 0,
          };
        }
      } else if (e.type === 'leave') {
        if (s.players[e.playerId]) s.players[e.playerId].connected = false;
      } else if (e.type === 'input') {
        const p = s.players[e.playerId];
        if (p) {
          p.input = e.input;
          p.ping = e.ping;
          p.lastSeen = now;
          p.connected = true;
        }
      } else if (e.type === 'request-state') {
        if (chRef.current) sendState(chRef.current, s, true).catch(() => {});
      } else if (e.type === 'press-conference') {
        startVote(s, e.playerId, now);
      } else if (e.type === 'vote') {
        castVote(s, e.playerId, e.targetId);
      } else if (e.type === 'start' && e.token === hostToken) {
        if (s.phase === 'lobby') startMatch(s.impostersCount);
      } else if (e.type === 'rematch' && e.token === hostToken) {
        resetToLobby();
      } else if (e.type === 'ready') {
        const p = s.players[e.playerId];
        if (p && (s.phase === 'starting' || s.phase === 'ready')) {
          p.ready = true;
          checkAllReady();
        }
      } else if (e.type === 'ping') {
        if (chRef.current) sendEvent(chRef.current, { type: 'pong', playerId: e.playerId, t: e.t }).catch(() => {});
      }
    }, true);
  };

  const startMatch = (imposterCount: number) => {
    const s = stateRef.current;
    if (!s || s.phase !== 'lobby') return;
    const players = Object.values(s.players).filter((p) => p.connected);
    if (players.length < 2) return;

    const assignments: { playerId: string; characterId: CharacterId }[] = [];
    mutate((s) => {
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      const imposters = shuffledPlayers.slice(0, imposterCount);
      const shuffledCharacters = [...CHARACTERS].sort(() => Math.random() - 0.5);
      
      players.forEach((p, i) => {
        p.characterId = shuffledCharacters[i % shuffledCharacters.length].id;
        p.boat = createBoat(i, players.length);
        p.pressConferenceUsed = false;
        assignments.push({ playerId: p.id, characterId: p.characterId });
      });

      (s as any)._imposterIds = imposters.map(imp => imp.id);
      for (const p of Object.values(s.players)) p.ready = false;
      s.phase = 'starting';
    }, true);

    if (chRef.current) sendAssignments(chRef.current, assignments);
    const updatedState = stateRef.current!;
    for (const p of players) {
      const role = (updatedState as any)._imposterIds.includes(p.id) ? 'imposter' : 'rescuer';
      sendRole(updatedState.code, p.id, { type: 'role', role, character: p.characterId }).catch(() => {});
    }

    setTimeout(() => {
      mutate((s) => {
        if (s.phase === 'starting') s.phase = 'ready';
      }, true);
    }, 3500);
  };

  const checkAllReady = () => {
    mutate((s) => {
      if (s.phase !== 'ready') return;
      const connected = Object.values(s.players).filter((p) => p.connected);
      if (connected.length > 0 && connected.every((p) => p.ready)) {
        s.phase = 'countdown';
        s.countdownUntil = performance.now() / 1000 + 3;
      }
    }, true);
  };

  const resetToLobby = () => {
    const old = stateRef.current;
    if (!old) return;
    const fresh = createInitialState(code, old.impostersCount);
    for (const [id, p] of Object.entries(old.players)) {
      fresh.players[id] = {
        ...p,
        boat: createBoat(Object.keys(fresh.players).length, 8),
        input: { joystickX: 0, joystickY: 0, hupen: false, trampeln: false },
        pressConferenceUsed: false,
        ping: 0,
        ready: false,
      };
    }
    stateRef.current = fresh;
    mutate(() => {}, true);
    supabase.from('rooms').update({ state: 'lobby', ended_at: null }).eq('code', code);
  };

  useEffect(() => {
    const ended = state?.ended;
    if (!ended || !state) return;
    (async () => {
      const statsObj: Record<string, unknown> = {};
      for (const p of Object.values(stateRef.current?.players || {})) {
        statsObj[p.id] = {
          name: p.name,
          character: p.characterId,
          ...p.boat.stats,
        };
      }
      await supabase.from('match_results').insert({
        room_code: code,
        winner: ended.winner,
        reason: ended.reason,
        imposter_characters: ended.imposterCharacters,
        imposter_names: ended.imposterNames,
        whale_hp_final: Math.round(state.whale.hp),
        stats: statsObj,
      });
      await supabase
        .from('rooms')
        .update({
          state: 'ended',
          imposter_characters: ended.imposterCharacters,
          ended_at: new Date().toISOString(),
        })
        .eq('code', code);
    })();
  }, [state?.ended, code]);

  return { state, startMatch, rematch: resetToLobby };
}
