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
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Waves className="w-12 h-12 text-teal-400 mx-auto mb-4 animate-pulse" />
          <div>Verbinde mit Raum {code}...</div>
        </div>
      </div>
    );
  }

  if (state.phase === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-teal-950 text-white flex flex-col p-6">
        <div className="text-center mt-8">
          <div className="text-xs uppercase tracking-widest text-teal-300 mb-2">Raum {code}</div>
          <div className="text-3xl font-black mb-2">Hallo, {name}!</div>
          <div className="text-slate-400">Warten auf Spielstart...</div>
        </div>
        <div className="mt-10 space-y-3">
          {Object.values(state.players).map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                p.id === playerId ? 'bg-teal-500/20 border-2 border-teal-400' : 'bg-slate-900/50 border border-slate-700'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="font-bold">{p.name}</div>
              {p.id === playerId && <span className="ml-auto text-xs text-teal-300">das bist du</span>}
            </div>
          ))}
        </div>
        <button
          onClick={onLeave}
          className="mt-8 mx-auto flex items-center gap-2 text-slate-400 hover:text-white text-sm bg-slate-800/60 border border-slate-700 px-4 py-2 rounded-full"
        >
          <LogOut className="w-4 h-4" />
          Raum verlassen
        </button>
        <div className="mt-6 text-center text-xs text-slate-500">
          Halte dein Handy senkrecht · Lautstärke muss nicht an sein
        </div>
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
      <div className={`min-h-screen text-white flex flex-col items-center justify-center p-6 ${isImposter ? 'bg-gradient-to-br from-rose-950 to-slate-950' : 'bg-gradient-to-br from-teal-950 to-slate-950'}`}>
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-4">Du spielst</div>
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-black border-4 mb-3"
          style={{ background: c.color, borderColor: c.accent }}
        >
          {c.initials}
        </div>
        <div className="text-3xl font-black mb-1">{c.name}</div>
        <div className="text-sm text-slate-400 italic mb-8">&ldquo;{c.title}&rdquo;</div>

        {role && (
          <div
            className={`rounded-2xl p-6 border-2 text-center max-w-sm mb-8 ${
              isImposter
                ? 'bg-rose-900/60 border-rose-500'
                : 'bg-teal-900/60 border-teal-500'
            }`}
          >
            {isImposter ? (
              <>
                <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-2" />
                <div className="text-2xl font-black text-rose-200 mb-2">DU BIST DER IMPOSTER</div>
                <div className="text-sm text-rose-100/80">
                  Sorge dafür, dass Timmy stirbt &mdash; aber lass dich nicht erwischen.
                </div>
              </>
            ) : (
              <>
                <Heart className="w-10 h-10 text-teal-300 mx-auto mb-2" />
                <div className="text-2xl font-black text-teal-200 mb-2">DU BIST EIN RETTER</div>
                <div className="text-sm text-teal-100/80">
                  Lotst Timmy sicher in die Barge!
                </div>
              </>
            )}
          </div>
        )}

        <button
          onClick={() => { if (canReady && !isReady) ready(); }}
          disabled={!canReady || isReady}
          className={`w-full max-w-sm py-4 rounded-2xl font-black text-lg border-2 transition ${
            isReady
              ? 'bg-emerald-500 border-emerald-300 text-white'
              : canReady
              ? 'bg-amber-500 hover:bg-amber-400 border-amber-300 text-slate-950'
              : 'bg-slate-800 border-slate-700 text-slate-500 cursor-wait'
          }`}
        >
          {isReady ? 'BEREIT - warte auf andere' : canReady ? 'ICH BIN BEREIT' : 'Einen Moment...'}
        </button>
        <div className="mt-3 text-sm text-slate-400 tabular-nums">
          {readyCount} / {connected.length} bereit
        </div>
      </div>
    );
  }

  if (state.phase === 'voting') {
    const alive = Object.values(state.players).filter((p) => p.boat.alive);
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black text-white p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Mic className="w-6 h-6 text-amber-400" />
          <div className="font-black text-xl">PRESSEKONFERENZ</div>
        </div>
        <div className="text-sm text-slate-400 mb-5">
          Wer hat Timmy sabotiert? Stimme ab.
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {alive.map((p) => {
            const ch = characterById(p.characterId);
            const isVoted = voted === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setVoted(p.id);
                  vote(p.id);
                  navigator.vibrate?.(40);
                }}
                disabled={!me?.boat.alive}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                  isVoted
                    ? 'bg-amber-500/30 border-amber-400'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-black border-2"
                  style={{ background: ch.color, borderColor: ch.accent }}
                >
                  {ch.initials}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-lg">{p.name}</div>
                  <div className="text-xs text-slate-400">{ch.name}</div>
                </div>
                {isVoted && <div className="text-amber-400 font-bold">✓</div>}
              </button>
            );
          })}
          <button
            onClick={() => {
              setVoted('skip');
              vote('skip');
            }}
            disabled={!me?.boat.alive}
            className={`w-full p-4 rounded-xl border-2 font-bold transition ${
              voted === 'skip'
                ? 'bg-slate-500/30 border-slate-400'
                : 'bg-slate-900 border-slate-700 hover:border-slate-500'
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
      <div className={`min-h-screen text-white flex flex-col items-center justify-center p-6 ${iWon ? 'bg-gradient-to-br from-emerald-950 to-slate-950' : 'bg-gradient-to-br from-rose-950 to-slate-950'}`}>
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
          {iWon ? 'Du hast gewonnen' : 'Du hast verloren'}
        </div>
        <div className={`text-5xl font-black mb-4 ${iWon ? 'text-emerald-300' : 'text-rose-300'}`}>
          {iWon ? 'SIEG' : 'NIEDERLAGE'}
        </div>
        <div className="text-slate-300 text-center max-w-sm">
          Der Saboteur war <span className="font-bold text-amber-300">{characterById(e.imposterCharacter).name}</span>
          <br />(gespielt von <span className="font-bold">{e.imposterName}</span>)
        </div>
        <div className="mt-10 text-sm text-slate-500 text-center">
          Warte, bis der Host eine neue Runde startet.
        </div>
        <button
          onClick={onLeave}
          className="mt-6 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold px-5 py-3 rounded-full transition"
        >
          <LogOut className="w-4 h-4" /> Zur Startseite
        </button>
      </div>
    );
  }

  // PLAYING
  const isImposter = role?.role === 'imposter';
  const pkUsed = me?.pressConferenceUsed;
  const dayLeft = Math.max(0, state.dayLength - state.dayProgress);
  const stamina = me?.boat.trampelnStamina ?? 100;
  const staminaFrac = Math.max(0, Math.min(1, stamina / 100));
  const exhausted = stamina < 22;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white flex flex-col select-none overscroll-none">
      {/* Top banner */}
      <div
        className="px-4 py-3 flex items-center gap-3 border-b"
        style={{ background: c.color, borderColor: c.accent }}
      >
        <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/60 flex items-center justify-center font-black text-lg">
          {c.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-lg truncate">{name}</div>
          <div className="text-xs opacity-90 truncate">{c.name}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest opacity-70">Tag</div>
          <div className="text-lg font-black">{state.day}/{state.maxDays}</div>
          <div className="text-[10px] opacity-80 tabular-nums">{Math.ceil(dayLeft)}s</div>
        </div>
      </div>

      {/* Role banner */}
      <div
        className={`px-4 py-2 text-center text-sm font-bold ${
          isImposter
            ? 'bg-rose-600 text-white'
            : 'bg-teal-500/90 text-slate-900'
        }`}
      >
        {isImposter ? '🤫 IMPOSTER · sabotiere die Rettung' : '🐋 RETTER · bring Timmy zur Barge'}
      </div>

      {/* Timmy HP */}
      <div className="px-4 py-3 bg-slate-900/70 border-b border-slate-800">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-bold">TIMMY</span>
          <span className="tabular-nums">{Math.round(state.whale.hp)} / 100</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${state.whale.hp}%`,
              background:
                state.whale.hp > 60
                  ? 'linear-gradient(90deg,#10b981,#22c55e)'
                  : state.whale.hp > 30
                  ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                  : 'linear-gradient(90deg,#b91c1c,#ef4444)',
            }}
          />
        </div>
      </div>

      {/* Mini-map */}
      <div className="px-4 py-3 flex justify-center">
        <MiniMap state={state} playerId={playerId} />
      </div>

      {/* Controls */}
      <div className="flex-1 grid grid-cols-2 gap-3 p-4 pt-1">
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
            className={`flex-1 rounded-2xl font-black text-lg border-4 transition-transform ${
              hupenFlash ? 'scale-95' : ''
            } bg-gradient-to-br from-rose-500 to-rose-700 border-rose-300/50 text-white flex flex-col items-center justify-center shadow-xl`}
          >
            <Siren className="w-7 h-7 mb-1" />
            HUPEN
            <span className="text-[10px] opacity-70 font-normal">3s cd</span>
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); if (!exhausted) doTrampeln(); }}
            onClick={() => { if (!exhausted) doTrampeln(); }}
            disabled={exhausted}
            className={`relative flex-1 rounded-2xl font-black text-base border-4 overflow-hidden transition-transform ${
              trampelnFlash ? 'scale-95' : ''
            } ${
              exhausted
                ? 'bg-slate-800 border-slate-700 text-slate-500'
                : 'bg-gradient-to-br from-amber-500 to-amber-700 border-amber-300/50 text-white shadow-xl'
            } flex flex-col items-center justify-center`}
          >
            <div
              className="absolute left-0 bottom-0 h-1.5 bg-amber-200 transition-all"
              style={{ width: `${staminaFrac * 100}%` }}
            />
            <Volume2 className="w-6 h-6 mb-1" />
            {exhausted ? 'ERSCHÖPFT' : 'TRAMPELN'}
            <span className="text-[10px] opacity-70 font-normal tabular-nums">
              {Math.round(stamina)}%
            </span>
          </button>
          <button
            onClick={doPressConference}
            disabled={pkUsed}
            className={`rounded-2xl font-bold py-3 text-sm border-2 flex items-center justify-center gap-1.5 ${
              pkUsed
                ? 'bg-slate-800 border-slate-700 text-slate-500'
                : 'bg-slate-900 border-slate-600 text-amber-300 hover:border-amber-400'
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

function MiniMap({ state, playerId }: { state: import('../game/types').GameState; playerId: string }) {
  const W = 260;
  const H = 120;
  const sx = W / 1600;
  const sy = H / 900;
  return (
    <div className="relative rounded-lg border border-slate-700 bg-slate-950/80 overflow-hidden" style={{ width: W, height: H }}>
      {state.sandbanks.map((sb, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-amber-700/60"
          style={{
            left: (sb.x - sb.rx) * sx,
            top: (sb.y - sb.ry) * sy,
            width: sb.rx * 2 * sx,
            height: sb.ry * 2 * sy,
          }}
        />
      ))}
      <div
        className="absolute bg-slate-300"
        style={{
          left: state.barge.x * sx,
          top: state.barge.y * sy,
          width: state.barge.w * sx,
          height: state.barge.h * sy,
        }}
      />
      <div
        className="absolute w-2 h-2 rounded-full bg-blue-300"
        style={{ left: state.whale.x * sx - 4, top: state.whale.y * sy - 4 }}
      />
      {Object.values(state.players).map((p) => (
        <div
          key={p.id}
          className={`absolute w-1.5 h-1.5 rounded-full ${p.id === playerId ? 'ring-2 ring-white' : ''}`}
          style={{
            left: p.boat.x * sx - 3,
            top: p.boat.y * sy - 3,
            background: p.id === playerId ? '#22d3ee' : '#94a3b8',
          }}
        />
      ))}
    </div>
  );
}
