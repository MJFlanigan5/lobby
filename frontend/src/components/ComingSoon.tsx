import { useState, useEffect } from 'react';
import type { UpcomingItem } from '../types';

function formatDate(dateStr?: string) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ComingSoon() {
  const [items, setItems] = useState<UpcomingItem[]>([]);

  const load = () => {
    fetch('/api/upcoming')
      .then((r) => r.json())
      .then((d) => setItems(d.upcoming || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full h-full bg-[#0a0a0a] overflow-auto p-8">
      <h1
        className="text-white text-sm font-bold tracking-[0.4em] uppercase mb-8 select-none"
        style={{ opacity: 0.4 }}
      >
        COMING SOON
      </h1>

      {items.length === 0 && (
        <p className="text-gray-600 text-sm">No upcoming items found.</p>
      )}

      <div className="grid grid-cols-3 gap-5">
        {items.map((item, i) => (
          <div
            key={`${item.title}-${i}`}
            className="bg-[#111] overflow-hidden fade-in"
          >
            {item.thumb ? (
              <img
                src={item.thumb}
                alt={item.title}
                className="w-full aspect-[2/3] object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-[#1a1a1a]" />
            )}
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-semibold tracking-wider px-1.5 py-0.5 rounded-sm ${
                    item.type === 'movie'
                      ? 'bg-blue-900/60 text-blue-300'
                      : 'bg-purple-900/60 text-purple-300'
                  }`}
                >
                  {item.type === 'movie' ? 'MOVIE' : 'EPISODE'}
                </span>
                <span className="text-xs text-gray-500">{formatDate(item.airDate)}</span>
              </div>
              <p className="text-white text-sm font-semibold leading-tight mt-1">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="text-gray-500 text-xs mt-0.5">{item.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
