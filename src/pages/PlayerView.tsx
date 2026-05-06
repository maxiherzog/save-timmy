import { useEffect, useState } from 'react';
import { usePlayer } from '../game/usePlayer';
import { Throttle } from '../controller/Throttle';
import { SteeringSlider } from '../controller/SteeringSlider';
import { characterById } from '../game/characters';
import { Siren, Mic, Waves, AlertTriangle, Heart, LogOut, Wifi, Footprints } from 'lucide-react';

type Props = {
  code: string;
  name: string;
  playerId: string;
  onLeave: () => void;
};

export function PlayerView({ code, name, playerId, onLeave }: Props) {
  const { state, role, assignments, ping, setInput, pressConference, vote, ready } = usePlayer(code, playerId, name);
  const [hupenFlash, setHupenFlash] = useState(false);
  const [trampelnFlash, setTrampelnFlash] = useState(false);
  const [voted, setVoted] = useState<string | null>(null);
  const [isRevealingRole, setIsRevealingRole] = useState(false);

  useEffect(() => {
    if (state?.phase !== 'voting') setVoted(null);
  }, [state?.phase]);

  useEffect(() => {
    // Prevent iOS/Android pull-to-refresh and bounce scrolling on the player view
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) return; // Allow pinch-zoom occasionally if really needed, but prevent single finger scroll
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  const me = state?.players[playerId];
  const myCharacter = assignments[playerId] ?? me?.characterId ?? 'hilse';
  const c = characterById(myCharacter);

  function doHupen() {
    setInput({ hupen: true });
    setHupenFlash(true);
    setTimeout(() => {
      setInput({ hupen: false });
      setHupenFlash(false);
    }, 180);
    navigator.vibrate?.(60);
  }

  function doTrampeln() {
    setInput({ trampeln: true });
    setTrampelnFlash(true);
    setTimeout(() => {
      setInput({ trampeln: false });
      setTrampelnFlash(false);
    }, 180);
    navigator.vibrate?.(30);
  }

  function doPressConference() {
    if (me?.pressConferenceUsed) return;
    pressConference();
    navigator.vibrate?.([50, 40, 50]);
  }

  if (!state) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center text-center p-4">
        <div className="mb-8">
          <Waves className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <div className="font-semibold text-xl mb-2">Verbinde mit Raum {code}...</div>
          <div className="text-slate-500 text-sm">Bitte warten, oder kehre zurück, falls der Raum nicht mehr existiert.</div>
        </div>
        <button
          onClick={onLeave}
          className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-5 py-3 rounded-full transition"
        >
          <LogOut className="w-4 h-4" /> Startseite
        </button>
      </div>
    );
  }

  if (state.phase === 'lobby') {
    return (
      <div className="min-h-[100dvh] flex flex-col p-4 sm:p-6">
        <div className="text-center my-8">
          <div className="text-sm uppercase tracking-widest text-slate-500 mb-2">Raum {code}</div>
          <div className="text-3xl font-bold mb-2">Hallo, {name}!</div>
          <div className="text-slate-500">Warten auf Spielstart durch den Host...</div>
        </div>
        <div className="w-full max-w-md mx-auto space-y-3">
          {Object.values(state.players).map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
                p.id === playerId ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                {p.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="font-semibold">{p.name}</div>
              {p.id === playerId && <span className="ml-auto text-xs font-semibold text-blue-600">Das bist du</span>}
            </div>
          ))}
        </div>
        <button
          onClick={onLeave}
          className="mt-auto mx-auto flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Raum verlassen
        </button>
      </div>
    );
  }

  if (state.phase === 'starting' || state.phase === 'ready') {
    const isImposter = role?.role === 'imposter';
    const isReady = !!me?.ready;
    const canReady = state.phase === 'ready';
    const connected = Object.values(state.players).filter((p) => p.connected);
    const readyCount = connected.filter((p) => p.ready).length;

    const handleReadyClick = async () => {
      if (canReady && !isReady) {
        try {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          } else if ((document.documentElement as any).webkitRequestFullscreen) {
            await (document.documentElement as any).webkitRequestFullscreen();
          }
        } catch (e) {
          console.warn('Fullscreen request failed or not supported:', e);
        }
        ready();
      }
    };

    return (
      <div className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center`}>
        <div className="text-sm uppercase tracking-widest text-slate-500 mb-4">Du spielst als</div>
        <div className="text-3xl font-bold mb-1">{c.name}</div>

        {role && (
          <div
            className={`relative rounded-xl p-6 border-2 text-center max-w-sm my-6 select-none transition-all ${
              isRevealingRole ? (isImposter ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500') : 'bg-slate-800 border-slate-700'
            }`}
            onTouchStart={() => setIsRevealingRole(true)}
            onTouchEnd={() => setIsRevealingRole(false)}
            onMouseDown={() => setIsRevealingRole(true)}
            onMouseUp={() => setIsRevealingRole(false)}
            onMouseLeave={() => setIsRevealingRole(false)}
          >
            <div className={`transition-opacity duration-300 ${isRevealingRole ? 'opacity-100' : 'opacity-0'}`}>
              {isImposter ? (
                <>
                  <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-800 mb-2">DU BIST DER SABOTEUR</div>
                  <div className="text-sm text-red-700">
                    Sorge dafür, dass Timmy stirbt &mdash; aber lass dich nicht erwischen.
                  </div>
                </>
              ) : (
                <>
                  <Heart className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-800 mb-2">DU BIST EIN RETTER</div>
                  <div className="text-sm text-green-700">
                    Lotst Timmy sicher in die Barge!
                  </div>
                </>
              )}
            </div>
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center text-white transition-opacity duration-300 ${
                isRevealingRole ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <div className="text-lg font-bold">Rolle aufdecken</div>
              <div className="text-sm text-slate-400">Finger gedrückt halten</div>
            </div>
          </div>
        )}

        <button
          onClick={handleReadyClick}
          disabled={!canReady || isReady}
          className={`w-full max-w-sm py-4 rounded-xl font-bold text-lg border-2 transition-all ${
            isReady
              ? 'bg-green-100 border-green-300 text-green-700 shadow-inner'
              : canReady
              ? 'bg-slate-800 hover:bg-slate-900 border-slate-900 text-white active:scale-95 shadow-xl'
              : 'bg-slate-200 border-slate-300 text-slate-500 cursor-wait'
          }`}
        >
          {isReady ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              Warte auf andere...
            </div>
          ) : canReady ? (
            'ICH BIN BEREIT'
          ) : (
            'Einen Moment...'
          )}
        </button>
        <div className="mt-3 text-sm text-slate-500 tabular-nums">
          {readyCount} / {connected.length} Spieler bereit
        </div>
      </div>
    );
  }

  if (state.phase === 'voting') {
    const alive = Object.values(state.players).filter((p) => p.boat.alive);
    return (
      <div className="min-h-[100dvh] p-5 flex flex-col bg-slate-50">
        <div className="text-center mb-6">
          <Mic className="w-8 h-8 text-slate-700 mx-auto mb-2" />
          <div className="font-bold text-2xl text-slate-900">PRESSEKONFERENZ</div>
          <div className="text-sm text-slate-600">Wer ist der Saboteur? Stimme jetzt ab.</div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto pb-6">
          {alive.map((p) => {
            const ch = characterById(p.characterId);
            const isVoted = voted === p.id;
            const isSelf = p.id === playerId;
            return (
              <div
                key={p.id}
                onClick={() => {
                  if (isSelf) return;
                  setVoted(p.id);
                  vote(p.id);
                  navigator.vibrate?.(40);
                }}
                className={`p-4 rounded-xl flex items-center gap-4 border-2 ${
                  isSelf ? 'opacity-50 cursor-not-allowed border-slate-300' :
                  isVoted
                    ? 'border-slate-800 ring-2 ring-slate-800/20 shadow-md'
                    : 'border-transparent shadow-sm'
                }`}
                style={{ backgroundColor: ch.color }}
              >
                <div className="text-left flex-1 min-w-0">
                  <div className="font-bold text-lg text-slate-900 truncate">{p.name}</div>
                  <div className="text-xs text-slate-700 truncate font-semibold">{ch.name}</div>
                </div>
                {isVoted && <div className="text-slate-900 font-bold text-2xl pr-2">✓</div>}
              </div>
            );
          })}
          <div className="pt-4">
            <button
              onClick={() => { setVoted('skip'); vote('skip'); }}
              disabled={!me?.boat.alive}
              className={`w-full p-4 rounded-xl border-2 font-bold transition-transform ${
                voted === 'skip'
                  ? 'bg-slate-200 border-slate-400 text-slate-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              Niemanden rauswerfen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'countdown') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center text-center p-4 bg-slate-900 text-white">
        <div className="text-3xl font-bold">Es geht gleich los...</div>
      </div>
    );
  }

  // PLAYING
  const pkUsed = me?.pressConferenceUsed;
  const stamina = me?.boat.trampelnStamina ?? 100;
  const staminaFrac = Math.max(0, Math.min(1, stamina / 100));
  const exhausted = stamina < 22;

  return (
    <div className="fixed inset-0 flex flex-col select-none overflow-hidden touch-none bg-slate-900">
      {/* Top banner */}
      <div
        className="px-4 py-2 flex items-center gap-3 border-b-4"
        style={{ backgroundColor: c.color, borderColor: c.accent }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-bold text-lg truncate text-slate-800">{name}</div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/20 text-[10px] text-white font-mono" title="Ping">
              <Wifi className={`w-2.5 h-2.5 ${ping === 0 ? 'opacity-50' : ping < 150 ? 'text-green-400' : ping < 400 ? 'text-yellow-400' : 'text-red-400'}`} />
              {ping > 0 ? `${Math.round(ping)}ms` : '--'}
            </div>
          </div>
          <div className="text-xs opacity-90 truncate text-slate-700/80">{c.name}</div>
        </div>
        <button
          onClick={doPressConference}
          disabled={pkUsed}
          className={`px-3 py-2 rounded-lg font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition-colors ${
            pkUsed
              ? 'bg-slate-200/20 border-slate-300/20 text-slate-800/40'
              : 'bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/50 text-white'
          }`}
          title="Pressekonferenz"
        >
          <Mic className="w-4 h-4" />
          <span>PK</span>
        </button>
      </div>
      {/* Controls */}
      <div className="flex-1 flex flex-col p-4 gap-4">
        
        {/* Top row of controls: Throttle (left) and Buttons (right) */}
        <div className="flex-1 flex justify-between items-center px-2">
          {/* Throttle */}
          <div className="h-full flex items-center justify-center">
            <Throttle onChange={(val) => setInput({ joystickY: -val })} height={180} />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col justify-center gap-4 w-28">
            <button
              onTouchStart={(e) => { e.preventDefault(); doHupen(); }}
              onClick={doHupen}
              className={`w-full aspect-square rounded-full font-bold border-2 transition-transform text-lg ${
                hupenFlash ? 'scale-95' : ''
              } bg-red-500 hover:bg-red-600 border-red-300/50 text-white flex flex-col items-center justify-center shadow-lg`}
            >
              <Siren className="w-9 h-9" />
              <span className="text-xs mt-1">HUPEN</span>
            </button>

            <button
              onTouchStart={(e) => { e.preventDefault(); if (!exhausted) doTrampeln(); }}
              onClick={() => { if (!exhausted) doTrampeln(); }}
              disabled={exhausted}
              className={`relative w-full aspect-square rounded-full font-bold border-2 overflow-hidden transition-transform text-lg ${
                trampelnFlash ? 'scale-95' : ''
              } ${
                exhausted
                  ? 'bg-slate-200 border-slate-300 text-slate-500'
                  : 'bg-blue-500 hover:bg-blue-600 border-blue-300/50 text-white shadow-lg'
              } flex flex-col items-center justify-center`}
            >
              <div
                className="absolute left-0 bottom-0 right-0 bg-blue-200/30 transition-all"
                style={{ height: `${staminaFrac * 100}%` }}
              />
              <Footprints className="w-9 h-9 relative z-10" />
              <span className="text-xs mt-1 relative z-10">{exhausted ? 'ERSCHÖPFT' : 'TRAMPELN'}</span>
            </button>
          </div>
        </div>

        {/* Bottom row: Steering Slider */}
        <div className="w-full pb-2">
          <SteeringSlider onChange={(x) => setInput({ joystickX: x })} />
        </div>
      </div>
    </div>
  );
}