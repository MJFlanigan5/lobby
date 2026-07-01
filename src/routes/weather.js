import { Router } from 'express';
import { getConfig } from '../config.js';

let cache = null;
let cacheExpiry = 0;
let cacheKey = '';

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
        `&current=temperature_2m,weathercode` +
        `&temperature_unit=${unit}&timezone=auto`;

      const r = await fetch(url);
      if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
      const data = await r.json();

      const result = {
        temp: Math.round(data.current.temperature_2m),
        unit: unit === 'fahrenheit' ? 'F' : 'C',
        code: data.current.weathercode,
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
