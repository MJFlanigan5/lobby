export async function getSonarrUpcoming() {
  const url = process.env.SONARR_URL;
  const key = process.env.SONARR_API_KEY;
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
      thumb: ep.series?.remotePoster || '',
      type: 'episode',
    }));
  } catch (err) {
    console.error('[sonarr] error:', err.message);
    return [];
  }
}
