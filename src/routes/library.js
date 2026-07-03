import { Router } from 'express';
import { getConfig } from '../config.js';

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

  function applyFilter(items) {
    const filter = getConfig().LIBRARY_FILTER || 'all';
    if (filter === 'movies') return items.filter((i) => i.type === 'movie');
    if (filter === 'shows') return items.filter((i) => i.type === 'show');
    return items;
  }

  router.get('/random', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '12', 10), 100);
    const half = Math.ceil(limit / 2);
    const [plexItems, jfItems] = await Promise.all([
      plex.getLibraryItems(half),
      jellyfin.getLibraryItems(half),
    ]);
    const items = applyFilter(shuffle(mergeById([plexItems, jfItems]))).slice(0, limit);
    res.json({ items });
  });

  router.get('/recent', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const half = Math.ceil(limit / 2);
    const [plexItems, jfItems] = await Promise.all([
      plex.getRecentlyAdded(half),
      jellyfin.getRecentlyAdded(half),
    ]);
    const items = applyFilter(mergeById([plexItems, jfItems])).slice(0, limit);
    res.json({ items });
  });

  return router;
}
