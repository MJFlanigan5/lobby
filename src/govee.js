import { createSocket } from 'dgram';
import { getConfig } from './config.js';

export class GoveeSync {
  get configured() {
    const c = getConfig();
    return !!(c.GOVEE_IP && c.GOVEE_DEVICE_ID);
  }

  sendUdp(payload) {
    return new Promise((resolve) => {
      const { GOVEE_IP } = getConfig();
      if (!this.configured) return resolve();
      const client = createSocket('udp4');
      const msg = Buffer.from(JSON.stringify(payload));
      client.send(msg, 4003, GOVEE_IP, (err) => {
        client.close();
        if (err) console.error('[govee] UDP error:', err.message);
        resolve();
      });
    });
  }

  buildColorCommand(r, g, b) {
    return {
      msg: {
        cmd: 'colorwc',
        data: {
          color: { r, g, b },
          colorTemInKelvin: 0,
        },
      },
    };
  }

  async setColor(r, g, b) {
    if (!this.configured) return;
    await this.sendUdp(this.buildColorCommand(r, g, b));
  }

}
