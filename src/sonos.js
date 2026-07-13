import { getConfig } from './config.js';

// Sonos local control (UPnP/SOAP on port 1400) — the same reverse-engineered
// local API Home Assistant's own Sonos integration uses, not the official
// cloud OAuth Control API, which is overkill for a self-hosted single-zone
// duck/restore. Ducks volume when Lobby's theme music starts, restores it
// when theme music stops.
export class SonosDuck {
  constructor() {
    this._savedVolume = null;
  }

  get configured() {
    const c = getConfig();
    return !!c.SONOS_IP;
  }

  async _soapCall(action, extraArgs = '') {
    const { SONOS_IP } = getConfig();
    const url = `http://${SONOS_IP}:1400/MediaRenderer/RenderingControl/Control`;
    const body = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:${action} xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1">
      <InstanceID>0</InstanceID>
      <Channel>Master</Channel>
      ${extraArgs}
    </u:${action}>
  </s:Body>
</s:Envelope>`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset="utf-8"',
          SOAPAction: `"urn:schemas-upnp-org:service:RenderingControl:1#${action}"`,
        },
        body,
        signal: controller.signal,
      });
      if (!res.ok) {
        console.error(`[sonos] ${action} ${res.status} ${res.statusText}`);
        return null;
      }
      return await res.text();
    } catch (err) {
      console.error(`[sonos] ${action} failed:`, err.message);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async getVolume() {
    const xml = await this._soapCall('GetVolume');
    if (!xml) return null;
    const match = xml.match(/<CurrentVolume>(\d+)<\/CurrentVolume>/);
    return match ? parseInt(match[1], 10) : null;
  }

  async setVolume(volume) {
    await this._soapCall('SetVolume', `<DesiredVolume>${volume}</DesiredVolume>`);
  }

  async duck() {
    if (!this.configured) return;
    // Already ducked — don't re-fetch and overwrite the saved original with
    // the current (already-ducked) volume if this fires again before restore().
    if (this._savedVolume !== null) return;
    const { SONOS_DUCK_VOLUME } = getConfig();
    const target = parseInt(SONOS_DUCK_VOLUME, 10) || 15;
    const current = await this.getVolume();
    if (current === null) return; // couldn't reach the speaker — don't guess a "restore" value
    this._savedVolume = current;
    if (current > target) await this.setVolume(target);
  }

  async restore() {
    if (!this.configured || this._savedVolume === null) return;
    await this.setVolume(this._savedVolume);
    this._savedVolume = null;
  }
}
