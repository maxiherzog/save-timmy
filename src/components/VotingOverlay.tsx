import type { GameState } from '../game/types';
import { characterById } from '../game/characters';
import { Mic } from 'lucide-react';

export function VotingOverlay({ state }: { state: GameState }) {
  if (!state.vote.active) return null;
  const timeLeft = Math.max(0, (state.vote.endsAt - performance.now() / 1000) | 0);
  const caller = state.vote.calledByCharacter ? characterById(state.vote.calledByCharacter) : null;
  const tally: Record<string, number> = {};
  for (const t of Object.values(state.vote.votes)) tally[t] = (tally[t] || 0) + 1;

  const alive = Object.values(state.players).filter((p) => p.boat.alive);

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 to-black/50 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-8">
      <div className="flex items-center gap-3 mb-4">
        <Mic className="w-10 h-10 text-amber-400" />
        <h1 className="text-5xl font-black text-white tracking-tight">PRESSEKONFERENZ</h1>
      </div>
      {caller && (
        <div className="text-slate-300 mb-8 text-xl">
          einberufen von <span className="font-bold text-white">{caller.name}</span>
        </div>
      )}
      <div className="text-6xl font-black text-amber-400 mb-10 tabular-nums">{timeLeft}s</div>
      <div className="grid grid-cols-4 gap-4 max-w-5xl">
        {alive.map((p) => {
          const c = characterById(p.characterId);
          const votes = tally[p.id] || 0;
          return (
            <div
              key={p.id}
              className="bg-slate-900 border-2 border-slate-700 rounded-xl p-4 flex flex-col items-center"
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl border-4 mb-2"
                style={{ background: c.color, borderColor: c.accent, color: '#fff' }}
              >
                {c.initials}
              </div>
              <div className="font-bold text-white text-lg">{p.name}</div>
              <div className="text-xs text-slate-400 mb-2">{c.name}</div>
              <div className="text-3xl font-black text-amber-400 tabular-nums">{votes}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-lg px-6 py-3 text-slate-300">
        Spieler stimmen auf ihren Handys ab
      </div>
    </div>
  );
}
