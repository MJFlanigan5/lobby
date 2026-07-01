import { Router } from 'express';

export default function sessionsRoute(getSessions) {
  const router = Router();

  router.get('/', async (_req, res) => {
    const sessions = await getSessions();
    res.json({
      sessions,
      count: sessions.length,
      updatedAt: new Date().toISOString(),
    });
  });

  return router;
}
