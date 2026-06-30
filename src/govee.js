import { createSocket } from 'dgram';

export class GoveeSync {
  constructor() {
    this.ip = process.env.GOVEE_IP;
    this.deviceId = process.env.GOVEE_DEVICE_ID;
    this.configured = !!(this.ip && this.deviceId);
  }

  sendUdp(payload) {
    return new Promise((resolve) => {
      if (!this.configured) return resolve();
      const client = createSocket('udp4');
      const msg = Buffer.from(JSON.stringify(payload));
      client.send(msg, 4003, this.ip, (err) => {
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

  async fadeToColor(r, g, b, steps = 10) {
    if (!this.configured) return;
    // We don't have current color, so just set directly
    // A proper fade would require reading current state first
    await this.setColor(r, g, b);
  }
}
