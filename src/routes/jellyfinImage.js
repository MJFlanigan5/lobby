import { Router } from 'express';

export default function jellyfinImageRoute(jellyfin) {
  const router = Router();

  router.get('/', async (req, res) => {
    const { id, type = 'Primary' } = req.query;
    // Jellyfin item ids are 32 hex characters; anything else could walk to
    // other Jellyfin endpoints with the admin key attached.
    if (typeof id !== 'string' || !/^[0-9a-f]{32}$/i.test(id)) return res.status(400).json({ error: 'Missing or invalid id' });
    if (!['Primary', 'Backdrop', 'Thumb', 'Logo', 'Banner'].includes(type)) return res.status(400).json({ error: 'Invalid type' });

    const result = await jellyfin.proxyImage(id, type);
    if (!result) return res.status(404).json({ error: 'Image not found' });

    res.set('Content-Type', result.contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(result.buffer);
  });

  return router;
}
