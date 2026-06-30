import { useState, useEffect } from 'react';

interface WeatherData {
  temp: number;
  unit: string;
  code: number;
}

function wmoCondition(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return code === 1 ? 'Mostly Clear' : code === 2 ? 'Partly Cloudy' : 'Overcast';
  if (code <= 48) return 'Fog';
  if (code <= 55) return 'Drizzle';
  if (code <= 65) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow Showers';
  return 'Thunderstorm';
}

export default function Weather() {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    const load = () => {
      fetch('/api/weather')
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d && setData(d))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 10 * 60_000);
    return () => clearInterval(id);
  }, []);

  if (!data) return null;

  return (
    <div className="select-none">
      <div className="text-white/60 text-2xl font-light tracking-wide">
        {data.temp}°{data.unit}
      </div>
      <div className="text-white/30 text-sm">{wmoCondition(data.code)}</div>
    </div>
  );
}
