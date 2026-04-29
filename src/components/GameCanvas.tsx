import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { GameState } from '../game/types';
import { MAP_W, MAP_H, WHALE_MAX_HP } from '../game/types';
import GameScene from '../game/phaser/GameScene';

type Props = { state: GameState };

export function GameCanvas({ state }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<GameScene | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL,
      parent: containerRef.current,
      width: MAP_W,
      height: MAP_H,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: GameScene,
      backgroundColor: '#052e3a',
    };
    
    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.events.on('ready', () => {
      const scene = game.scene.getScene('GameScene') as GameScene;
      scene.init({ state });
      sceneRef.current = scene;
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateState(state);
    }
  }, [state]);

  return (
    <div className="w-full h-screen relative" style={{ overflow: 'hidden' }}>
      <div ref={containerRef} className="w-full h-screen" />
      <HUD state={state} />
    </div>
  );
}

function HUD({ state }: { state: GameState }) {
  const hpPct = (state.whale.hp / WHALE_MAX_HP) * 100;
  const minutes = Math.floor(state.timeElapsed / 60);
  const seconds = Math.floor(state.timeElapsed % 60);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none w-[420px]">
        <div className="text-xs font-bold tracking-widest text-white/80 drop-shadow-md">TIMMY</div>
        <div className="w-full h-8 bg-black/50 rounded-full overflow-hidden border-2 border-white/30 relative shadow-lg">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${hpPct}%`,
              background: hpPct > 60 ? 'linear-gradient(90deg,#10b981,#34d399)' : hpPct > 30 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#b91c1c,#ef4444)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow-md font-mono">
            {Math.ceil(state.whale.hp)} / {WHALE_MAX_HP}
          </div>
        </div>
      </div>
      
      <div className="absolute top-4 right-4 bg-black/60 rounded-xl border border-white/10 px-5 py-3 text-white pointer-events-none shadow-xl backdrop-blur-sm">
        <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Spielzeit</div>
        <div className="text-3xl font-black font-mono tracking-tighter text-amber-400 drop-shadow-sm">
          {timeStr}
        </div>
      </div>
    </>
  );
}
