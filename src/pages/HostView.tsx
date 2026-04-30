import { useMemo, useState } from 'react';
import { useHost } from '../game/useHost';
import { unlockAudio } from '../game/audio';
import { GameCanvas } from '../components/GameCanvas';
import { VotingOverlay } from '../components/VotingOverlay';
import { EndScreen } from '../components/EndScreen';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { WhaleLogo } from '../components/WhaleLogo';
import { characterById } from '../game/characters';
import { Users, Copy, Check, LogOut } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

function randomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 })
    .map(() => letters[Math.floor(Math.random() * letters.length)])
    .join('');
}

function randomToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

type HostViewProps = { onLeave: () => void; testMode?: boolean };

export function HostView({ onLeave, testMode }: HostViewProps) {
  const [code] = useState(() => randomCode());
  const [token] = useState(() => randomToken());
  const [imposterCount, setImposterCount] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const { state, startMatch, rematch } = useHost(code, token, imposterCount, testMode);


  const joinUrl = useMemo(() => {
    const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
    return `${base}?join=${code}`;
  }, [code]);

  if (!state) {
    return <div className="min-h-screen flex items-center justify-center">Lade...</div>;
  }

  const players = Object.values(state.players).filter((p) => p.connected);

  if (state.phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col p-4 sm:p-6">
        <header className="flex items-center justify-between w-full max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <WhaleLogo className="w-8 h-8 text-primary" />
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Ab in die Barge!</div>
              <div className="text-lg font-bold">Lobby</div>
            </div>
          </div>
          <button
            onClick={onLeave}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Zur Startseite
          </button>
        </header>

        <main className="flex-1 grid md:grid-cols-2 gap-6 w-full max-w-6xl mx-auto mt-6">
          <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-8">
            <div className="text-sm uppercase tracking-widest text-slate-500 mb-3">Room Code</div>
            <div className="text-8xl lg:text-9xl leading-none font-black tracking-widest text-slate-800 mb-6">
              {code}
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
              <QRCodeSVG value={joinUrl} size={160} level="M" />
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(joinUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition text-sm bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Kopiert!' : 'Einladungslink kopieren'}
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <Users className="w-6 h-6" />
              <span>{players.length} / 8 Spieler</span>
            </h2>
            <div className="space-y-3">
              {players.length === 0 && (
                <div className="text-slate-500 italic py-4">Warten auf Spieler...</div>
              )}
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 bg-slate-50 rounded-lg p-3"
                >
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold">
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="font-semibold text-lg flex-1">{p.name}</div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400" title="Verbunden" />
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="text-sm uppercase tracking-widest text-slate-500 mb-3">Anzahl Saboteure</div>
              <input
                type="number"
                min="1"
                max="3"
                value={imposterCount}
                onChange={(e) => setImposterCount(parseInt(e.target.value) || 1)}
                className="w-full p-3 rounded-lg border border-slate-200 text-center text-3xl font-bold"
              />
            </div>

            <button
              disabled={players.length < 2}
              onClick={() => { unlockAudio(); startMatch(imposterCount); }}
              className="mt-6 w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-lg py-3 rounded-lg transition"
            >
              {players.length < 2 ? 'Mindestens 2 Spieler nötig' : `Spiel starten`}
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
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="text-sm uppercase tracking-widest text-slate-500 mb-4">
            {waiting ? 'Schaut auf eure Handys' : 'Rollen werden verteilt'}
          </div>
          <div className="text-6xl md:text-7xl font-bold mb-2">
            {waiting ? 'Bereit machen!' : 'Auf geht\u2019s!'}
          </div>
          {waiting && (
            <div className="text-xl text-slate-600 mb-8 tabular-nums">
              {readyCount} / {players.length} bereit
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mt-6">
          {players.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl p-4 border-2 flex flex-col items-center transition ${
                p.ready
                  ? 'bg-green-50 border-green-500'
                  : 'bg-white border-slate-200'
              }`}
            >
              <CharacterAvatar characterId={p.characterId} size={56} />
              <div className="mt-3 font-bold">{p.name}</div>
              {waiting && (
                <div className={`mt-2 text-xs font-bold ${p.ready ? 'text-green-600' : 'text-slate-500'}`}>
                  {p.ready ? 'BEREIT' : 'Wartet...'}
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
    <div className="relative w-screen h-screen">
      <div className="absolute inset-0">
        <GameCanvas state={state} />
      </div>
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur border border-slate-200 rounded-xl px-4 py-3 max-w-xs">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-semibold">Spieler</div>
        <div className="space-y-1.5">
          {players.map((p) => {
            const ch = characterById(p.characterId);
            return (
              <div key={p.id} className={`flex items-center gap-2 text-sm ${p.boat.alive ? '' : 'opacity-40 line-through'}`}>
                <div
                  className="w-5 h-5 rounded-full border-2"
                  style={{
                    backgroundColor: ch.color,
                    borderColor: ch.accent
                  }}
                />
                <span className="font-semibold truncate">{p.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {state.bannerMessage && state.bannerUntil > performance.now() / 1000 && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-rose-600 text-white font-bold px-6 py-3 rounded-full shadow-lg">
          {state.bannerMessage}
        </div>
      )}

      {state.phase === 'voting' && <VotingOverlay state={state} />}
      {state.phase === 'ended' && <EndScreen state={state} onRematch={rematch} onLeave={onLeave} isHost />}
    </div>
  );
}
