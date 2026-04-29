import { useEffect, useRef, useState } from 'react';
import { useHost } from '../game/useHost';
import { GameCanvas } from '../components/GameCanvas';
import { VotingOverlay } from '../components/VotingOverlay';
import { EndScreen } from '../components/EndScreen';
import { createInitialState } from '../game/simulation';
import { GameState, Player } from '../game/types';

function createTestState(): GameState {
  const code = 'TEST';
  const state = createInitialState(code);
  const player1: Player = {
    id: 'host',
    name: 'Host',
    characterId: 'reps',
    boat: { x: 400, y: 450, heading: 0, vx:0, vy:0, speed: 0, hupenCooldown: 0, trampelnCooldown: 0, ramCooldown: 0, trampelnStamina: 100, alive: true, stats: { hupen: 0, trampeln: 0, rams: 0, healTime: 0 }},
    input: { joystickX: 0, joystickY: 0, hupen: false, trampeln: false },
    pressConferenceUsed: false,
    ready: true,
    connected: true,
    lastSeen: Date.now(),
  };
   const player2: Player = {
    id: 'dummy',
    name: 'Dummy',
    characterId: 'hilse',
    boat: { x: 500, y: 450, heading: 0, vx:0, vy:0, speed: 0, hupenCooldown: 0, trampelnCooldown: 0, ramCooldown: 0, trampelnStamina: 100, alive: true, stats: { hupen: 0, trampeln: 0, rams: 0, healTime: 0 }},
    input: { joystickX: 0, joystickY: 0, hupen: false, trampeln: false },
    pressConferenceUsed: false,
    ready: true,
    connected: true,
    lastSeen: Date.now(),
  };
  state.players = { host: player1, dummy: player2 };
  state.phase = 'playing';
  (state as any)._imposterId = 'dummy';
  return state;
}


export function TestView({ onLeave }: { onLeave: () => void }) {
  const [state, setState] = useState(createTestState);
  const stateRef = useRef(state);
  stateRef.current = state;
  
  // Minimal game loop for testing
  useEffect(() => {
    let raf: number;
    let lastTime = performance.now();
    
    // Import stepSimulation dynamically for the test view
    import('../game/simulation').then(({ stepSimulation }) => {
      function loop() {
        const now = performance.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        
        setState(prevState => {
          // Deep copy state to avoid mutations
          const newState = JSON.parse(JSON.stringify(prevState));
          return stepSimulation(newState, dt, now / 1000);
        });
        
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative w-screen h-screen">
      <div className="absolute inset-0">
        <GameCanvas state={state} />
      </div>
       <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur border border-slate-200 rounded-xl px-4 py-3 max-w-xs">
         <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-semibold">Spieler (Test Mode)</div>
         <div className="space-y-1.5">
           {Object.values(state.players).map((p) => (
             <div key={p.id} className={`flex items-center gap-2 text-sm`}>
               <div
                 className="w-5 h-5 rounded-full border"
                 style={{
                   background: `var(--char-${p.characterId})`,
                 }}
               />
               <span className="font-semibold truncate">{p.name}</span>
             </div>
           ))}
         </div>
       </div>
    </div>
  );
}
