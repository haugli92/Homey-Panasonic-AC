'use strict';

module.exports = {
  // GET /sensors — devices with a room-temperature reading (with zone name).
  async getSensors({ homey }) {
    return homey.app.getSensors();
  },

  // GET /ac-devices — this app's air-conditioner devices, for per-device pickers.
  async getAcDevices({ homey }) {
    return homey.app.getAcDevices();
  },
};
