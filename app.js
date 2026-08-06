'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('homey-api');

const DRIVER_ID = 'heatpump';

class PanasonicDkeApp extends Homey.App {

  async onInit() {
    // Scoped Web API client, used to read a user-selected room-temperature
    // sensor from another app/device (requires the homey:manager:api permission).
    this.homeyApi = await HomeyAPI.createAppAPI({ homey: this.homey });
    this.log('Panasonic AC (IR) app initialised');
  }

  /**
   * List devices that expose a room temperature, with their zone name so the
   * settings picker can disambiguate identically-named devices.
   * @returns {Promise<Array<{id: string, name: string, zone: string}>>}
   */
  async getSensors() {
    const [devices, zones] = await Promise.all([
      this.homeyApi.devices.getDevices(),
      this.homeyApi.zones.getZones(),
    ]);
    const zoneName = (id) => (zones[id] && zones[id].name) || '';
    return Object.values(devices)
      .filter((d) => Array.isArray(d.capabilities) && d.capabilities.includes('measure_temperature'))
      .map((d) => ({ id: d.id, name: d.name, zone: zoneName(d.zone) }))
      .sort((a, b) => `${a.zone}${a.name}`.localeCompare(`${b.zone}${b.name}`));
  }

  /**
   * List this app's air-conditioner devices, so the settings page can offer a
   * per-device sensor picker.
   * @returns {Array<{id: string, name: string}>}
   */
  getAcDevices() {
    return this.homey.drivers.getDriver(DRIVER_ID).getDevices()
      .map((d) => ({ id: d.getData().id, name: d.getName() }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

}

module.exports = PanasonicDkeApp;
