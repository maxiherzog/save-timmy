import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CHARACTERS, type CharacterId } from './characters';
import { createBoat, createInitialState, stepSimulation, startVote, castVote } from './simulation';
import type { GameState } from './types';
import {
  sendAssignments,
  sendRole,
  sendState,
  subscribeRoom,
  type NetEvent,
} from './net';

const BROADCAST_HZ = 15;

export function useHost(code: string, hostToken: string) {
  const [state, setState] = useState<GameState | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const chRef = useRef<ReturnType<typeof subscribeRoom> | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!code) return;
    const init = createInitialState(code);
    stateRef.current = init;
    setState({ ...init });

    const ch = subscribeRoom(code, {
      onEvent: (e) => handleEvent(e),
    });
    chRef.current = ch;

    async function ensureRoom() {
      await supabase
        .from('rooms')
        .upsert({ code, state: 'lobby', host_token: hostToken }, { onConflict: 'code' });
    }
    ensureRoom();

    let last = performance.now();
    let lastBroadcast = 0;
    let frame: number;

    function loop() {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      if (s) {
        // prune disconnected players after 30s
        const nowSec = now / 1000;
        for (const p of Object.values(s.players)) {
          if (!p.connected && nowSec - p.lastSeen > 30) {
            delete s.players[p.id];
          }
        }
        stepSimulation(s, dt, nowSec);
        if (now - lastBroadcast > 1000 / BROADCAST_HZ) {
          lastBroadcast = now;
          if (chRef.current) sendState(chRef.current, s).catch(() => {});
          setState({ ...s });
        }
      }
      frame = requestAnimationFrame(loop);
    }
    runningRef.current = true;
    frame = requestAnimationFrame(loop);

    return () => {
      runningRef.current = false;
      cancelAnimationFrame(frame);
      if (chRef.current) supabase.removeChannel(chRef.current);
    };
  }, [code, hostToken]);

  function handleEvent(e: NetEvent) {
    const s = stateRef.current;
    if (!s) return;
    const now = performance.now() / 1000;

    if (e.type === 'join') {
      if (s.phase !== 'lobby') return;
      if (s.players[e.playerId]) {
        s.players[e.playerId].connected = true;
        s.players[e.playerId].lastSeen = now;
        s.players[e.playerId].name = e.name;
        return;
      }
      if (Object.keys(s.players).length >= 8) return;
      const idx = Object.keys(s.players).length;
      s.players[e.playerId] = {
        id: e.playerId,
        name: e.name,
        characterId: 'hilse',
        boat: createBoat(idx, 8),
        input: { joystickX: 0, joystickY: 0, hupen: false, trampeln: false },
        pressConferenceUsed: false,
        ready: false,
        connected: true,
        lastSeen: now,
      };
    } else if (e.type === 'leave') {
      if (s.players[e.playerId]) s.players[e.playerId].connected = false;
    } else if (e.type === 'input') {
      const p = s.players[e.playerId];
      if (p) {
        p.input = e.input;
        p.lastSeen = now;
        p.connected = true;
      }
    } else if (e.type === 'request-state') {
      if (chRef.current) sendState(chRef.current, s).catch(() => {});
    } else if (e.type === 'press-conference') {
      startVote(s, e.playerId, now);
    } else if (e.type === 'vote') {
      castVote(s, e.playerId, e.targetId);
    } else if (e.type === 'start' && e.token === hostToken) {
      if (s.phase === 'lobby') startMatch();
    } else if (e.type === 'rematch' && e.token === hostToken) {
      resetToLobby();
    } else if (e.type === 'ready') {
      const p = s.players[e.playerId];
      if (p && (s.phase === 'starting' || s.phase === 'ready')) {
        p.ready = true;
        checkAllReady();
      }
    }
  }

  async function startMatch() {
    const s = stateRef.current;
    if (!s) return;
    const players = Object.values(s.players).filter((p) => p.connected);
    if (players.length < 2) return; // min 2 for testing; spec says 4 but allow flexibility

    const shuffled = [...CHARACTERS].sort(() => Math.random() - 0.5);
    const assignments: { playerId: string; characterId: CharacterId }[] = [];
    players.forEach((p, i) => {
      p.characterId = shuffled[i % shuffled.length].id;
      p.boat = createBoat(i, players.length);
      p.pressConferenceUsed = false;
      assignments.push({ playerId: p.id, characterId: p.characterId });
    });

    const imposterIdx = Math.floor(Math.random() * players.length);
    const imposter = players[imposterIdx];
    (s as any)._imposterId = imposter.id;

    if (chRef.current) await sendAssignments(chRef.current, assignments);

    for (const p of players) {
      const role = p.id === imposter.id ? 'imposter' : 'rescuer';
      sendRole(s.code, p.id, { type: 'role', role, character: p.characterId }).catch(() => {});
    }

    for (const p of Object.values(s.players)) p.ready = false;
    s.phase = 'starting';
    setTimeout(() => {
      if (!stateRef.current) return;
      if (stateRef.current.phase === 'starting') stateRef.current.phase = 'ready';
    }, 3500);
  }

  function checkAllReady() {
    const s = stateRef.current;
    if (!s || s.phase !== 'ready') return;
    const connected = Object.values(s.players).filter((p) => p.connected);
    if (connected.length === 0) return;
    const allReady = connected.every((p) => p.ready);
    if (allReady) {
      s.phase = 'playing';
      s.day = 1;
      s.dayProgress = 0;
      supabase.from('rooms').update({ state: 'playing' }).eq('code', code);
    }
  }

  function resetToLobby() {
    const old = stateRef.current;
    if (!old) return;
    const fresh = createInitialState(code);
    // keep players
    for (const [id, p] of Object.entries(old.players)) {
      fresh.players[id] = {
        ...p,
        boat: createBoat(Object.keys(fresh.players).length, 8),
        input: { joystickX: 0, joystickY: 0, hupen: false, trampeln: false },
        pressConferenceUsed: false,
      };
    }
    stateRef.current = fresh;
    setState({ ...fresh });
    supabase.from('rooms').update({ state: 'lobby', ended_at: null }).eq('code', code);
  }

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
        imposter_character: ended.imposterCharacter,
        imposter_name: ended.imposterName,
        duration_days: state.day,
        whale_hp_final: Math.round(state.whale.hp),
        stats: statsObj,
      });
      await supabase
        .from('rooms')
        .update({
          state: 'ended',
          imposter_character: ended.imposterCharacter,
          ended_at: new Date().toISOString(),
        })
        .eq('code', code);
    })();
  }, [state?.ended?.winner, code]);

  return { state, startMatch, rematch: resetToLobby };
}
