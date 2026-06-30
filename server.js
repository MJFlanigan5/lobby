import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Plex } from './src/plex.js';
import { GoveeSync } from './src/govee.js';
import { extractDominantColor } from './src/colors.js';
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

if (!process.env.PLEX_URL || !process.env.PLEX_TOKEN) {
  log.error('PLEX_URL and PLEX_TOKEN are required. Set them in your environment.');
}

const plex = new Plex({
  plexUrl: process.env.PLEX_URL || '',
  plexToken: process.env.PLEX_TOKEN || '',
});

const govee = new GoveeSync();
let lastGoveeThumb = null;

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/sessions', sessionsRoute(plex));
app.use('/api/upcoming', upcomingRoute());
app.use('/api/library', libraryRoute(plex));
app.use('/api/poster', posterRoute(plex));

app.get('/api/health', async (_req, res) => {
  const plexOk = !!(process.env.PLEX_URL && process.env.PLEX_TOKEN);
  const sonarrOk = !!(process.env.SONARR_URL && process.env.SONARR_API_KEY);
  const radarrOk = !!(process.env.RADARR_URL && process.env.RADARR_API_KEY);
  res.json({ ok: true, plex: plexOk, sonarr: sonarrOk, radarr: radarrOk });
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
