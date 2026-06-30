import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Plex } from './src/plex.js';
import { GoveeSync } from './src/govee.js';
import { extractDominantColor } from './src/colors.js';
import { getConfig, saveConfig } from './src/config.js';
import sessionsRoute from './src/routes/sessions.js';
import upcomingRoute from './src/routes/upcoming.js';
import libraryRoute from './src/routes/library.js';
import posterRoute from './src/routes/poster.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
const govee = new GoveeSync();
let lastGoveeThumb = null;
let currentMode = 'auto';

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/sessions', sessionsRoute(plex));
app.use('/api/upcoming', upcomingRoute());
app.use('/api/library', libraryRoute(plex));
app.use('/api/poster', posterRoute(plex));

app.get('/api/health', (_req, res) => {
  const c = getConfig();
  res.json({
    ok: true,
    plex: !!(c.PLEX_URL && c.PLEX_TOKEN),
    sonarr: !!(c.SONARR_URL && c.SONARR_API_KEY),
    radarr: !!(c.RADARR_URL && c.RADARR_API_KEY),
    govee: !!(c.GOVEE_IP && c.GOVEE_DEVICE_ID),
  });
});

app.get('/api/mode', (_req, res) => {
  res.json({ mode: currentMode });
});

app.post('/api/mode', (req, res) => {
  const { mode } = req.body;
  if (!['auto', 'ambient', 'coming-soon'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' });
  }
  currentMode = mode;
  const payload = JSON.stringify({ type: 'mode', data: mode });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(payload);
  }
  res.json({ ok: true, mode });
});

app.get('/api/config', (_req, res) => {
  const c = getConfig();
  res.json({
    PLEX_URL: c.PLEX_URL,
    SONARR_URL: c.SONARR_URL,
    RADARR_URL: c.RADARR_URL,
    GOVEE_IP: c.GOVEE_IP,
    GOVEE_DEVICE_ID: c.GOVEE_DEVICE_ID,
    // tokens omitted — never expose secrets over the API
    PLEX_TOKEN_SET: !!c.PLEX_TOKEN,
    SONARR_API_KEY_SET: !!c.SONARR_API_KEY,
    RADARR_API_KEY_SET: !!c.RADARR_API_KEY,
  });
});

app.post('/api/config', async (req, res) => {
  const ALLOWED = ['PLEX_URL', 'PLEX_TOKEN', 'SONARR_URL', 'SONARR_API_KEY', 'RADARR_URL', 'RADARR_API_KEY', 'GOVEE_IP', 'GOVEE_DEVICE_ID'];
  const settings = {};
  for (const k of ALLOWED) {
    if (typeof req.body[k] === 'string') settings[k] = req.body[k].trim();
  }
  saveConfig(settings);
  res.json({ ok: true, restart: true });
});

app.post('/api/config/test', async (req, res) => {
  const { PLEX_URL, PLEX_TOKEN } = req.body;
  if (!PLEX_URL || !PLEX_TOKEN) {
    return res.status(400).json({ error: 'PLEX_URL and PLEX_TOKEN required' });
  }
  try {
    const testPlex = new Plex({ plexUrl: PLEX_URL, plexToken: PLEX_TOKEN });
    await testPlex.getSessions();
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

async function getCurrentSessions() {
  try {
    return await plex.getSessions();
  } catch {
    return [];
  }
}

wss.on('connection', async (ws) => {
  log.info('WebSocket client connected');

  ws.send(JSON.stringify({ type: 'mode', data: currentMode }));

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

  // Govee ambient sync — only fires when the lead session's poster changes
  if (govee.configured && sessions.length > 0 && sessions[0].thumb) {
    const thumb = sessions[0].thumb;
    if (thumb !== lastGoveeThumb) {
      lastGoveeThumb = thumb;
      plex.proxyImage(thumb)
        .then(({ buffer }) => extractDominantColor(buffer))
        .then(({ r, g, b }) => govee.setColor(r, g, b))
        .catch((err) => log.error('Govee sync failed:', err.message));
    }
  }
}, 10_000);

server.listen(PORT, () => {
  log.info(`Server running on port ${PORT}`);
  log.info(`Plex: ${process.env.PLEX_URL || '(not configured)'}`);
});
