import { useState, useEffect, useRef } from 'react';
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

export default function Ambient({ displayConfig }: { displayConfig?: DisplayConfig }) {
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
  const kbRef = useRef<HTMLDivElement>(null);

  // Restart Ken Burns animation when slide changes.
  // Fires while the image is near-opacity-0 (just as fade-in begins),
  // so the scale reset from 1.08→1.0 is invisible to the viewer.
  useEffect(() => {
    const el = kbRef.current;
    if (!el) return;
    el.style.animationName = 'none';
    void el.offsetHeight; // force reflow
    el.style.animationName = '';
  }, [index]);

  useEffect(() => {
    if (items.length > 0) return;
    const t = setTimeout(() => setLoadTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [items.length]);

  const current = activeVideoSession ? null : items[index];
  const src = activeVideoSession
    ? posterUrl(activeVideoSession.art || activeVideoSession.thumb)
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
      {loading && !loadTimedOut && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #111 0%, #0a0a0a 50%, #111 100%)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 4s ease infinite',
          }}
        />
      )}
      {loading && loadTimedOut && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <p className="text-white/20 text-sm tracking-widest uppercase">No library content</p>
          <p className="text-white/10 text-xs">Configure Plex or Jellyfin in <a href="/?page=setup" className="text-white/25 hover:text-white/50 underline">Setup</a></p>
        </div>
      )}
      {src && (
        <div
          ref={kbRef}
          className="absolute inset-0 ken-burns"
          style={{ willChange: 'transform', animationDuration: `${intervalMs / 1000}s` }}
        >
          <img
            src={src}
            alt={activeVideoSession?.title ?? current?.title ?? ''}
            className="w-full h-full object-cover"
            style={{
              opacity: activeVideoSession ? 1 : visible ? 1 : 0,
              transition: activeVideoSession ? 'none' : 'opacity 300ms ease-in-out',
            }}
            onError={() => { if (items.length > 0) setIndex((i) => (i + 1) % items.length); }}
          />
        </div>
      )}

      {/* Dark vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Bottom gradient for title legibility */}
      {showTitles && (
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: '45%', background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)' }}
        />
      )}

      {/* Nav */}
      <div className="absolute top-6 left-8 z-20 flex items-center gap-4">
        <span
          className="text-white/0 text-sm font-bold tracking-[0.4em] uppercase select-none group-hover:text-white/40 transition-all duration-500"
        >
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

      {/* Title overlay — session takes priority over library item */}
      {showTitles && activeVideoSession && (
        <div className="absolute bottom-20 left-10 right-10 z-20 pointer-events-none">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold tracking-widest bg-white/15 text-white/80 px-2 py-0.5 rounded-sm">
              {activeVideoSession.state === 'paused' ? 'PAUSED' : 'NOW PLAYING'}
            </span>
          </div>
          <p className="text-white text-4xl font-bold leading-tight tracking-tight drop-shadow-lg line-clamp-2">
            {activeVideoSession.title}
          </p>
          <p className="text-white/55 text-base mt-2 tracking-widest uppercase drop-shadow font-light">
            {[
              activeVideoSession.subtitle || null,
              activeVideoSession.year ? String(activeVideoSession.year) : null,
            ].filter(Boolean).join(' · ')}
          </p>
        </div>
      )}
      {showTitles && current && !activeVideoSession && (
        <div
          className="absolute bottom-20 left-10 right-10 z-20 pointer-events-none"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms ease-in-out' }}
        >
          <p className="text-white text-4xl font-bold leading-tight tracking-tight drop-shadow-lg line-clamp-2">
            {current.title}
          </p>
          <p className="text-white/55 text-base mt-2 tracking-widest uppercase drop-shadow font-light">
            {current.upcoming
              ? [
                  current.subtitle || null,
                  current.type === 'episode' ? 'New Episode' : 'New Release',
                ].filter(Boolean).join(' · ')
              : [
                  current.year ? `Released ${current.year}` : null,
                  current.type === 'show' ? 'TV Series' : 'Movie',
                ].filter(Boolean).join(' · ')
            }
          </p>
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {current.upcoming ? (
              <>
                <span className="text-xs font-semibold tracking-widest bg-amber-500/90 text-black px-2 py-0.5 rounded-sm">
                  COMING SOON
                </span>
                {current.airDate && (
                  <span className="text-xs text-white/35 tracking-widest uppercase font-light drop-shadow">
                    {formatAirDate(current.airDate)}
                  </span>
                )}
              </>
            ) : (
              <>
                {current.contentRating && (
                  <span className="text-xs font-semibold tracking-widest bg-black/50 text-white/60 px-2 py-0.5 rounded-sm">
                    {current.contentRating}
                  </span>
                )}
                {current.studio && (
                  <span className="text-xs text-white/35 tracking-widest uppercase font-light drop-shadow">{current.studio}</span>
                )}
                {!!current.runtime && (
                  <span className="text-xs text-white/35 tracking-widest uppercase font-light drop-shadow">{current.runtime}m</span>
                )}
                {!!current.rating && (
                  <span className="text-xs text-white/35 tracking-widest uppercase font-light drop-shadow">{current.rating}%</span>
                )}
              </>
            )}
          </div>
        </div>
      )}

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
