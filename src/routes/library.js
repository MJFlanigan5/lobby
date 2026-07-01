import { Router } from 'express';

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function mergeById(arrays) {
  const seen = new Set();
  return arrays.flat().filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default function libraryRoute(plex, jellyfin) {
  const router = Router();

  router.get('/random', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '12', 10), 50);
    const half = Math.ceil(limit / 2);
    const [plexItems, jfItems] = await Promise.all([
      plex.getLibraryItems(half),
      jellyfin.getLibraryItems(half),
    ]);
    const items = shuffle(mergeById([plexItems, jfItems])).slice(0, limit);
    res.json({ items });
  });

  router.get('/recent', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const half = Math.ceil(limit / 2);
    const [plexItems, jfItems] = await Promise.all([
      plex.getRecentlyAdded(half),
      jellyfin.getRecentlyAdded(half),
    ]);
    // Recent items keep chronological order (plex and jf interleaved by position)
    const items = mergeById([plexItems, jfItems]).slice(0, limit);
    res.json({ items });
  });

  return router;
}
