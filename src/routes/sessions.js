import { Router } from 'express';

export default function sessionsRoute(plex) {
  const router = Router();

  router.get('/', async (_req, res) => {
    const sessions = await plex.getSessions();
    res.json({
      sessions,
      count: sessions.length,
      updatedAt: new Date().toISOString(),
    });
  });

  return router;
}
