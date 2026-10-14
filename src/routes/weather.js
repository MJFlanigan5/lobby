import { Router } from 'express';
import { getConfig } from '../config.js';

let cache = null;
let cacheExpiry = 0;
let cacheKey = '';

const SEVERITY_RANK = { Extreme: 4, Severe: 3, Moderate: 2 };

// Highest-severity active NWS alert (Moderate or above) for the point, or null.
// US only; any failure (non-US location, NWS down) just means no alert.
async function fetchAlert(lat, lon) {
  try {
    const r = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
      headers: { 'User-Agent': 'lobby (github.com/MJFlanigan5/lobby)', Accept: 'application/geo+json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const { features = [] } = await r.json();
    const top = features
      .map((f) => f.properties)
      .filter((p) => SEVERITY_RANK[p.severity])
      .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])[0];
    return top ? { event: top.event, severity: top.severity } : null;
  } catch {
    return null;
  }
}

export default function weatherRoute() {
  const router = Router();

  router.get('/', async (_req, res) => {
    const { LATITUDE, LONGITUDE, TEMP_UNIT } = getConfig();
    if (!LATITUDE || !LONGITUDE) {
      return res.status(400).json({ error: 'Location not configured. Add LATITUDE and LONGITUDE in setup.' });
    }

    const now = Date.now();
    const key = `${LATITUDE},${LONGITUDE},${TEMP_UNIT}`;
    if (cache && now < cacheExpiry && cacheKey === key) {
      return res.json(cache);
    }

    try {
      const unit = TEMP_UNIT === 'fahrenheit' ? 'fahrenheit' : 'celsius';
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
        `&current=temperature_2m,weather_code` +
        `&temperature_unit=${unit}&timezone=auto`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      let r;
      try {
        r = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
      if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
      const data = await r.json();

      const result = {
        temp: Math.round(data.current.temperature_2m),
        unit: unit === 'fahrenheit' ? 'F' : 'C',
        code: data.current.weather_code ?? data.current.weathercode,
        alert: await fetchAlert(LATITUDE, LONGITUDE),
      };

      cache = result;
      cacheExpiry = now + 10 * 60_000;
      cacheKey = key;
      res.json(result);
    } catch (e) {
      if (cache) return res.json(cache); // serve stale on error
      res.status(502).json({ error: e.message });
    }
  });

  return router;
}
