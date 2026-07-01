import { useEffect, useMemo, useState } from 'react';
import { useSessions } from './hooks/useSessions';
import NowPlaying from './components/NowPlaying';
import Ambient from './components/Ambient';
import ComingSoon from './components/ComingSoon';
import ControlPanel from './components/ControlPanel';
import SetupPage from './components/SetupPage';

export default function App() {
  const { sessions, connected, serverMode } = useSessions();
  const [unconfigured, setUnconfigured] = useState<boolean | null>(null);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const urlMode = params.get('mode');
  const urlPage = params.get('page');
  const isPortrait = urlMode === 'portrait';

  // Server-pushed mode takes priority over URL param
  const activeMode = serverMode ?? urlMode;

  useEffect(() => {
    if (isPortrait) {
      document.getElementById('root')?.classList.add('portrait');
    }
  }, [isPortrait]);

  // On first load, check if anything is configured — redirect to setup if not
  useEffect(() => {
    if (urlPage) return; // already on a named page, don't redirect
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => {
        setUnconfigured(!d.plex && !d.sonarr && !d.radarr);
      })
      .catch(() => setUnconfigured(false));
  }, [urlPage]);

  if (urlPage === 'control') {
    return <ControlPanel currentMode={activeMode} />;
  }

  // Hold render until health check resolves (prevents flicker to main display on first run)
  if (unconfigured === null && !urlPage) return null;

  if (urlPage === 'setup' || unconfigured) {
    return <SetupPage firstRun={!!unconfigured && urlPage !== 'setup'} />;
  }

  if (activeMode === 'coming-soon') {
    return <ComingSoon />;
  }

  if (activeMode === 'ambient') {
    return <Ambient />;
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
