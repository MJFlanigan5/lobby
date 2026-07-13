import { getConfig } from './config.js';

// LIFX Cloud API. Simpler than Hue — bearer token + selector, no local
// pairing step. LIFX accepts color as an "rgb:r,g,b" string directly.
export class LifxSync {
  get configured() {
    const c = getConfig();
    return !!(c.LIFX_TOKEN && c.LIFX_SELECTOR);
  }

  async setColor(r, g, b) {
    if (!this.configured) return;
    const { LIFX_TOKEN, LIFX_SELECTOR } = getConfig();
    const url = `https://api.lifx.com/v1/lights/${encodeURIComponent(LIFX_SELECTOR)}/state`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${LIFX_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ color: `rgb:${r},${g},${b}`, power: 'on' }),
        signal: controller.signal,
      });
      if (!res.ok) console.error(`[lifx] ${res.status} ${res.statusText}`);
    } catch (err) {
      console.error('[lifx] request failed:', err.message);
    } finally {
      clearTimeout(timer);
    }
  }
}
