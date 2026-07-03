export class Jellyfin {
  constructor({ jellyfinUrl, apiKey }) {
    this.baseUrl = jellyfinUrl?.replace(/\/$/, '') || '';
    this.apiKey = apiKey || '';
  }

  get configured() {
    return !!(this.baseUrl && this.apiKey);
  }

  async fetch(path) {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${path}${sep}api_key=${this.apiKey}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Jellyfin ${path} → ${res.status}`);
    return res.json();
  }

  async getSessions() {
    if (!this.configured) return [];
    try {
      const raw = await this.fetch('/Sessions?activeWithinSeconds=60');
      const sessions = Array.isArray(raw) ? raw : [];
      return sessions
        .filter((s) => s.NowPlayingItem)
        .map((s) => {
          const item = s.NowPlayingItem;
          const isEpisode = item.Type === 'Episode';
          const isAudio = item.Type === 'Audio';

          const duration = Math.round((item.RunTimeTicks || 0) / 10_000);
          const viewOffset = Math.round((s.PlayState?.PositionTicks || 0) / 10_000);
          const progress = duration ? Math.round((viewOffset / duration) * 100) : 0;

          // Use series poster for episodes, item poster otherwise
          const thumbId = isEpisode ? (item.SeriesId || item.Id) : item.Id;
          const thumb = `/api/jfimage?id=${thumbId}&type=Primary`;
          // For episodes use series backdrop; for others use item backdrop
          const artId = isEpisode ? (item.SeriesId || item.Id) : item.Id;
          const art = (item.BackdropImageTags?.length || isEpisode)
            ? `/api/jfimage?id=${artId}&type=Backdrop`
            : '';

          return {
            id: `jf-${s.Id}`,
            type: isAudio ? 'track' : isEpisode ? 'episode' : 'movie',
            title: isEpisode ? (item.SeriesName || item.Name) : item.Name,
            subtitle: isEpisode
              ? item.Name
              : isAudio
              ? [item.AlbumArtist, item.Album].filter(Boolean).join(' — ')
              : item.ProductionYear ? String(item.ProductionYear) : '',
            year: item.ProductionYear,
            thumb,
            art,
            userThumb: '',
            username: s.UserName || 'Unknown',
            progress,
            duration,
            viewOffset,
            state: s.PlayState?.IsPaused ? 'paused' : 'playing',
            quality: s.PlayState?.PlayMethod === 'Transcode' ? 'transcode' : 'direct',
            player: s.DeviceName || s.Client || 'Unknown',
          };
        });
    } catch (err) {
      console.error('[jellyfin] getSessions error:', err.message);
      return [];
    }
  }

  async getLibraryItems(limit = 20) {
    if (!this.configured) return [];
    try {
      const data = await this.fetch(
        `/Items?Recursive=true&IncludeItemTypes=Movie,Series` +
        `&Fields=PrimaryImageAspectRatio,Tagline,OfficialRating,CommunityRating,Studios,RunTimeTicks&Limit=500&SortBy=Random`
      );
      return (data.Items || []).slice(0, limit).map((item) => ({
        id: `jf-${item.Id}`,
        title: item.Name,
        thumb: `/api/jfimage?id=${item.Id}&type=Primary`,
        type: item.Type === 'Movie' ? 'movie' : 'show',
        year: item.ProductionYear,
        tagline: item.Tagline || '',
        contentRating: item.OfficialRating || '',
        rating: item.CommunityRating ? Math.round(item.CommunityRating * 10) : undefined,
        studio: item.Studios?.[0]?.Name || '',
        runtime: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600_000_000) : undefined,
      }));
    } catch (err) {
      console.error('[jellyfin] getLibraryItems error:', err.message);
      return [];
    }
  }

  async getRecentlyAdded(limit = 20) {
    if (!this.configured) return [];
    try {
      const data = await this.fetch(
        `/Items?Recursive=true&IncludeItemTypes=Movie,Series` +
        `&Fields=PrimaryImageAspectRatio,Tagline,OfficialRating,CommunityRating,Studios,RunTimeTicks&Limit=${limit}` +
        `&SortBy=DateCreated&SortOrder=Descending`
      );
      const seenThumbs = new Set();
      return (data.Items || [])
        .map((item) => ({
          id: `jf-${item.Id}`,
          title: item.Name,
          thumb: `/api/jfimage?id=${item.Id}&type=Primary`,
          type: item.Type === 'Movie' ? 'movie' : 'show',
          year: item.ProductionYear,
          tagline: item.Tagline || '',
          contentRating: item.OfficialRating || '',
          rating: item.CommunityRating ? Math.round(item.CommunityRating * 10) : undefined,
          studio: item.Studios?.[0]?.Name || '',
          runtime: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600_000_000) : undefined,
        }))
        .filter((item) => {
          if (seenThumbs.has(item.thumb)) return false;
          seenThumbs.add(item.thumb);
          return true;
        });
    } catch (err) {
      console.error('[jellyfin] getRecentlyAdded error:', err.message);
      return [];
    }
  }

  async proxyImage(itemId, type = 'Primary') {
    if (!this.configured) return null;
    try {
      const url = `${this.baseUrl}/Items/${itemId}/Images/${type}?api_key=${this.apiKey}&maxWidth=1000&quality=90`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      return { buffer, contentType };
    } catch {
      return null;
    }
  }
}
