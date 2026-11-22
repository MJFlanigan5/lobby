import { getConfig } from './config.js';

// Xbox game on the living room console, read from Home Assistant's Xbox
// integration (Mike 2026-11-21). Only Mike's gamertag, and only while the
// living room Xbox is on, so a game on his phone or PC doesn't show up.
const CONSOLE_ENTITY = 'media_player.chief';
const GAME_ENTITY = 'sensor.mjflanigan_now_playing';
export const XBOX_IMAGES = {
  art: 'image.mjflanigan_superhero_art',
  thumb: 'image.mjflanigan_box_art',
};

function haBase() {
  const { HA_URL, HA_TOKEN } = getConfig();
  if (!HA_URL || !HA_TOKEN) return null;
  return { base: HA_URL.replace(/\/$/, ''), token: HA_TOKEN };
}

async function getState(base, token, id) {
  const res = await fetch(`${base}/api/states/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(3000),
  });
  return res.ok ? res.json() : null;
}

export async function getXboxSessions() {
  const ha = haBase();
  if (!ha) return [];
  try {
    const [consoleState, game, art] = await Promise.all([
      getState(ha.base, ha.token, CONSOLE_ENTITY),
      getState(ha.base, ha.token, GAME_ENTITY),
      getState(ha.base, ha.token, XBOX_IMAGES.art),
    ]);
    if (!['on', 'playing', 'paused'].includes(consoleState?.state)) return [];
    const title = game?.state;
    if (!title || ['unknown', 'unavailable'].includes(title)) return [];
    // The image entity's state is its last-updated time; adding it to the URL
    // makes the screen load new art when the game changes.
    const v = encodeURIComponent(art?.state || '');
    return [{
      id: 'xbox-mjflanigan',
      type: 'game',
      title,
      subtitle: 'Xbox',
      thumb: `/api/haimage?entity=${XBOX_IMAGES.thumb}&v=${v}`,
      art: `/api/haimage?entity=${XBOX_IMAGES.art}&v=${v}`,
      userThumb: '',
      username: 'MJFlanigan',
      progress: 0,
      duration: 0,
      viewOffset: 0,
      state: consoleState.state === 'paused' ? 'paused' : 'playing',
      quality: 'direct',
      player: 'Xbox',
    }];
  } catch {
    return [];
  }
}

// Fetches an Xbox image entity through HA's image proxy. Only the entities
// above are allowed, so the route can't be used to read other HA images.
export async function proxyXboxImage(entity) {
  if (!Object.values(XBOX_IMAGES).includes(entity)) return null;
  const ha = haBase();
  if (!ha) return null;
  try {
    const res = await fetch(`${ha.base}/api/image_proxy/${entity}`, {
      headers: { Authorization: `Bearer ${ha.token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return {
      buffer: Buffer.from(await res.arrayBuffer()),
      contentType: res.headers.get('content-type') || 'image/jpeg',
    };
  } catch {
    return null;
  }
}
