import { useEffect, useMemo, useRef, useState } from 'react';
import { useHost } from '../game/useHost';
import { playHupen, playTrampeln, unlockAudio } from '../game/audio';
import { GameCanvas } from '../components/GameCanvas';
import { VotingOverlay } from '../components/VotingOverlay';
import { EndScreen } from '../components/EndScreen';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { Waves, Users, Copy, Check, LogOut } from 'lucide-react';

function randomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 })
    .map(() => letters[Math.floor(Math.random() * letters.length)])
    .join('');
}

function randomToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

type HostViewProps = { onLeave: () => void };

export function HostView({ onLeave }: HostViewProps) {
  const [code] = useState(() => randomCode());
  const [token] = useState(() => randomToken());
  const [copied, setCopied] = useState(false);
  const { state, startMatch, rematch } = useHost(code, token);
  const lastFxIdRef = useRef(0);

  useEffect(() => {
    if (!state?.fx?.length) return;
    for (const f of state.fx) {
      if (f.id <= lastFxIdRef.current) continue;
      if (f.kind === 'hupen') playHupen();
      else playTrampeln();
    }
    lastFxIdRef.current = state.fx[state.fx.length - 1].id;
  }, [state?.fx]);

  const joinUrl = useMemo(() => {
    const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
    return `${base}?join=${code}`;
  }, [code]);

  if (!state) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Lade...</div>;
  }

  const players = Object.values(state.players).filter((p) => p.connected);

  if (state.phase === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 text-white flex flex-col">
        <header className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Waves className="w-7 h-7 text-teal-300" />
            <div>
              <div className="text-xs uppercase tracking-widest text-teal-300">Save Timmy</div>
              <div className="text-lg font-black">Lobby</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="w-5 h-5" />
              <span className="font-bold text-white">{players.length}</span> / 8 Spieler
            </div>
            <button
              onClick={onLeave}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm bg-slate-800/60 border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-full transition"
            >
              <LogOut className="w-4 h-4" />
              Zur Startseite
            </button>
          </div>
        </header>

        <main className="flex-1 grid md:grid-cols-2 gap-8 px-8 pb-8">
          <div className="flex flex-col items-center justify-center bg-slate-900/70 rounded-3xl p-8 border-2 border-slate-700">
            <div className="text-sm uppercase tracking-widest text-slate-400 mb-3">Room Code</div>
            <div className="text-[10rem] leading-none font-black tracking-widest text-amber-400 mb-4">
              {code}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(joinUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition text-sm bg-slate-800 px-4 py-2 rounded-full"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Kopiert!' : joinUrl}
            </button>
            <div className="mt-6 text-slate-400 text-center">
              Alle Spieler öffnen <span className="font-bold text-white">save-timmy</span> auf dem
              Handy und geben den Code ein.
            </div>
          </div>

          <div className="bg-slate-900/70 rounded-3xl p-8 border-2 border-slate-700">
            <h2 className="text-2xl font-bold mb-6">Spieler im Raum</h2>
            {players.length === 0 && (
              <div className="text-slate-500 italic">Warten auf Spieler...</div>
            )}
            <div className="space-y-3">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 bg-slate-800/60 rounded-xl p-4 border border-slate-700"
                >
                  <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center text-xl font-black">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg">{p.name}</div>
                    <div className="text-xs text-slate-400">bereit</div>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                </div>
              ))}
            </div>

            <button
              disabled={players.length < 2}
              onClick={() => { unlockAudio(); startMatch(); }}
              className="mt-8 w-full bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black text-xl py-4 rounded-2xl transition shadow-xl shadow-teal-500/30"
            >
              {players.length < 2 ? 'Mindestens 2 Spieler nötig' : `Spiel starten (${players.length} Spieler)`}
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (state.phase === 'starting' || state.phase === 'ready') {
    const readyCount = players.filter((p) => p.ready).length;
    const waiting = state.phase === 'ready';
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 text-white flex flex-col items-center justify-center p-8">
        <div className="text-sm uppercase tracking-widest text-teal-300 mb-4">
          {waiting ? 'Schaut auf eure Handys' : 'Rollen werden verteilt'}
        </div>
        <div className="text-6xl md:text-7xl font-black mb-2">
          {waiting ? 'Bereit machen!' : 'Auf geht\u2019s!'}
        </div>
        {waiting && (
          <div className="text-xl text-slate-300 mb-8 tabular-nums">
            {readyCount} / {players.length} bereit
          </div>
        )}
        {!waiting && <div className="mb-8" />}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
          {players.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl p-4 border flex flex-col items-center transition ${
                p.ready
                  ? 'bg-emerald-900/40 border-emerald-400'
                  : 'bg-slate-900/70 border-slate-700'
              }`}
            >
              <CharacterAvatar characterId={p.characterId} size={56} />
              <div className="mt-3 font-bold">{p.name}</div>
              <div className="text-xs text-slate-400 mt-1">spielt</div>
              <div className="text-sm font-semibold text-teal-300">{p.characterId}</div>
              {waiting && (
                <div className={`mt-2 text-xs font-bold ${p.ready ? 'text-emerald-300' : 'text-slate-500'}`}>
                  {p.ready ? 'BEREIT' : 'wartet...'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // playing / voting / ended
  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden">
      <div className="absolute inset-0">
        <GameCanvas state={state} />
      </div>
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur rounded-xl px-4 py-3 max-w-xs">
        <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Spieler</div>
        <div className="space-y-1.5">
          {players.map((p) => (
            <div key={p.id} className={`flex items-center gap-2 text-sm ${p.boat.alive ? '' : 'opacity-40 line-through'}`}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border"
                style={{
                  background: `var(--char-${p.characterId})`,
                }}
              />
              <span className="font-bold text-white truncate">{p.name}</span>
              <span className="text-xs text-slate-400 truncate">· {p.characterId}</span>
            </div>
          ))}
        </div>
      </div>

      {state.bannerMessage && state.bannerUntil > performance.now() / 1000 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-rose-600/90 text-white font-bold px-6 py-3 rounded-full shadow-lg">
          {state.bannerMessage}
        </div>
      )}

      {state.phase === 'voting' && <VotingOverlay state={state} />}
      {state.phase === 'ended' && <EndScreen state={state} onRematch={rematch} onLeave={onLeave} isHost />}
    </div>
  );
}
