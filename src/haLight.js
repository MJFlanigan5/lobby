import { getConfig } from './config.js';

// Generic Home Assistant light sync — works with any light HA exposes
// (Hue, LIFX, Zigbee, Govee-via-HA, groups, etc.) via HA's own REST API,
// so it covers whatever's already wired into the user's actual hub.
export class HomeAssistantLightSync {
  get configured() {
    const c = getConfig();
    return !!(c.HA_URL && c.HA_TOKEN && c.HA_LIGHT_ENTITY_ID);
  }

  async setColor(r, g, b) {
    if (!this.configured) return;
    const { HA_URL, HA_TOKEN, HA_LIGHT_ENTITY_ID } = getConfig();
    const url = `${HA_URL.replace(/\/$/, '')}/api/services/light/turn_on`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entity_id: HA_LIGHT_ENTITY_ID, rgb_color: [r, g, b] }),
        signal: controller.signal,
      });
      if (!res.ok) console.error(`[ha-light] ${res.status} ${res.statusText}`);
    } catch (err) {
      console.error('[ha-light] request failed:', err.message);
    } finally {
      clearTimeout(timer);
    }
  }
}
