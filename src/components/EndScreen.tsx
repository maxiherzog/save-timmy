import type { GameState } from '../game/types';
import { characterById } from '../game/characters';
import { Trophy, Skull, RotateCcw, LogOut } from 'lucide-react';

type Props = {
  state: GameState;
  onRematch?: () => void;
  onLeave?: () => void;
  isHost: boolean;
};

const REASON_TEXT: Record<string, string> = {
  barge: 'Timmy ist sicher in der Barge angekommen!',
  whale_died: 'Timmy hat es nicht geschafft.',
  imposter_voted: 'Der Saboteur wurde per Pressekonferenz entlarvt.',
  timeout: 'Die Zeit ist abgelaufen. Timmy konnte nicht gerettet werden.',
};

export function EndScreen({ state, onRematch, onLeave, isHost }: Props) {
  if (!state.ended) return null;
  const e = state.ended;
  const isRescuersWin = e.winner === 'rescuers';

  const stats = Object.values(state.players).map((p) => ({
    name: p.name,
    character: characterById(p.characterId),
    hupen: p.boat.stats.hupen,
    trampeln: p.boat.stats.trampeln,
    rams: p.boat.stats.rams,
    healTime: p.boat.stats.healTime,
    isImposter: e.imposterIds.includes(p.id),
  }));

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black z-40 overflow-auto">
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          {isRescuersWin ? (
            <Trophy className="w-12 h-12 text-emerald-400" />
          ) : (
            <Skull className="w-12 h-12 text-rose-400" />
          )}
          <h1
            className={`text-6xl font-black tracking-tight ${
              isRescuersWin ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isRescuersWin ? 'RETTER GEWINNEN' : (e.imposterIds.length > 1 ? 'SABOTEURE GEWINNEN' : 'SABOTEUR GEWINNT')}
          </h1>
        </div>
        <p className="text-center text-xl text-slate-300 mb-10">{REASON_TEXT[e.reason]}</p>

        <div className="bg-slate-900/80 border-2 border-amber-500/40 rounded-2xl p-8 mb-8">
          <div className="text-center text-slate-400 text-sm uppercase tracking-widest mb-6">
            {e.imposterIds.length > 1 ? 'Die Saboteure waren...' : 'Der Saboteur war...'}
          </div>
          <div className="flex flex-wrap justify-center gap-8 mb-4">
            {e.imposterCharacters.map((charId, idx) => {
              const imp = characterById(charId);
              return (
                <div key={charId} className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-5">
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center font-black text-3xl border-4"
                      style={{ background: imp.color, borderColor: imp.accent, color: '#fff' }}
                    >
                      {imp.initials}
                    </div>
                    <div className="text-left">
                      <div className="text-4xl font-black text-white">{imp.name}</div>
                      <div className="text-lg text-slate-400">gespielt von {e.imposterNames[idx]}</div>
                    </div>
                  </div>
                  <div className="italic text-center text-slate-300 max-w-sm">&ldquo;{imp.quote}&rdquo;</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Spielstatistik</h2>
          <div className="grid grid-cols-5 gap-2 text-slate-400 text-xs uppercase tracking-wider mb-2 px-3">
            <div>Spieler</div>
            <div className="text-center">Hupen</div>
            <div className="text-center">Trampeln</div>
            <div className="text-center">Rammen</div>
            <div className="text-center">Rinne</div>
          </div>
          {stats.map((s, i) => (
            <div
              key={i}
              className={`grid grid-cols-5 gap-2 items-center py-2 px-3 rounded-lg ${
                s.isImposter ? 'bg-rose-900/30 border border-rose-500/40' : 'bg-slate-800/40'
              } ${i > 0 ? 'mt-1' : ''}`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{ background: s.character.color, color: '#fff' }}
                >
                  {s.character.initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{s.name}</div>
                  <div className="text-xs text-slate-500">{s.character.name}</div>
                </div>
              </div>
              <div className="text-center font-bold text-white">{s.hupen}</div>
              <div className="text-center font-bold text-white">{s.trampeln}</div>
              <div className="text-center font-bold text-white">{s.rams}</div>
              <div className="text-center font-bold text-white">{s.healTime.toFixed(1)}s</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {isHost && onRematch && (
            <button
              onClick={onRematch}
              className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-bold text-lg px-8 py-4 rounded-full shadow-xl transition"
            >
              <RotateCcw className="w-5 h-5" /> Neue Runde
            </button>
          )}
          {onLeave && (
            <button
              onClick={onLeave}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-lg px-6 py-4 rounded-full transition"
            >
              <LogOut className="w-5 h-5" /> Zur Startseite
            </button>
          )}
        </div>
        <p className="text-center text-slate-500 text-sm mt-8">
          Save Timmy ist ein satirisches Spiel. Wir wünschen dem echten Timmy alles Gute.
        </p>
      </div>
    </div>
  );
}
