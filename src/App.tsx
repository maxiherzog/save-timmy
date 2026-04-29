import { useEffect, useState } from 'react';
import { Landing } from './pages/Landing';
import { HostView } from './pages/HostView';
import { PlayerView } from './pages/PlayerView';
import { TestView } from './pages/TestView';

type View =
  | { kind: 'landing' }
  | { kind: 'host' }
  | { kind: 'player'; code: string; name: string; playerId: string }
  | { kind: 'test' };

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export default function App() {
  const [view, setView] = useState<View>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('host') === '1') return { kind: 'host' };
    if (params.get('test') === '1') return { kind: 'test' };
    return { kind: 'landing' };
  });

  const [prefillCode, setPrefillCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('join')?.toUpperCase() || '';
  });

  useEffect(() => {
    if (view.kind === 'landing' && prefillCode) {
      const stored = localStorage.getItem(`savetimmy:player:${prefillCode}`);
      if (stored) {
        try {
          const p = JSON.parse(stored);
          if (p.playerId && p.name) {
            setView({ kind: 'player', code: prefillCode, name: p.name, playerId: p.playerId });
          }
        } catch {}
      }
    }
  }, [prefillCode, view.kind]);

  function goHome() {
    const url = new URL(window.location.href);
    url.searchParams.delete('host');
    url.searchParams.delete('join');
    url.searchParams.delete('test');
    window.history.replaceState(null, '', url.toString());
    setPrefillCode('');
    setView({ kind: 'landing' });
  }

  if (view.kind === 'test') return <TestView onLeave={goHome} />;
  if (view.kind === 'host') return <HostView onLeave={goHome} />;

  if (view.kind === 'player') {
    return <PlayerView code={view.code} name={view.name} playerId={view.playerId} onLeave={goHome} />;
  }

  return (
    <Landing
      prefillCode={prefillCode}
      onHost={() => {
        const url = new URL(window.location.href);
        url.searchParams.set('host', '1');
        window.history.replaceState(null, '', url.toString());
        setView({ kind: 'host' });
      }}
      onJoin={(code, name) => {
        const existingRaw = localStorage.getItem(`savetimmy:player:${code}`);
        let playerId: string | null = null;
        if (existingRaw) {
          try {
            const existing = JSON.parse(existingRaw);
            if (existing.playerId) playerId = existing.playerId;
          } catch {}
        }
        if (!playerId) playerId = randomId();
        localStorage.setItem(`savetimmy:player:${code}`, JSON.stringify({ playerId, name }));
        const url = new URL(window.location.href);
        url.searchParams.set('join', code);
        window.history.replaceState(null, '', url.toString());
        setView({ kind: 'player', code, name, playerId });
      }}
    />
  );
}
