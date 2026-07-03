import { useState, useEffect } from 'react';
import type { DisplayConfig } from '../hooks/useWebSocket';
import { useLibrary } from '../hooks/useLibrary';
import Weather from './Weather';

function posterUrl(thumb: string) {
  if (!thumb) return '';
  if (thumb.startsWith('/api/')) return thumb;
  if (thumb.startsWith('http://') || thumb.startsWith('https://')) return thumb;
  return `/api/poster?path=${encodeURIComponent(thumb)}`;
}

function formatAirDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const diffDays = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (diffDays <= 0) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function Clock({ format }: { format: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hour12 = format !== '24h';
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12 });
  const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="text-right select-none">
      <div className="text-white/60 text-2xl font-light tracking-wide">{time}</div>
      <div className="text-white/30 text-sm">{date}</div>
    </div>
  );
}

export default function Ambient({ displayConfig }: { displayConfig?: DisplayConfig }) {
  const intervalMs = Math.max(3, parseInt(displayConfig?.SLIDESHOW_INTERVAL || '20', 10)) * 1000;
  const clockFormat = displayConfig?.CLOCK_FORMAT || '12h';
  const showWeather = displayConfig?.SHOW_WEATHER !== 'false';
  const showClock = displayConfig?.SHOW_CLOCK !== 'false';
  const showTitles = displayConfig?.SHOW_TITLES !== 'false';
  const displayName = displayConfig?.DISPLAY_NAME || 'LOBBY';

  const { items, index, setIndex, visible } = useLibrary(intervalMs);
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  useEffect(() => {
    if (items.length > 0) return;
    const t = setTimeout(() => setLoadTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [items.length]);

  const current = items[index];
  const src = current ? posterUrl(current.thumb) : '';
  const loading = items.length === 0;

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0a0a] group">
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
          key={index}
          className="absolute inset-0 ken-burns"
          style={{ willChange: 'transform', animationDuration: `${intervalMs / 1000}s` }}
        >
          <img
            src={src}
            alt={current?.title ?? ''}
            className="w-full h-full object-cover"
            style={{
              opacity: visible ? 1 : 0,
              transition: 'opacity 300ms ease-in-out',
            }}
            onError={() => setIndex((i) => (i + 1) % items.length)}
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

      {/* Title overlay */}
      {showTitles && current && (
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
