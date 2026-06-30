import { Router } from 'express';

export default function posterRoute(plex) {
  const router = Router();

  router.get('/', async (req, res) => {
    const thumbPath = req.query.path;
    if (!thumbPath || !thumbPath.startsWith('/')) {
      return res.status(400).json({ error: 'Missing or invalid path' });
    }

    const result = await plex.proxyImage(thumbPath);
    if (!result) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.set('Content-Type', result.contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(result.buffer);
  });

  return router;
}
