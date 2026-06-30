export async function getRadarrUpcoming() {
  const url = process.env.RADARR_URL;
  const key = process.env.RADARR_API_KEY;
  if (!url || !key) return [];

  try {
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 30 * 86400_000).toISOString().split('T')[0];
    const res = await fetch(
      `${url.replace(/\/$/, '')}/api/v3/calendar?start=${start}&end=${end}`,
      { headers: { 'X-Api-Key': key } }
    );
    if (!res.ok) return [];
    const items = await res.json();
    return items.map((movie) => ({
      title: movie.title || 'Unknown',
      airDate: movie.digitalRelease || movie.physicalRelease || movie.inCinemas,
      thumb: movie.remotePoster || '',
      type: 'movie',
    }));
  } catch (err) {
    console.error('[radarr] error:', err.message);
    return [];
  }
}
