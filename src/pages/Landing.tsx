import { useState, useEffect } from 'react';
import { Smartphone, Monitor, Heart } from 'lucide-react';
import { WhaleLogo } from '../components/WhaleLogo';

type Props = {
  onHost: () => void;
  onJoin: (code: string, name: string) => void;
  prefillCode?: string;
};

export function Landing({ onHost, onJoin, prefillCode }: Props) {
  const [code, setCode] = useState(prefillCode ?? '');
  const [name, setName] = useState('');

  // Update internal state if the prop changes
  useEffect(() => {
    if (prefillCode) setCode(prefillCode);
  }, [prefillCode]);

  const normalizedCode = code.trim().toUpperCase().slice(0, 4);
  const canJoin = normalizedCode.length === 4 && name.trim().length >= 1 && name.trim().length <= 14;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden">
      {/* Sand Dunes Background */}
      <svg
        viewBox="0 0 1440 320"
        className="absolute bottom-0 left-0 w-full min-w-[1000px] h-auto z-0 pointer-events-none"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#e5d06b"
          fillOpacity="0.4"
          d="M0,192L60,197.3C120,203,240,213,360,208C480,203,600,181,720,170.7C840,160,960,160,1080,181.3C1200,203,1320,245,1380,266.7L1440,288L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
        />
        <path
          fill="#f2dc70"
          d="M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,213.3C672,181,768,139,864,133.3C960,128,1056,160,1152,176C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>

      <div className="w-full max-w-5xl relative z-10 flex flex-col items-center">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <WhaleLogo className="size-24 mr-4" />
            <h1 className="text-5xl md:text-7xl font-black tracking-tight">
              Ab in die Barge!
            </h1>
          </div>
          <p className="text-lg text-slate-600 mx-auto">
            Ein Imposter-Spiel über die große Wal-Rettung in der Ostsee
          </p>
        </div>

        <div className="w-full max-w-md space-y-6">
          {!prefillCode && (
            <div className="bg-white border-2 border-slate-300 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Monitor className="w-6 h-6 text-slate-700" />
                <h2 className="text-2xl font-bold text-slate-800">Spielfeld hosten</h2>
              </div>
              <p className="text-slate-500 text-base mb-5">
                Öffne das Spiel auf einem großen Bildschirm (Laptop oder TV).
              </p>
              <button
                onClick={onHost}
                className="w-full bg-primary hover:bg-opacity-90 text-white font-bold py-3 rounded-full transition border-2 border-slate-400 shadow-sm"
              >
                Spiel hosten
              </button>
            </div>
          )}

          <div className="bg-white border-2 border-slate-300 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Smartphone className="w-6 h-6 text-slate-700" />
              <h2 className="text-2xl font-bold text-slate-800">Spiel beitreten</h2>
            </div>
            <div className="space-y-3">
              {!prefillCode ? (
                <input
                  type="text"
                  placeholder="ROOM-CODE"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={4}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-400 rounded-xl text-xl tracking-[0.3em] text-center uppercase placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/40 transition"
                />
              ) : (
                <div className="text-center py-2 bg-slate-100 rounded-xl border-2 border-slate-300 mb-4">
                  <div className="text-sm text-slate-500 uppercase tracking-widest font-bold">Raum</div>
                  <div className="text-3xl font-black tracking-[0.3em] text-slate-800">{normalizedCode}</div>
                </div>
              )}
              <input
                type="text"
                placeholder="Dein Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={14}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-400 rounded-xl text-xl placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/40 transition"
              />
              <button
                disabled={!canJoin}
                onClick={() => onJoin(normalizedCode, name.trim())}
                className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-full transition border-2 border-slate-400 shadow-sm"
              >
                Beitreten
              </button>
              {prefillCode && (
                <button
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('join');
                    window.history.replaceState(null, '', url.toString());
                    window.location.reload();
                  }}
                  className="w-full mt-2 text-slate-500 hover:text-slate-800 font-bold py-2 transition"
                >
                  Zurück zur Startseite
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-center mt-12 mb-8 bg-white/70 backdrop-blur px-4 py-2 rounded-full border border-slate-200">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
            <Heart className="w-4 h-4 text-rose-400" />
            <span>Inspiriert von der echten Walrettung.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
