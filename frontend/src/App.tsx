import { useEffect, useMemo } from 'react';
import { useSessions } from './hooks/useSessions';
import NowPlaying from './components/NowPlaying';
import Ambient from './components/Ambient';
import ComingSoon from './components/ComingSoon';

export default function App() {
  const { sessions, connected } = useSessions();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const mode = params.get('mode');
  const isPortrait = mode === 'portrait';
  const isComingSoon = mode === 'coming-soon';

  useEffect(() => {
    if (isPortrait) {
      document.getElementById('root')?.classList.add('portrait');
    }
  }, [isPortrait]);

  if (isComingSoon) {
    return <ComingSoon />;
  }

  return (
    <div className="w-full h-full bg-[#0a0a0a] relative overflow-hidden grain">
      {!connected && sessions.length === 0 && (
        <div className="absolute top-3 right-3 z-50">
          <span className="text-xs text-gray-600 bg-black/60 px-2 py-1 rounded">
            connecting...
          </span>
        </div>
      )}
      {sessions.length > 0 ? (
        <NowPlaying sessions={sessions} />
      ) : (
        <Ambient />
      )}
    </div>
  );
}
