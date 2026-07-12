# Lobby

A cinematic media display app for TV screens. Shows what's currently playing on Plex or Jellyfin, cycles through your library as an ambient screensaver, and displays upcoming releases from Sonarr and Radarr. Runs in Docker, accessed via browser URL on any screen — including Android TV.

## Features

- **Now Playing** — Real-time Plex and Jellyfin session display. Up to 4 simultaneous viewers with widescreen backdrop art and a poster inset. Music sessions get a dedicated layout with album art and animated EQ bars. Mixed music+video sessions split the screen automatically.
- **Theme music** — Plays the Plex theme song for whatever's currently showcased in the Ambient/Poster screensaver cycle. Only during the library cycle — never during a real Now Playing session, so it doesn't clash with something someone's actually watching in the room. Off by default (Setup → Display → Theme Music). Not every title has a theme; silent when unavailable. Plex only — Jellyfin items stay silent.
- **Ambient** — Full-screen poster screensaver with Ken Burns zoom. Cycles through recently added items first, then random library picks. Shows clock and weather.
- **Coming Soon** — Upcoming releases pulled from Sonarr and Radarr calendars. A hero row of up to 6 posters, then a compact list of further titles below. Items with a missing or broken poster are skipped rather than shown as an empty card.
- **Sleep** — Blanks the poster/slideshow on a schedule (e.g. 11pm–7am) or on demand from the control panel, keeping clock and weather visible (same toggles as Ambient). Software black screen — this deployment has no HDMI-CEC hardware access, so it can't power the physical display off, just blanks it.
- **Govee sync** — Extracts the dominant color from the active poster and pushes it to a Govee light via LAN UDP.
- **Auto-schedule** — Switch modes on a schedule (e.g. Coming Soon every Friday evening, Auto every Monday morning, Sleep overnight). Configured in the setup UI — no cron syntax required.
- **Portrait mode** — Rotate any display 90° for vertically-mounted screens via URL or the control panel.
- **Control panel** — Push mode changes to all connected screens instantly from your phone.
- **Setup UI** — Browser-based configuration for all credentials and settings. No SSH required after initial deploy. Credentials apply immediately on save — no container restart needed.

## Not included

Compared against similar apps (e.g. [Posterr](https://github.com/petersem/posterr)) and deliberately left out:

- **Readarr support** — not used in this setup.

## Install

Run once on the server:

```bash
git clone https://github.com/MJFlanigan5/lobby /opt/lobby && cd /opt/lobby && docker compose up --build -d
```

Then open `http://<server-ip>:3000/` — Lobby detects an unconfigured install and shows the setup guide automatically. Or go directly to `http://<server-ip>:3000/?page=setup`.

## Update

```bash
cd /opt/lobby && git pull && docker compose build --no-cache && docker compose up -d
```

## Pages

| URL | Purpose |
|---|---|
| `http://<host>:3000/` | TV display — auto-switches between Now Playing and Ambient |
| `http://<host>:3000/?mode=portrait` | Same display rotated 90° for vertical screens |
| `http://<host>:3000/?page=control` | Push mode changes to all screens (use on your phone) |
| `http://<host>:3000/?page=setup` | Configure all credentials and settings |

## Configuration

All settings are configurable via the setup page at `/?page=setup` and saved to `config/settings.json` (volume-mounted, persists across container rebuilds). You can also set them as environment variables in a `.env` file — settings.json takes precedence over env vars.

Credential changes (Plex token, Jellyfin API key, etc.) apply immediately after saving. Schedule changes require a container restart.

### Connection settings

| Variable | Description |
|---|---|
| `PLEX_URL` | Plex server URL, e.g. `http://192.168.1.x:32400` |
| `PLEX_TOKEN` | Your Plex auth token |
| `JELLYFIN_URL` | Jellyfin server URL, e.g. `http://192.168.1.x:8096` (optional) |
| `JELLYFIN_API_KEY` | Jellyfin API key — Dashboard → API Keys (optional) |
| `SONARR_URL` | Sonarr server URL (optional) |
| `SONARR_API_KEY` | Sonarr API key — Settings → General (optional) |
| `RADARR_URL` | Radarr server URL (optional) |
| `RADARR_API_KEY` | Radarr API key — Settings → General (optional) |
| `GOVEE_IP` | IP address of the Govee light (optional) |
| `GOVEE_DEVICE_ID` | Govee device ID, format `AA:BB:CC:DD:EE:FF:GG:HH` (optional) |

### Display settings

| Variable | Default | Options |
|---|---|---|
| `SLIDESHOW_INTERVAL` | `8` | Seconds between posters: `5`, `8`, `15`, `30`, `60` |
| `CLOCK_FORMAT` | `12h` | `12h` or `24h` |
| `LIBRARY_FILTER` | `all` | `all`, `movies`, `shows` |

### Weather settings

| Variable | Description |
|---|---|
| `LATITUDE` | Latitude for weather display (optional) |
| `LONGITUDE` | Longitude for weather display (optional) |
| `TEMP_UNIT` | `fahrenheit` or `celsius` (default: `fahrenheit`) |

### Auto-schedule

| Variable | Description |
|---|---|
| `TIMEZONE` | IANA timezone (e.g. `America/Chicago`) — controls what hour the schedule below actually fires at. Configurable in the setup UI. |
| `SCHEDULE_CS_DAY` | Day to switch to Coming Soon: `monday`–`sunday`, `weekdays`, `weekends`, `daily` |
| `SCHEDULE_CS_HOUR` | Hour (0–23) to switch to Coming Soon (default: `18`) |
| `SCHEDULE_AUTO_DAY` | Day to switch back to Auto |
| `SCHEDULE_AUTO_HOUR` | Hour (0–23) to switch back to Auto (default: `6`) |
| `SCHEDULE_SLEEP_DAY` | Day to switch to Sleep (blank screen) |
| `SCHEDULE_SLEEP_HOUR` | Hour (0–23) to switch to Sleep (default: `23`) |
| `SCHEDULE_WAKE_DAY` | Day to wake (switches back to Auto) |
| `SCHEDULE_WAKE_HOUR` | Hour (0–23) to wake (default: `7`) |

### Theme music

| Variable | Default | Description |
|---|---|---|
| `THEME_MUSIC_ENABLED` | `false` | Plays the Plex theme song during Ambient/Poster's library cycle — never during a real Now Playing session |

## Finding your Plex token

1. Open Plex Web and play anything
2. Open browser dev tools → Network tab
3. Filter for requests to your Plex server
4. Look for `X-Plex-Token` in any request URL or header

## Finding your Jellyfin API key

1. Open the Jellyfin Dashboard
2. Go to Administration → API Keys
3. Click the + button to create a new key
4. Copy the key and paste it into the Lobby setup page

## Stack

- **Backend** — Node.js + Express, WebSocket push via `ws`
- **Frontend** — React 18 + TypeScript + Tailwind CSS, built with Vite
- **Images** — `sharp` for dominant color extraction (Govee sync)
- **Weather** — [Open-Meteo](https://open-meteo.com/) (no API key required)
- **Scheduling** — `node-cron`
- **Deploy** — Multi-stage Docker build, single container
