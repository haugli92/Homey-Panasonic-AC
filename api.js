'use strict';

module.exports = {
  // GET /sensors — list devices with a room-temperature reading (for the
  // settings picker). Route is declared under "api" in the app manifest.
  async getSensors({ homey }) {
    return homey.app.getSensors();
  },
};
