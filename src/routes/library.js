import { Router } from 'express';

export default function libraryRoute(plex) {
  const router = Router();

  router.get('/random', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '12', 10), 50);
    const items = await plex.getLibraryItems(limit);
    res.json({ items });
  });

  router.get('/recent', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const items = await plex.getRecentlyAdded(limit);
    res.json({ items });
  });

  return router;
}
