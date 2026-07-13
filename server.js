import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { Plex } from './src/plex.js';
import { Jellyfin } from './src/jellyfin.js';
import { GoveeSync } from './src/govee.js';
import { HomeAssistantLightSync } from './src/haLight.js';
import { HueSync } from './src/hue.js';
import { LifxSync } from './src/lifx.js';
import { SonosDuck } from './src/sonos.js';
import { extractDominantColor } from './src/colors.js';
import { getConfig, saveConfig } from './src/config.js';
import cron from 'node-cron';
import sessionsRoute from './src/routes/sessions.js';
import upcomingRoute from './src/routes/upcoming.js';
import libraryRoute from './src/routes/library.js';
import posterRoute from './src/routes/poster.js';
import jellyfinImageRoute from './src/routes/jellyfinImage.js';
import weatherRoute from './src/routes/weather.js';
import themeRoute from './src/routes/theme.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_TOKEN = randomBytes(32).toString('hex');

const DAY_TO_DOW = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
  weekdays: '1-5', weekends: '0,6', daily: '*',
};

function buildCron(day, hour) {
  const dow = DAY_TO_DOW[day?.toLowerCase()];
  const h = parseInt(hour, 10);
  if (dow === undefined || isNaN(h) || h < 0 || h > 23) return null;
  return `0 ${h} * * ${dow}`;
}

const log = {
  info: (...args) => console.log('[lobby]', ...args),
  error: (...args) => console.error('[lobby:error]', ...args),
};

const PORT = process.env.PORT || 3000;

const cfg = getConfig();
if (!cfg.PLEX_URL || !cfg.PLEX_TOKEN) {
  log.info('Plex not configured — open http://<host>:3000/?page=setup to configure.');
}

const plex = new Plex({ plexUrl: cfg.PLEX_URL, plexToken: cfg.PLEX_TOKEN });
const jellyfin = new Jellyfin({ jellyfinUrl: cfg.JELLYFIN_URL, apiKey: cfg.JELLYFIN_API_KEY });
const govee = new GoveeSync();
const haLight = new HomeAssistantLightSync();
const hue = new HueSync();
const lifx = new LifxSync();
const sonos = new SonosDuck();
let lastLightThumb = null;
let currentMode = getConfig().CURRENT_MODE || 'auto';
let csTask = null;
let autoTask = null;
let sleepTask = null;
let wakeTask = null;

const app = express();
app.use(express.json());

async function getCurrentSessions() {
  const [plexSessions, jfSessions] = await Promise.all([
    plex.getSessions().catch(() => []),
    jellyfin.getSessions().catch(() => []),
  ]);
  return [...plexSessions, ...jfSessions];
}

// API routes
app.use('/api/sessions', sessionsRoute(getCurrentSessions));
app.use('/api/upcoming', upcomingRoute());
app.use('/api/library', libraryRoute(plex, jellyfin));
app.use('/api/poster', posterRoute(plex));
app.use('/api/jfimage', jellyfinImageRoute(jellyfin));
app.use('/api/weather', weatherRoute());
app.use('/api/theme', themeRoute(plex));

// Called by the display itself when theme music starts/stops — ducks or
// restores Sonos volume so it doesn't clash with what's on the speakers.
app.post('/api/theme-music/started', (_req, res) => {
  sonos.duck().catch((err) => log.error('Sonos duck failed:', err.message));
  res.json({ ok: true });
});
app.post('/api/theme-music/stopped', (_req, res) => {
  sonos.restore().catch((err) => log.error('Sonos restore failed:', err.message));
  res.json({ ok: true });
});

app.get('/api/auth/required', (_req, res) => {
  const { LOBBY_PIN } = getConfig();
  res.json({ required: !!LOBBY_PIN });
});

function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

// Per-IP lockout on repeated bad PINs — a 4-6 digit PIN has a small keyspace
// and the artificial delay alone doesn't stop parallel brute-force attempts.
const AUTH_MAX_ATTEMPTS = 5;
const AUTH_LOCKOUT_MS = 5 * 60 * 1000;
const _authAttempts = new Map(); // ip -> { count, lockedUntil }

app.post('/api/auth/verify', async (req, res) => {
  const { LOBBY_PIN } = getConfig();
  if (!LOBBY_PIN) return res.json({ ok: true, token: SESSION_TOKEN });

  const ip = req.ip;
  const entry = _authAttempts.get(ip);
  if (entry?.lockedUntil > Date.now()) {
    return res.status(429).json({ ok: false, error: 'Too many attempts — try again later' });
  }

  const { pin } = req.body;
  if (pin && safeEqual(pin, LOBBY_PIN)) {
    _authAttempts.delete(ip);
    return res.json({ ok: true, token: SESSION_TOKEN });
  }

  const count = (entry?.count || 0) + 1;
  _authAttempts.set(ip, { count, lockedUntil: count >= AUTH_MAX_ATTEMPTS ? Date.now() + AUTH_LOCKOUT_MS : null });
  await new Promise((r) => setTimeout(r, 300));
  res.status(401).json({ ok: false });
});

function requireAuth(req, res, next) {
  const { LOBBY_PIN } = getConfig();
  if (!LOBBY_PIN) return next();
  if (req.headers['x-lobby-token'] === SESSION_TOKEN) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

app.get('/api/auth/check', (req, res) => {
  const { LOBBY_PIN } = getConfig();
  if (!LOBBY_PIN) return res.json({ valid: true });
  res.json({ valid: req.headers['x-lobby-token'] === SESSION_TOKEN });
});

app.get('/api/health', (_req, res) => {
  const c = getConfig();
  res.json({
    ok: true,
    plex: !!(c.PLEX_URL && c.PLEX_TOKEN),
    jellyfin: !!(c.JELLYFIN_URL && c.JELLYFIN_API_KEY),
    sonarr: !!(c.SONARR_URL && c.SONARR_API_KEY),
    radarr: !!(c.RADARR_URL && c.RADARR_API_KEY),
    govee: !!(c.GOVEE_IP && c.GOVEE_DEVICE_ID),
    SLIDESHOW_INTERVAL: c.SLIDESHOW_INTERVAL || '20',
    CLOCK_FORMAT: c.CLOCK_FORMAT || '12h',
    LIBRARY_FILTER: c.LIBRARY_FILTER || 'all',
    SHOW_WEATHER: c.SHOW_WEATHER || 'true',
    SHOW_CLOCK: c.SHOW_CLOCK || 'true',
    SHOW_TITLES: c.SHOW_TITLES || 'true',
    DISPLAY_NAME: c.DISPLAY_NAME || 'LOBBY',
    THEME_MUSIC_ENABLED: c.THEME_MUSIC_ENABLED || 'false',
  });
});

app.get('/api/mode', (_req, res) => {
  res.json({ mode: currentMode });
});

function getDisplayConfig() {
  const c = getConfig();
  return {
    SLIDESHOW_INTERVAL: c.SLIDESHOW_INTERVAL || '20',
    CLOCK_FORMAT: c.CLOCK_FORMAT || '12h',
    LIBRARY_FILTER: c.LIBRARY_FILTER || 'all',
    SHOW_WEATHER: c.SHOW_WEATHER || 'true',
    SHOW_CLOCK: c.SHOW_CLOCK || 'true',
    SHOW_TITLES: c.SHOW_TITLES || 'true',
    DISPLAY_NAME: c.DISPLAY_NAME || 'LOBBY',
    THEME_MUSIC_ENABLED: c.THEME_MUSIC_ENABLED || 'false',
  };
}

function broadcastDisplayConfig() {
  const payload = JSON.stringify({ type: 'config', data: getDisplayConfig() });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(payload);
  }
}

function initSchedules() {
  if (csTask) { csTask.stop(); csTask = null; }
  if (autoTask) { autoTask.stop(); autoTask = null; }
  if (sleepTask) { sleepTask.stop(); sleepTask = null; }
  if (wakeTask) { wakeTask.stop(); wakeTask = null; }
  const {
    SCHEDULE_CS_DAY, SCHEDULE_CS_HOUR, SCHEDULE_AUTO_DAY, SCHEDULE_AUTO_HOUR,
    SCHEDULE_SLEEP_DAY, SCHEDULE_SLEEP_HOUR, SCHEDULE_WAKE_DAY, SCHEDULE_WAKE_HOUR,
    TIMEZONE,
  } = getConfig();
  const timezone = TIMEZONE || 'America/New_York';
  const csCron = buildCron(SCHEDULE_CS_DAY, SCHEDULE_CS_HOUR);
  const autoCron = buildCron(SCHEDULE_AUTO_DAY, SCHEDULE_AUTO_HOUR);
  const sleepCron = buildCron(SCHEDULE_SLEEP_DAY, SCHEDULE_SLEEP_HOUR);
  const wakeCron = buildCron(SCHEDULE_WAKE_DAY, SCHEDULE_WAKE_HOUR);
  if (csCron) {
    csTask = cron.schedule(csCron, () => { log.info('Schedule: → coming-soon'); broadcastMode('coming-soon'); }, { timezone });
    log.info(`Schedule: coming-soon every ${SCHEDULE_CS_DAY} at hour ${SCHEDULE_CS_HOUR} (${timezone})`);
  }
  if (autoCron) {
    autoTask = cron.schedule(autoCron, () => { log.info('Schedule: → auto'); broadcastMode('auto'); }, { timezone });
    log.info(`Schedule: auto every ${SCHEDULE_AUTO_DAY} at hour ${SCHEDULE_AUTO_HOUR} (${timezone})`);
  }
  if (sleepCron) {
    sleepTask = cron.schedule(sleepCron, () => { log.info('Schedule: → sleep'); broadcastMode('sleep'); }, { timezone });
    log.info(`Schedule: sleep every ${SCHEDULE_SLEEP_DAY} at hour ${SCHEDULE_SLEEP_HOUR} (${timezone})`);
  }
  if (wakeCron) {
    wakeTask = cron.schedule(wakeCron, () => { log.info('Schedule: → wake (auto)'); broadcastMode('auto'); }, { timezone });
    log.info(`Schedule: wake every ${SCHEDULE_WAKE_DAY} at hour ${SCHEDULE_WAKE_HOUR} (${timezone})`);
  }
}

function broadcastMode(mode) {
  currentMode = mode;
  saveConfig({ CURRENT_MODE: mode });
  const payload = JSON.stringify({ type: 'mode', data: mode });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(payload);
  }
}

app.post('/api/mode', requireAuth, (req, res) => {
  const { mode } = req.body;
  if (!['auto', 'ambient', 'poster', 'coming-soon', 'sleep'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' });
  }
  broadcastMode(mode);
  res.json({ ok: true, mode });
});

app.get('/api/config', requireAuth, (_req, res) => {
  const c = getConfig();
  res.json({
    PLEX_URL: c.PLEX_URL,
    JELLYFIN_URL: c.JELLYFIN_URL,
    SONARR_URL: c.SONARR_URL,
    RADARR_URL: c.RADARR_URL,
    GOVEE_IP: c.GOVEE_IP,
    GOVEE_DEVICE_ID: c.GOVEE_DEVICE_ID,
    HA_URL: c.HA_URL,
    HA_LIGHT_ENTITY_ID: c.HA_LIGHT_ENTITY_ID,
    HUE_BRIDGE_IP: c.HUE_BRIDGE_IP,
    HUE_LIGHT_ID: c.HUE_LIGHT_ID,
    LIFX_SELECTOR: c.LIFX_SELECTOR,
    SONOS_IP: c.SONOS_IP,
    SONOS_DUCK_VOLUME: c.SONOS_DUCK_VOLUME || '15',
    LOCATION: c.LOCATION,
    LATITUDE: c.LATITUDE,
    LONGITUDE: c.LONGITUDE,
    TEMP_UNIT: c.TEMP_UNIT || 'fahrenheit',
    TIMEZONE: c.TIMEZONE || 'America/New_York',
    SCHEDULE_CS_DAY: c.SCHEDULE_CS_DAY,
    SCHEDULE_CS_HOUR: c.SCHEDULE_CS_HOUR || '18',
    SCHEDULE_AUTO_DAY: c.SCHEDULE_AUTO_DAY,
    SCHEDULE_AUTO_HOUR: c.SCHEDULE_AUTO_HOUR || '6',
    SCHEDULE_SLEEP_DAY: c.SCHEDULE_SLEEP_DAY,
    SCHEDULE_SLEEP_HOUR: c.SCHEDULE_SLEEP_HOUR || '23',
    SCHEDULE_WAKE_DAY: c.SCHEDULE_WAKE_DAY,
    SCHEDULE_WAKE_HOUR: c.SCHEDULE_WAKE_HOUR || '7',
    SLIDESHOW_INTERVAL: c.SLIDESHOW_INTERVAL || '20',
    CLOCK_FORMAT: c.CLOCK_FORMAT || '12h',
    LIBRARY_FILTER: c.LIBRARY_FILTER || 'all',
    SHOW_WEATHER: c.SHOW_WEATHER || 'true',
    SHOW_CLOCK: c.SHOW_CLOCK || 'true',
    SHOW_TITLES: c.SHOW_TITLES || 'true',
    DISPLAY_NAME: c.DISPLAY_NAME || 'LOBBY',
    THEME_MUSIC_ENABLED: c.THEME_MUSIC_ENABLED || 'false',
    // secrets: presence only
    LOBBY_PIN_SET: !!c.LOBBY_PIN,
    PLEX_TOKEN_SET: !!c.PLEX_TOKEN,
    JELLYFIN_API_KEY_SET: !!c.JELLYFIN_API_KEY,
    SONARR_API_KEY_SET: !!c.SONARR_API_KEY,
    RADARR_API_KEY_SET: !!c.RADARR_API_KEY,
    HA_TOKEN_SET: !!c.HA_TOKEN,
    HUE_USERNAME_SET: !!c.HUE_USERNAME,
    LIFX_TOKEN_SET: !!c.LIFX_TOKEN,
  });
});

app.post('/api/config', requireAuth, async (req, res) => {
  const ALLOWED = [
    'LOBBY_PIN',
    'PLEX_URL', 'PLEX_TOKEN',
    'JELLYFIN_URL', 'JELLYFIN_API_KEY',
    'SONARR_URL', 'SONARR_API_KEY',
    'RADARR_URL', 'RADARR_API_KEY',
    'GOVEE_IP', 'GOVEE_DEVICE_ID',
    'HA_URL', 'HA_TOKEN', 'HA_LIGHT_ENTITY_ID',
    'HUE_BRIDGE_IP', 'HUE_USERNAME', 'HUE_LIGHT_ID',
    'LIFX_TOKEN', 'LIFX_SELECTOR',
    'SONOS_IP', 'SONOS_DUCK_VOLUME',
    'LOCATION', 'LATITUDE', 'LONGITUDE', 'TEMP_UNIT', 'TIMEZONE',
    'SCHEDULE_CS_DAY', 'SCHEDULE_CS_HOUR',
    'SCHEDULE_AUTO_DAY', 'SCHEDULE_AUTO_HOUR',
    'SCHEDULE_SLEEP_DAY', 'SCHEDULE_SLEEP_HOUR',
    'SCHEDULE_WAKE_DAY', 'SCHEDULE_WAKE_HOUR',
    'SLIDESHOW_INTERVAL', 'CLOCK_FORMAT', 'LIBRARY_FILTER',
    'SHOW_WEATHER', 'SHOW_CLOCK', 'SHOW_TITLES', 'DISPLAY_NAME',
    'THEME_MUSIC_ENABLED',
  ];
  const settings = {};
  for (const k of ALLOWED) {
    if (typeof req.body[k] === 'string') settings[k] = req.body[k].trim();
  }
  saveConfig(settings);

  // Reinitialize everything that was set up at startup
  const newCfg = getConfig();
  plex.baseUrl = (newCfg.PLEX_URL || '').replace(/\/$/, '');
  plex.token = (newCfg.PLEX_TOKEN || '').replace(/[^\x00-\x7F]/g, '');
  jellyfin.baseUrl = (newCfg.JELLYFIN_URL || '').replace(/\/$/, '');
  jellyfin.apiKey = newCfg.JELLYFIN_API_KEY || '';
  initSchedules();
  broadcastDisplayConfig();

  res.json({ ok: true });
});

app.post('/api/config/test', requireAuth, async (req, res) => {
  const c = getConfig();
  const url = req.body.PLEX_URL || c.PLEX_URL;
  const token = req.body.PLEX_TOKEN || c.PLEX_TOKEN;
  if (!url || !token) {
    return res.status(400).json({ error: 'PLEX_URL and PLEX_TOKEN required' });
  }
  try {
    const testPlex = new Plex({ plexUrl: url, plexToken: token });
    await testPlex.getSessions();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Connection failed' });
  }
});

app.post('/api/config/test/sonarr', requireAuth, async (req, res) => {
  const c = getConfig();
  const url = req.body.SONARR_URL || c.SONARR_URL;
  const key = req.body.SONARR_API_KEY || c.SONARR_API_KEY;
  if (!url || !key) {
    return res.status(400).json({ error: 'SONARR_URL and SONARR_API_KEY required' });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/api/v3/system/status`, {
      headers: { 'X-Api-Key': key },
      signal: controller.signal,
    });
    if (!r.ok) throw new Error(`Status ${r.status}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Connection failed' });
  } finally {
    clearTimeout(timer);
  }
});

app.post('/api/config/test/radarr', requireAuth, async (req, res) => {
  const c = getConfig();
  const url = req.body.RADARR_URL || c.RADARR_URL;
  const key = req.body.RADARR_API_KEY || c.RADARR_API_KEY;
  if (!url || !key) {
    return res.status(400).json({ error: 'RADARR_URL and RADARR_API_KEY required' });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/api/v3/system/status`, {
      headers: { 'X-Api-Key': key },
      signal: controller.signal,
    });
    if (!r.ok) throw new Error(`Status ${r.status}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Connection failed' });
  } finally {
    clearTimeout(timer);
  }
});

app.post('/api/config/test/jellyfin', requireAuth, async (req, res) => {
  const c = getConfig();
  const url = req.body.JELLYFIN_URL || c.JELLYFIN_URL;
  const key = req.body.JELLYFIN_API_KEY || c.JELLYFIN_API_KEY;
  if (!url || !key) {
    return res.status(400).json({ error: 'JELLYFIN_URL and JELLYFIN_API_KEY required' });
  }
  try {
    const testJF = new Jellyfin({ jellyfinUrl: url, apiKey: key });
    await testJF.getSessions();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Connection failed' });
  }
});

// Serve built frontend
const distPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// HTTP + WebSocket server
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function resolveThumbImage(thumb) {
  if (!thumb) return Promise.resolve(null);
  if (thumb.startsWith('/api/jfimage')) {
    const params = new URLSearchParams(thumb.split('?')[1]);
    return jellyfin.proxyImage(params.get('id'), params.get('type') || 'Primary');
  }
  return plex.proxyImage(thumb);
}

wss.on('connection', async (ws) => {
  log.info('WebSocket client connected');

  ws.send(JSON.stringify({ type: 'mode', data: currentMode }));
  ws.send(JSON.stringify({ type: 'config', data: getDisplayConfig() }));

  const sessions = await getCurrentSessions();
  ws.send(JSON.stringify({ type: 'sessions', data: sessions }));

  ws.on('error', (err) => log.error('WebSocket error:', err.message));
  ws.on('close', () => log.info('WebSocket client disconnected'));
});

// Push sessions to all clients every 10s
setInterval(async () => {
  if (wss.clients.size === 0) return;
  const sessions = await getCurrentSessions();
  const payload = JSON.stringify({ type: 'sessions', data: sessions });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }

  // Ambient light sync (Govee, Home Assistant, Hue, LIFX) — only fires when
  // the lead session's poster changes. Skipped during sleep so lights don't
  // keep shifting color on a screen that's off.
  if (currentMode !== 'sleep' && sessions.length > 0 && sessions[0].thumb) {
    const thumb = sessions[0].thumb;
    if (thumb !== lastLightThumb && (govee.configured || haLight.configured || hue.configured || lifx.configured)) {
      lastLightThumb = thumb;
      resolveThumbImage(thumb)
        .then((result) => result ? extractDominantColor(result.buffer) : null)
        .then((color) => {
          if (!color) return;
          govee.setColor(color.r, color.g, color.b).catch((err) => log.error('Govee sync failed:', err.message));
          haLight.setColor(color.r, color.g, color.b).catch((err) => log.error('HA light sync failed:', err.message));
          hue.setColor(color.r, color.g, color.b).catch((err) => log.error('Hue sync failed:', err.message));
          lifx.setColor(color.r, color.g, color.b).catch((err) => log.error('LIFX sync failed:', err.message));
        })
        .catch((err) => log.error('Light sync failed:', err.message));
    }
  }
}, 10_000);

server.listen(PORT, () => {
  log.info(`Server running on port ${PORT}`);
  log.info(`Plex: ${cfg.PLEX_URL || '(not configured)'}`);
  initSchedules();
});
