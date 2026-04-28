import { useState } from 'react';
import { Waves, Anchor, Smartphone, Monitor, Heart } from 'lucide-react';

type Props = {
  onHost: () => void;
  onJoin: (code: string, name: string) => void;
  prefillCode?: string;
};

export function Landing({ onHost, onJoin, prefillCode }: Props) {
  const [code, setCode] = useState(prefillCode ?? '');
  const [name, setName] = useState('');

  const normalizedCode = code.trim().toUpperCase().slice(0, 4);
  const canJoin = normalizedCode.length === 4 && name.trim().length >= 1 && name.trim().length <= 14;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-teal-400 blur-3xl"
            style={{
              width: 300 + Math.random() * 200,
              height: 300 + Math.random() * 200,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-12 md:py-20">
        <div className="flex items-center gap-3 mb-4">
          <Waves className="w-8 h-8 text-teal-300" />
          <span className="text-sm uppercase tracking-widest font-bold text-teal-300">
            Ostsee · 2026
          </span>
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-4 leading-none">
          SAVE <span className="text-amber-400">TIMMY</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mb-2">
          Ein Multiplayer-Partyspiel über die große Wal-Rettung &mdash; mit einem Saboteur unter euch.
        </p>
        <p className="text-sm text-slate-400 mb-10">
          Laptop zeigt das Spielfeld · 4&ndash;8 Spieler spielen auf ihren Handys.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-5 h-5 text-teal-300" />
              <h2 className="text-xl font-bold">Spielfeld hosten</h2>
            </div>
            <p className="text-slate-400 text-sm mb-5">
              Öffne das Spielfeld auf einem Laptop oder einem Fernseher. Spieler joinen über ihre
              Handys.
            </p>
            <button
              onClick={onHost}
              className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-teal-500/20"
            >
              Spiel hosten
            </button>
          </div>

          <div className="bg-slate-900/60 backdrop-blur border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-5 h-5 text-amber-300" />
              <h2 className="text-xl font-bold">Als Spieler beitreten</h2>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Room-Code (4 Buchstaben)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={4}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl font-mono text-lg tracking-[0.3em] text-center uppercase placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <input
                type="text"
                placeholder="Dein Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={14}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-lg focus:outline-none focus:border-amber-400"
              />
              <button
                disabled={!canJoin}
                onClick={() => onJoin(normalizedCode, name.trim())}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-950 font-bold py-3 rounded-xl transition"
              >
                Beitreten
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-slate-900/40 border border-slate-700 rounded-xl p-5 mb-6">
          <Anchor className="w-5 h-5 text-teal-300 shrink-0 mt-1" />
          <div className="text-sm text-slate-400">
            <p className="text-white font-bold mb-1">So funktionierts</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Ein Gerät hostet das Spielfeld und zeigt den 4-stelligen Room-Code.</li>
              <li>Alle anderen öffnen diese Seite auf ihrem Handy und geben den Code ein.</li>
              <li>Lotst Timmy mit euren Booten in die Barge &mdash; aber einer ist der Saboteur.</li>
            </ol>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
          <Heart className="w-4 h-4 text-rose-400" />
          Satire über die reale Ostsee-Walrettung 2026. Wir wünschen dem echten Timmy alles Gute.
        </div>
      </div>
    </div>
  );
}
