import { useState, useEffect } from 'react';
import type { DisplayConfig } from '../hooks/useWebSocket';
import { useLibrary } from '../hooks/useLibrary';
import { useSessions } from '../hooks/useSessions';
import Weather from './Weather';
import { Clock, formatAirDate } from './clockUtils';
import ThemeMusicPlayer from './ThemeMusicPlayer';

function posterUrl(thumb: string) {
  if (!thumb) return '';
  if (thumb.startsWith('/api/')) return thumb;
  if (thumb.startsWith('http://') || thumb.startsWith('https://')) return thumb;
  return `/api/poster?path=${encodeURIComponent(thumb)}`;
}

export default function Poster({ displayConfig }: { displayConfig?: DisplayConfig }) {
  const intervalMs = Math.max(3, parseInt(displayConfig?.SLIDESHOW_INTERVAL || '20', 10)) * 1000;
  const clockFormat = displayConfig?.CLOCK_FORMAT || '12h';
  const showWeather = displayConfig?.SHOW_WEATHER !== 'false';
  const showClock = displayConfig?.SHOW_CLOCK !== 'false';
  const showTitles = displayConfig?.SHOW_TITLES !== 'false';
  const displayName = displayConfig?.DISPLAY_NAME || 'LOBBY';

  const { sessions } = useSessions();
  const activeVideoSession = sessions.find((s) => s.type !== 'track');

  const { items, index, setIndex, visible } = useLibrary(intervalMs);
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  useEffect(() => {
    if (items.length > 0 || activeVideoSession) return;
    const t = setTimeout(() => setLoadTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [items.length, activeVideoSession]);

  const current = activeVideoSession ? null : items[index];
  const src = activeVideoSession
    ? posterUrl(activeVideoSession.thumb)
    : current
    ? posterUrl(current.thumb)
    : '';
  const loading = items.length === 0 && !activeVideoSession;

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0a0a] group">
      {/* current is null whenever a real session is active — theme music only
          plays for the cycling library screensaver, never over a real session
          someone might actually be watching in the room. */}
      <ThemeMusicPlayer
        ratingKey={current?.id}
        enabled={displayConfig?.THEME_MUSIC_ENABLED === 'true'}
      />
      {/* Blurred background — same image, zoomed + blurred to fill 16:9 */}
      {src && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{
            filter: 'blur(48px)',
            opacity: visible ? 0.28 : 0,
            transition: 'opacity 300ms ease-in-out',
          }}
        />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      {loading && !loadTimedOut && (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #111 0%, #0a0a0a 50%, #111 100%)' }}
        />
      )}
      {loading && loadTimedOut && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <p className="text-white/20 text-sm tracking-widest uppercase">No library content</p>
          <p className="text-white/10 text-xs">
            Configure Plex or Jellyfin in{' '}
            <a href="/?page=setup" className="text-white/25 hover:text-white/50 underline">Setup</a>
          </p>
        </div>
      )}

      {/* Centered poster + metadata */}
      {!loading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms ease-in-out' }}
        >
          {src && (
            <div className="relative shrink-0">
              {current?.upcoming && (
                <span className="absolute top-3 left-3 z-10 text-xs font-semibold tracking-widest bg-amber-500/90 text-black px-2 py-0.5 rounded-sm">
                  COMING SOON
                </span>
              )}
              <img
                src={src}
                alt={activeVideoSession?.title ?? current?.title ?? ''}
                className="aspect-[2/3] object-cover rounded-sm shadow-2xl"
                style={{ height: 'min(76vh, 540px)' }}
                onError={() => { if (items.length > 0) setIndex((i) => (i + 1) % items.length); }}
              />
            </div>
          )}

          {showTitles && activeVideoSession && (
            <div className="text-center w-full" style={{ maxWidth: 'min(360px, 80vw)' }}>
              <p className="text-white text-xl font-bold tracking-tight leading-snug">
                {activeVideoSession.title}
              </p>
              <p className="text-white/40 text-xs mt-1.5 tracking-widest uppercase font-light">
                {[
                  activeVideoSession.subtitle || null,
                  activeVideoSession.year ? String(activeVideoSession.year) : null,
                ].filter(Boolean).join(' · ')}
              </p>

              {/* Progress bar */}
              {activeVideoSession.duration > 0 && (
                <div className="mt-3">
                  <div className="h-[2px] w-full bg-white/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/70 rounded-full transition-all duration-1000"
                      style={{ width: `${activeVideoSession.progress}%` }}
                    />
                  </div>
                  {activeVideoSession.state === 'playing' && (
                    <p className="mt-1 text-[10px] text-white/25 text-right tabular-nums tracking-wider">
                      ends {new Date(Date.now() + Math.max(0, activeVideoSession.duration - activeVideoSession.viewOffset)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              )}

              {/* Metadata badges */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center mt-3">
                {activeVideoSession.state === 'paused' && (
                  <span className="text-xs font-semibold tracking-widest bg-white/10 text-white/50 px-2 py-0.5 rounded-sm">
                    PAUSED
                  </span>
                )}
                {activeVideoSession.contentRating && (
                  <span className="text-xs font-semibold tracking-widest bg-white/10 text-white/50 px-2 py-0.5 rounded-sm">
                    {activeVideoSession.contentRating}
                  </span>
                )}
                {activeVideoSession.resolution && (
                  <span className="text-xs font-semibold tracking-widest bg-white/10 text-white/50 px-2 py-0.5 rounded-sm">
                    {activeVideoSession.resolution}
                  </span>
                )}
                {activeVideoSession.atmos && (
                  <span className="text-xs font-semibold tracking-widest bg-white/10 text-white/50 px-2 py-0.5 rounded-sm">
                    ATMOS
                  </span>
                )}
                {activeVideoSession.duration > 0 && (
                  <span className="text-xs text-white/30 tracking-widest">
                    {Math.round(activeVideoSession.duration / 60000)}m
                  </span>
                )}
                <span className="text-xs text-white/30 tracking-widest">{activeVideoSession.username}</span>
                <span className="text-xs text-white/20 tracking-widest">{activeVideoSession.player}</span>
              </div>
            </div>
          )}
          {showTitles && current && !activeVideoSession && (
            <div className="text-center max-w-sm">
              <p className="text-white text-xl font-bold tracking-tight leading-snug">
                {current.title}
              </p>
              <p className="text-white/40 text-xs mt-1.5 tracking-widest uppercase font-light">
                {current.upcoming
                  ? [
                      current.subtitle || null,
                      current.airDate ? formatAirDate(current.airDate) : null,
                    ].filter(Boolean).join(' · ')
                  : [
                      current.year ? String(current.year) : null,
                      current.type === 'show' ? 'TV Series' : 'Movie',
                      !!current.runtime ? `${current.runtime}m` : null,
                      !!current.rating ? `${current.rating}%` : null,
                    ].filter(Boolean).join(' · ')
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <div className="absolute top-6 left-8 z-20 flex items-center gap-4">
        <span className="text-white/0 text-sm font-bold tracking-[0.4em] uppercase select-none group-hover:text-white/40 transition-all duration-500">
          {displayName}
        </span>
        <a
          href="/?page=setup"
          className="text-white/0 text-xs group-hover:text-white/50 hover:!text-white/80 transition-all duration-500 tracking-widest uppercase"
        >
          Setup
        </a>
        <a
          href="/?page=control"
          className="text-white/0 text-xs group-hover:text-white/50 hover:!text-white/80 transition-all duration-500 tracking-widest uppercase"
        >
          Control
        </a>
      </div>

      {showWeather && (
        <div className="absolute bottom-6 left-8 z-20">
          <Weather />
        </div>
      )}

      {showClock && (
        <div className="absolute bottom-6 right-8 z-20">
          <Clock format={clockFormat} />
        </div>
      )}
    </div>
  );
}
