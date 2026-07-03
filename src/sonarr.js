import { getConfig } from './config.js';

export async function getSonarrUpcoming() {
  const { SONARR_URL: url, SONARR_API_KEY: key } = getConfig();
  if (!url || !key) return [];

  try {
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 14 * 86400_000).toISOString().split('T')[0];
    const res = await fetch(
      `${url.replace(/\/$/, '')}/api/v3/calendar?start=${start}&end=${end}`,
      { headers: { 'X-Api-Key': key } }
    );
    if (!res.ok) return [];
    const items = await res.json();
    return items.map((ep) => ({
      title: ep.series?.title || ep.title || 'Unknown',
      subtitle: ep.title || '',
      airDate: ep.airDateUtc || ep.airDate,
      thumb: ep.series?.remotePoster ||
        ep.series?.images?.find((i) => i.coverType === 'poster')?.remoteUrl || '',
      type: 'episode',
    }));
  } catch (err) {
    console.error('[sonarr] error:', err.message);
    return [];
  }
}
