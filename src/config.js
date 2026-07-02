import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG_DIR = path.join(ROOT, 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'settings.json');

const KEYS = [
  'PLEX_URL', 'PLEX_TOKEN',
  'JELLYFIN_URL', 'JELLYFIN_API_KEY',
  'SONARR_URL', 'SONARR_API_KEY',
  'RADARR_URL', 'RADARR_API_KEY',
  'GOVEE_IP', 'GOVEE_DEVICE_ID',
  'LOCATION', 'LATITUDE', 'LONGITUDE', 'TEMP_UNIT',
  'CURRENT_MODE',
  'SCHEDULE_CS_DAY', 'SCHEDULE_CS_HOUR',
  'SCHEDULE_AUTO_DAY', 'SCHEDULE_AUTO_HOUR',
  'SLIDESHOW_INTERVAL', 'CLOCK_FORMAT', 'LIBRARY_FILTER',
  'SHOW_WEATHER', 'SHOW_CLOCK', 'SHOW_TITLES', 'DISPLAY_NAME',
];

function readFile() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

export function getConfig() {
  const file = readFile();
  const out = {};
  for (const k of KEYS) {
    out[k] = file[k] || process.env[k] || '';
  }
  return out;
}

export function saveConfig(settings) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const current = readFile();
  writeFileSync(CONFIG_PATH, JSON.stringify({ ...current, ...settings }, null, 2));
}
