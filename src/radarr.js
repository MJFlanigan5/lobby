import { getConfig } from './config.js';

export async function getRadarrUpcoming() {
  const { RADARR_URL: url, RADARR_API_KEY: key } = getConfig();
  if (!url || !key) return [];

  try {
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 30 * 86400_000).toISOString().split('T')[0];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let res;
    try {
      res = await fetch(
        `${url.replace(/\/$/, '')}/api/v3/calendar?start=${start}&end=${end}`,
        { headers: { 'X-Api-Key': key }, signal: controller.signal }
      );
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return [];
    const items = await res.json();
    return items.map((movie) => ({
      title: movie.title || 'Unknown',
      airDate: movie.digitalRelease || movie.physicalRelease || movie.inCinemas,
      thumb: movie.remotePoster ||
        movie.images?.find((i) => i.coverType === 'poster')?.remoteUrl || '',
      type: 'movie',
    }));
  } catch (err) {
    console.error('[radarr] error:', err.message);
    return [];
  }
}
