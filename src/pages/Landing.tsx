import { useState } from 'react';
import { WhaleLogo } from '../components/WhaleLogo';
import { Anchor, Smartphone, Monitor, Heart } from 'lucide-react';

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
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <WhaleLogo className="w-20 h-20 text-primary mr-3" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Save<span className="text-primary">Timmy</span>
            </h1>
          </div>
          <p className="text-lg text-slate-600 max-w-xs mx-auto">
            Ein Multiplayer-Spiel über die große Walrettung in der Ostsee. 
          </p>
        </div>

        <div className="space-y-4">
          {/* Host Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Monitor className="w-6 h-6 text-slate-700" />
              <h2 className="text-xl font-bold text-slate-800">Spielfeld hosten</h2>
            </div>
            <p className="text-slate-500 text-sm mb-5">
              Öffne das Spiel auf einem großen Bildschirm (Laptop oder TV).
            </p>
            <button
              onClick={onHost}
              className="w-full bg-primary hover:bg-opacity-90 text-white font-bold py-3 rounded-lg transition"
            >
              Spiel hosten
            </button>
          </div>

          {/* Join Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Smartphone className="w-6 h-6 text-slate-700" />
              <h2 className="text-xl font-bold text-slate-800">Spiel beitreten</h2>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="ROOM-CODE"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-lg tracking-[0.3em] text-center uppercase placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Dein Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={14}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                disabled={!canJoin}
                onClick={() => onJoin(normalizedCode, name.trim())}
                className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition"
              >
                Beitreten
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <Heart className="w-4 h-4 text-rose-400" />
            <span>Inspiriert von der echten Walrettung.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
