import { Router } from 'express';

export default function themeRoute(plex) {
  const router = Router();

  router.get('/:ratingKey', async (req, res) => {
    const { ratingKey } = req.params;
    if (!/^\d+$/.test(ratingKey)) {
      return res.status(400).json({ error: 'Invalid ratingKey' });
    }

    const result = await plex.proxyTheme(ratingKey);
    if (!result) {
      return res.status(404).json({ error: 'No theme available' });
    }

    res.set('Content-Type', result.contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(result.buffer);
  });

  return router;
}
