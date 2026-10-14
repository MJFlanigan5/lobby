import { getConfig } from './config.js';

// Seerr/Overseerr status enums: request 1=pending approval, 2=approved (3/4/5 declined/failed/completed);
// media 2=pending, 3=processing, 4=partially available (5=available).
const OPEN_REQUEST = new Set([1, 2]);
const NOT_YET_AVAILABLE = new Set([2, 3, 4]);

const details = new Map(); // `${type}:${tmdbId}` -> { title, thumb, releaseDate }

async function seerrFetch(base, key, path) {
  const res = await fetch(`${base}/api/v1${path}`, {
    headers: { 'X-Api-Key': key },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Seerr ${path} → ${res.status}`);
  return res.json();
}

async function getDetails(base, key, type, tmdbId) {
  const k = `${type}:${tmdbId}`;
  if (details.has(k)) return details.get(k);
  const d = await seerrFetch(base, key, `/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}`);
  const out = {
    title: d.title || d.name || 'Unknown',
    thumb: d.posterPath ? `https://image.tmdb.org/t/p/w342${d.posterPath}` : '',
    releaseDate: d.releaseDate || d.firstAirDate || '',
  };
  details.set(k, out);
  return out;
}

function statusLabel(request) {
  if (request.status === 1) return 'Pending';
  if (request.media.status === 3) return 'Downloading';
  if (request.media.status === 4) return 'Partial';
  return 'Approved';
}

// Open (not yet available) requests, shaped like Sonarr/Radarr upcoming items.
export async function getSeerrRequests() {
  const { SEERR_URL: url, SEERR_API_KEY: key } = getConfig();
  if (!url || !key) return [];
  const base = url.replace(/\/$/, '');

  try {
    const { results = [] } = await seerrFetch(base, key, '/request?take=30&sort=added');
    const open = results
      .filter((r) => OPEN_REQUEST.has(r.status) && NOT_YET_AVAILABLE.has(r.media?.status) && r.media?.tmdbId)
      .slice(0, 12);

    const items = await Promise.all(open.map(async (r) => {
      try {
        const type = r.type === 'movie' ? 'movie' : 'show';
        const d = await getDetails(base, key, type, r.media.tmdbId);
        const future = d.releaseDate && new Date(d.releaseDate).getTime() > Date.now();
        return {
          title: d.title,
          subtitle: `Requested by ${r.requestedBy?.displayName || 'someone'}`,
          airDate: future ? d.releaseDate : undefined,
          thumb: d.thumb,
          type,
          source: 'seerr',
          statusLabel: statusLabel(r),
        };
      } catch {
        return null; // one bad lookup shouldn't drop the rest
      }
    }));
    return items.filter(Boolean);
  } catch (err) {
    console.error('[seerr] error:', err.message);
    return [];
  }
}
