import { useState, useEffect } from 'react';

export function formatAirDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const diffDays = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (diffDays <= 0) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function Clock({ format }: { format: string }) {
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
