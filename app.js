'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('homey-api');

class PanasonicDkeApp extends Homey.App {

  async onInit() {
    // Scoped Web API client, used to read a user-selected room-temperature
    // sensor from another app/device (requires the homey:manager:api permission).
    this.homeyApi = await HomeyAPI.createAppAPI({ homey: this.homey });
    this.log('Panasonic AC (IR) app initialised');
  }

  /**
   * List devices that expose a room temperature, for the settings picker.
   * Called from the settings page via api.js (GET /sensors).
   * @returns {Promise<Array<{id: string, name: string}>>}
   */
  async getSensors() {
    const devices = await this.homeyApi.devices.getDevices();
    return Object.values(devices)
      .filter((d) => Array.isArray(d.capabilities) && d.capabilities.includes('measure_temperature'))
      .map((d) => ({ id: d.id, name: d.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

}

module.exports = PanasonicDkeApp;
