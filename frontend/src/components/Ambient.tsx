import { useState, useEffect, useRef } from 'react';
import type { LibraryItem } from '../types';

function posterUrl(thumb: string) {
  if (!thumb) return '';
  return `/api/poster?path=${encodeURIComponent(thumb)}`;
}

function Clock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="text-right select-none">
      <div className="text-white/60 text-2xl font-light tracking-wide">{time}</div>
      <div className="text-white/30 text-sm">{date}</div>
    </div>
  );
}

export default function Ambient() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/library/random?limit=20')
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length < 2) return;

    intervalRef.current = setInterval(() => {
      setVisible(false);
      timeoutRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 300);
    }, 8_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [items]);

  const current = items[index];
  const src = current ? posterUrl(current.thumb) : '';

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0a0a]">
      {src && (
        <div
          key={src}
          className="absolute inset-0 ken-burns"
          style={{ willChange: 'transform' }}
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

      {/* LOBBY wordmark — top left */}
      <div className="absolute top-6 left-8 z-20">
        <span
          className="text-white text-sm font-bold tracking-[0.4em] uppercase select-none"
          style={{ opacity: 0.3 }}
        >
          LOBBY
        </span>
      </div>

      {/* Clock — bottom right */}
      <div className="absolute bottom-6 right-8 z-20">
        <Clock />
      </div>
    </div>
  );
}
