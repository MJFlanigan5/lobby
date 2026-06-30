import { useState } from 'react';

interface ControlPanelProps {
  currentMode: string | null;
}

type Mode = 'auto' | 'ambient' | 'coming-soon';

const MODES: { id: Mode; label: string; description: string }[] = [
  { id: 'auto',        label: 'Auto',        description: 'Now Playing when active, Ambient when idle' },
  { id: 'ambient',     label: 'Ambient',     description: 'Poster screensaver with clock' },
  { id: 'coming-soon', label: 'Coming Soon', description: 'Upcoming releases from Sonarr & Radarr' },
];

export default function ControlPanel({ currentMode }: ControlPanelProps) {
  const [sending, setSending] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmedMode, setConfirmedMode] = useState<string | null>(currentMode);

  const activeMode = confirmedMode ?? currentMode ?? 'auto';

  const push = async (mode: Mode) => {
    setSending(mode);
    setError(null);
    try {
      const res = await fetch('/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setConfirmedMode(mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-white/40 text-xs font-bold tracking-[0.4em] uppercase mb-8 text-center select-none">
          LOBBY CONTROL
        </h1>

        <div className="flex flex-col gap-3">
          {MODES.map(({ id, label, description }) => {
            const isActive = activeMode === id;
            const isLoading = sending === id;

            return (
              <button
                key={id}
                onClick={() => push(id)}
                disabled={!!sending}
                className={`w-full text-left px-5 py-4 rounded transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white hover:bg-white/10 active:bg-white/15'
                } ${sending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm tracking-wide">{label}</span>
                  {isLoading && (
                    <span className={`text-xs ${isActive ? 'text-black/50' : 'text-white/40'}`}>
                      sending...
                    </span>
                  )}
                  {isActive && !isLoading && (
                    <span className="text-xs text-black/50 font-medium">ACTIVE</span>
                  )}
                </div>
                <p className={`text-xs mt-1 ${isActive ? 'text-black/50' : 'text-white/30'}`}>
                  {description}
                </p>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 text-red-400 text-xs text-center">{error}</p>
        )}

        <p className="mt-8 text-white/15 text-xs text-center select-none">
          Changes push to all connected screens instantly
        </p>

        <div className="mt-6 flex gap-4 justify-center text-xs text-white/20">
          <a href="/?page=setup" className="hover:text-white/40 transition-colors">Setup</a>
          <a href="/" className="hover:text-white/40 transition-colors">Display</a>
        </div>
      </div>
    </div>
  );
}
