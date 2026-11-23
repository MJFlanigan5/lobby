import { Router } from 'express';

export default function posterRoute(plex) {
  const router = Router();

  router.get('/', async (req, res) => {
    const thumbPath = req.query.path;
    // Only Plex artwork paths: anything else would be fetched with the Plex
    // token for whoever asked (account data, whole movie files). Also rejects
    // ?path=a&path=b, which arrives as an array and used to crash the server.
    if (typeof thumbPath !== 'string' || !/^\/library\/(metadata|collections)\/\d+\/(thumb|art|clearLogo|banner|composite)(\/\d+)?$/.test(thumbPath)) {
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
