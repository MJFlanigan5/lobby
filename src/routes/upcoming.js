import { Router } from 'express';
import { getSonarrUpcoming } from '../sonarr.js';
import { getRadarrUpcoming } from '../radarr.js';
import { getSeerrRequests } from '../seerr.js';

export default function upcomingRoute() {
  const router = Router();

  router.get('/', async (_req, res) => {
    const [sonarr, radarr, seerr] = await Promise.all([
      getSonarrUpcoming(),
      getRadarrUpcoming(),
      getSeerrRequests(),
    ]);

    // A requested title that Sonarr/Radarr already lists on the calendar stays as the calendar entry.
    const listed = new Set([...sonarr, ...radarr].map((i) => i.title.toLowerCase()));
    const requested = seerr.filter((i) => !listed.has(i.title.toLowerCase()));

    const upcoming = [...sonarr, ...radarr, ...requested].sort((a, b) => {
      const da = a.airDate ? new Date(a.airDate).getTime() : Infinity;
      const db = b.airDate ? new Date(b.airDate).getTime() : Infinity;
      return da - db;
    });

    res.json({ upcoming, updatedAt: new Date().toISOString() });
  });

  return router;
}
