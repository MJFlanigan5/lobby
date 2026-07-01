import { useState, useEffect, useRef } from 'react';
import type { LibraryItem } from '../types';
import type { DisplayConfig } from '../hooks/useWebSocket';
import Weather from './Weather';

function posterUrl(thumb: string) {
  if (!thumb) return '';
  if (thumb.startsWith('/api/')) return thumb; // Jellyfin paths are already routable
  return `/api/poster?path=${encodeURIComponent(thumb)}`;
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
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const intervalMs = Math.max(3, parseInt(displayConfig?.SLIDESHOW_INTERVAL || '8', 10)) * 1000;
  const clockFormat = displayConfig?.CLOCK_FORMAT || '12h';
  const showWeather = displayConfig?.SHOW_WEATHER !== 'false';
  const showClock = displayConfig?.SHOW_CLOCK !== 'false';
  const displayName = displayConfig?.DISPLAY_NAME || 'LOBBY';

  useEffect(() => {
    Promise.all([
      fetch('/api/library/recent?limit=15').then((r) => r.json()).catch(() => ({ items: [] })),
      fetch('/api/library/random?limit=15').then((r) => r.json()).catch(() => ({ items: [] })),
    ]).then(([recent, random]) => {
      const seen = new Set<string>();
      const merged: LibraryItem[] = [];
      for (const item of [...(recent.items || []), ...(random.items || [])]) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }
      setItems(merged);
    });
  }, []);

  useEffect(() => {
    if (items.length < 2) return;

    intervalRef.current = setInterval(() => {
      setVisible(false);
      timeoutRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 300);
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [items, intervalMs]);

  const current = items[index];
  const src = current ? posterUrl(current.thumb) : '';
  const loading = items.length === 0;

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0a0a]">
      {loading && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #111 0%, #0a0a0a 50%, #111 100%)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 4s ease infinite',
          }}
        />
      )}
      {src && (
        <div
          key={src}
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

      {/* LOBBY wordmark + nav — top left */}
      <div className="absolute top-6 left-8 z-20 flex items-center gap-4">
        <span
          className="text-white text-sm font-bold tracking-[0.4em] uppercase select-none"
          style={{ opacity: 0.3 }}
        >
          {displayName}
        </span>
        <a
          href="/?page=setup"
          className="text-white/25 text-xs hover:text-white/60 transition-colors tracking-widest uppercase"
        >
          Setup
        </a>
        <a
          href="/?page=control"
          className="text-white/25 text-xs hover:text-white/60 transition-colors tracking-widest uppercase"
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
