import { Router } from 'express';
import { getSonarrUpcoming } from '../sonarr.js';
import { getRadarrUpcoming } from '../radarr.js';

export default function upcomingRoute() {
  const router = Router();

  router.get('/', async (_req, res) => {
    const [sonarr, radarr] = await Promise.all([
      getSonarrUpcoming(),
      getRadarrUpcoming(),
    ]);

    const upcoming = [...sonarr, ...radarr].sort((a, b) => {
      const da = a.airDate ? new Date(a.airDate).getTime() : Infinity;
      const db = b.airDate ? new Date(b.airDate).getTime() : Infinity;
      return da - db;
    });

    res.json({ upcoming, updatedAt: new Date().toISOString() });
  });

  return router;
}
