import { Router } from 'express';

export default function jellyfinImageRoute(jellyfin) {
  const router = Router();

  router.get('/', async (req, res) => {
    const { id, type = 'Primary' } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const result = await jellyfin.proxyImage(id, type);
    if (!result) return res.status(404).json({ error: 'Image not found' });

    res.set('Content-Type', result.contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(result.buffer);
  });

  return router;
}
