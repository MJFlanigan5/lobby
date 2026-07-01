export class Plex {
  constructor({ plexUrl, plexToken }) {
    this.baseUrl = (plexUrl || '').replace(/\/$/, '');
    this.token = (plexToken || '').replace(/[^\x00-\x7F]/g, '');
  }

  get headers() {
    return {
      'X-Plex-Token': this.token,
      Accept: 'application/json',
    };
  }

  async fetch(path) {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error(`Plex ${path} → ${res.status}`);
    return res.json();
  }

  async getSessions() {
    if (!this.baseUrl || !this.token) return [];
    try {
      const data = await this.fetch('/status/sessions');
      const items = data?.MediaContainer?.Metadata ?? [];
      return items.map((item) => {
        const stream = item.Media?.[0];
        const part = stream?.Part?.[0];
        const player = item.Player ?? {};
        const user = item.User ?? {};
        const session = item.Session ?? {};

        const isTranscode = stream?.videoDecision === 'transcode' ||
          part?.decision === 'transcode';

        const progress = item.duration
          ? Math.round((item.viewOffset / item.duration) * 100)
          : 0;

        const isTrack = item.type === 'track';
        const isEpisode = item.type === 'episode';

        return {
          id: session.id || item.sessionKey || String(Math.random()),
          type: item.type,
          title: isEpisode
            ? (item.grandparentTitle || item.title)
            : item.title,
          subtitle: isEpisode
            ? item.title
            : isTrack
            ? [item.grandparentTitle, item.parentTitle].filter(Boolean).join(' — ')
            : item.year ? String(item.year) : '',
          year: item.year,
          thumb: isEpisode
            ? (item.grandparentThumb || item.thumb)
            : isTrack
            ? (item.parentThumb || item.thumb)
            : item.thumb,
          art: item.art || '',
          userThumb: user.thumb || '',
          username: user.title || 'Unknown',
          progress,
          duration: item.duration || 0,
          viewOffset: item.viewOffset || 0,
          state: player.state || 'playing',
          quality: isTranscode ? 'transcode' : 'direct',
          player: player.title || player.device || 'Unknown',
        };
      });
    } catch (err) {
      console.error('[plex] getSessions error:', err.message);
      return [];
    }
  }

  async getLibraries() {
    try {
      const data = await this.fetch('/library/sections');
      const sections = data?.MediaContainer?.Directory ?? [];
      return sections
        .filter((s) => s.type === 'movie' || s.type === 'show')
        .map((s) => ({ key: s.key, type: s.type }));
    } catch {
      return [];
    }
  }

  async getLibraryItems(limit = 20) {
    if (!this.baseUrl || !this.token) return [];
    try {
      const libs = await this.getLibraries();
      if (!libs.length) return [];

      const allItems = [];
      for (const lib of libs) {
        try {
          const data = await this.fetch(
            `/library/sections/${lib.key}/all?X-Plex-Container-Start=0&X-Plex-Container-Size=200`
          );
          const items = data?.MediaContainer?.Metadata ?? [];
          allItems.push(...items.map((item) => ({
            id: item.ratingKey,
            title: item.title,
            thumb: item.thumb,
            type: lib.type,
            year: item.year,
          })));
        } catch {
          // skip failed library
        }
      }

      // Fisher-Yates shuffle and take limit
      for (let i = allItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
      }
      return allItems.slice(0, limit);
    } catch (err) {
      console.error('[plex] getLibraryItems error:', err.message);
      return [];
    }
  }

  async getRecentlyAdded(limit = 20) {
    if (!this.baseUrl || !this.token) return [];
    try {
      const libs = await this.getLibraries();
      const allItems = [];
      for (const lib of libs) {
        try {
          const data = await this.fetch(
            `/library/sections/${lib.key}/recentlyAdded?X-Plex-Container-Start=0&X-Plex-Container-Size=${limit}`
          );
          const items = data?.MediaContainer?.Metadata ?? [];
          allItems.push(...items.map((item) => ({
            id: item.ratingKey,
            title: item.type === 'episode' ? item.grandparentTitle || item.title : item.title,
            thumb: item.type === 'episode'
              ? (item.grandparentThumb || item.thumb)
              : item.thumb,
            type: lib.type,
            year: item.year,
          })));
        } catch {
          // skip failed library
        }
      }
      // Deduplicate by thumb — same show poster from multiple episodes = one entry
      const seenThumbs = new Set();
      const deduped = allItems.filter((item) => {
        if (!item.thumb || seenThumbs.has(item.thumb)) return false;
        seenThumbs.add(item.thumb);
        return true;
      });
      return deduped.slice(0, limit);
    } catch (err) {
      console.error('[plex] getRecentlyAdded error:', err.message);
      return [];
    }
  }

  async proxyImage(thumbPath) {
    if (!this.baseUrl || !this.token) return null;
    try {
      const url = `${this.baseUrl}${thumbPath}?X-Plex-Token=${this.token}`;
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
