import { useEffect, useState } from 'react';
import { usePlayer } from '../game/usePlayer';
import { Joystick } from '../controller/Joystick';
import { characterById } from '../game/characters';
import { Siren, Volume2, Mic, Waves, AlertTriangle, Heart, LogOut } from 'lucide-react';

type Props = {
  code: string;
  name: string;
  playerId: string;
  onLeave: () => void;
};

export function PlayerView({ code, name, playerId, onLeave }: Props) {
  const { state, role, assignments, setInput, pressConference, vote, ready } = usePlayer(code, playerId, name);
  const [hupenFlash, setHupenFlash] = useState(false);
  const [trampelnFlash, setTrampelnFlash] = useState(false);
  const [voted, setVoted] = useState<string | null>(null);

  useEffect(() => {
    if (state?.phase !== 'voting') setVoted(null);
  }, [state?.phase]);

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
      <div className="min-h-screen flex items-center justify-center text-center p-4">
        <div>
          <Waves className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <div className="font-semibold">Verbinde mit Raum {code}...</div>
        </div>
      </div>
    );
  }

  if (state.phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col p-4 sm:p-6">
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
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center`}>
        <div className="text-sm uppercase tracking-widest text-slate-500 mb-4">Du spielst als</div>
        <div className="text-3xl font-bold mb-1">{c.name}</div>

        {role && (
          <div
            className={`rounded-xl p-6 border-2 text-center max-w-sm my-6 ${
              isImposter
                ? 'bg-red-50 border-red-500'
                : 'bg-green-50 border-green-500'
            }`}
          >
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
        )}

        <button
          onClick={() => { if (canReady && !isReady) ready(); }}
          disabled={!canReady || isReady}
          className={`w-full max-w-sm py-4 rounded-xl font-bold text-lg border-2 transition ${
            isReady
              ? 'bg-green-500 border-green-600 text-white'
              : canReady
              ? 'bg-slate-800 hover:bg-slate-900 border-slate-900 text-white'
              : 'bg-slate-300 border-slate-400 text-slate-500 cursor-wait'
          }`}
        >
          {isReady ? 'BEREIT' : canReady ? 'ICH BIN BEREIT' : 'Einen Moment...'}
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
      <div className="min-h-screen p-5 flex flex-col">
        <div className="text-center mb-6">
          <Mic className="w-8 h-8 text-slate-700 mx-auto mb-2" />
          <div className="font-bold text-2xl">PRESSEKONFERENZ</div>
          <div className="text-sm text-slate-500">Wer ist der Saboteur? Stimme jetzt ab.</div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {alive.map((p) => {
            const ch = characterById(p.characterId);
            const isVoted = voted === p.id;
            return (
              <button
                key={p.id}
                onClick={() => { setVoted(p.id); vote(p.id); navigator.vibrate?.(40); }}
                disabled={!me?.boat.alive}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                  isVoted
                    ? 'bg-blue-100 border-blue-500'
                    : 'bg-white border-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="text-left flex-1">
                  <div className="font-bold text-lg">{p.name}</div>
                  <div className="text-xs text-slate-500">{ch.name}</div>
                </div>
                {isVoted && <div className="text-blue-500 font-bold text-2xl">✓</div>}
              </button>
            );
          })}
          <button
            onClick={() => { setVoted('skip'); vote('skip'); }}
            disabled={!me?.boat.alive}
            className={`w-full p-4 rounded-xl border-2 font-bold transition ${
              voted === 'skip'
                ? 'bg-slate-200 border-slate-400'
                : 'bg-white border-slate-200 hover:border-slate-400'
            }`}
          >
            Niemanden rauswerfen
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === 'ended') {
    const e = state.ended!;
    const isImposter = role?.role === 'imposter';
    const iWon = (isImposter && e.winner === 'imposter') || (!isImposter && e.winner === 'rescuers');
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center`}>
        <div className={`text-5xl font-bold mb-4 ${iWon ? 'text-green-500' : 'text-red-500'}`}>
          {iWon ? 'SIEG!' : 'NIEDERLAGE'}
        </div>
        <div className="text-slate-600 max-w-sm mb-8">
          Der Saboteur war <span className="font-bold text-slate-800">{characterById(e.imposterCharacter).name}</span>
          {' '}(<span className="font-bold">{e.imposterName}</span>).
        </div>
        <div className="text-sm text-slate-500">
          Warte, bis der Host eine neue Runde startet.
        </div>
        <button
          onClick={onLeave}
          className="mt-6 flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-5 py-3 rounded-full transition"
        >
          <LogOut className="w-4 h-4" /> Zur Startseite
        </button>
      </div>
    );
  }

  // ROLE BANNER STATE
  const [showRole, setShowRole] = useState(false);
  useEffect(() => {
    if (state?.phase === 'playing') {
      setShowRole(true);
      const timer = setTimeout(() => setShowRole(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [state?.phase]);

  // PLAYING
  const isImposter = role?.role === 'imposter';
  const pkUsed = me?.pressConferenceUsed;
  const stamina = me?.boat.trampelnStamina ?? 100;
  const staminaFrac = Math.max(0, Math.min(1, stamina / 100));
  const exhausted = stamina < 22;

  return (
    <div className="h-full flex flex-col select-none overscroll-none">
      {/* Top banner */}
      <div
        className="px-4 py-2 flex items-center gap-3 border-b-4"
        style={{ backgroundColor: c.color, borderColor: c.accent }}
      >
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg truncate text-white">{name}</div>
          <div className="text-xs opacity-90 truncate text-white/80">{c.name}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest opacity-80 text-white">Tag {state.day}/{state.maxDays}</div>
          <div className="w-24 h-2 bg-white/30 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${(1 - state.dayProgress / state.dayLength) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Role banner */}
      {showRole && (
        <div
          className={`px-4 py-1.5 text-center text-sm font-bold ${
            isImposter ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}
        >
          {isImposter ? '🤫 SABOTEUR' : '🐋 RETTER'}
        </div>
      )}
      
      {/* Controls */}
      <div className="flex-1 grid grid-cols-2 gap-3 p-4">
        <div className="flex items-center justify-center">
          <Joystick
            onChange={(x, y) => setInput({ joystickX: x, joystickY: y })}
            size={180}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <button
            onTouchStart={(e) => { e.preventDefault(); doHupen(); }}
            onClick={doHupen}
            className={`flex-1 rounded-2xl font-bold border-2 transition-transform ${
              hupenFlash ? 'scale-95' : ''
            } bg-red-500 hover:bg-red-600 border-red-300/50 text-white flex flex-col items-center justify-center shadow-lg`}
          >
            <Siren className="w-7 h-7 mb-1" />
            HUPEN
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); if (!exhausted) doTrampeln(); }}
            onClick={() => { if (!exhausted) doTrampeln(); }}
            disabled={exhausted}
            className={`relative flex-1 rounded-2xl font-bold border-2 overflow-hidden transition-transform ${
              trampelnFlash ? 'scale-95' : ''
            } ${
              exhausted
                ? 'bg-slate-200 border-slate-300 text-slate-500'
                : 'bg-blue-500 hover:bg-blue-600 border-blue-300/50 text-white shadow-lg'
            } flex flex-col items-center justify-center`}
          >
            <div
              className="absolute left-0 bottom-0 h-1.5 bg-blue-200 transition-all"
              style={{ width: `${staminaFrac * 100}%` }}
            />
            <Volume2 className="w-6 h-6 mb-1" />
            {exhausted ? 'ERSCHÖPFT' : 'TRAMPELN'}
          </button>
          <button
            onClick={doPressConference}
            disabled={pkUsed}
            className={`rounded-xl font-bold py-3 text-sm border-2 flex items-center justify-center gap-1.5 ${
              pkUsed
                ? 'bg-slate-200 border-slate-300 text-slate-500'
                : 'bg-slate-700 hover:bg-slate-800 border-slate-600 text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
            {pkUsed ? 'PK verwendet' : 'Pressekonferenz'}
          </button>
        </div>
      </div>
    </div>
  );
}