'use strict';

const Homey = require('homey');
const { cmdKey } = require('../../lib/cmd-keys');

const SIGNAL_ID = 'panasonic_dke';
const SOURCES_SETTING = 'sources'; // app setting: { [acDataId]: sourceSensorId }
const DEFAULTS = {
  onoff: false,
  target_temperature: 22,
  pana_mode: 'heat',
  pana_fan: 'auto',
};

module.exports = class PanasonicDkeDevice extends Homey.Device {

  async onInit() {
    try {
      this.signal = this.homey.rf.getSignalInfrared(SIGNAL_ID);
    } catch (err) {
      this.error('Failed to acquire IR signal:', err);
    }

    // Migrate devices added before measure_temperature existed.
    if (!this.hasCapability('measure_temperature')) {
      await this.addCapability('measure_temperature').catch(this.error);
    }

    await this._ensureDefaults();

    // Panasonic sends the whole state in one frame, so batch simultaneous
    // capability changes and emit a single IR command.
    this.registerMultipleCapabilityListener(
      ['onoff', 'target_temperature', 'pana_mode', 'pana_fan'],
      (values) => this._onCapabilities(values),
      500,
    );

    // Mirror the room temperature from a user-selected source device, and
    // re-subscribe whenever that selection changes.
    this._onSettingsChange = (key) => {
      if (key === SOURCES_SETTING) this._applySensorSource().catch(this.error);
    };
    this.homey.settings.on('set', this._onSettingsChange);
    this.homey.settings.on('unset', this._onSettingsChange);
    await this._applySensorSource().catch(this.error);

    this.log('Panasonic CS-E12DKEW device ready');
  }

  async _ensureDefaults() {
    for (const [cap, value] of Object.entries(DEFAULTS)) {
      const current = this.getCapabilityValue(cap);
      if (current === null || current === undefined) {
        await this.setCapabilityValue(cap, value).catch(this.error);
      }
    }
  }

  // --- External room-temperature source ---

  async _applySensorSource() {
    // Tear down any previous subscription first.
    if (this._tempInstance) {
      this._tempInstance.destroy();
      this._tempInstance = null;
    }

    const map = this.homey.settings.get(SOURCES_SETTING) || {};
    const sourceId = map[this.getData().id];
    if (!sourceId) {
      await this.setCapabilityValue('measure_temperature', null).catch(() => {});
      return;
    }

    const { homeyApi } = this.homey.app;
    if (!homeyApi) {
      this.error('HomeyAPI not ready; cannot subscribe to source sensor');
      return;
    }

    const source = await homeyApi.devices.getDevice({ id: sourceId });
    if (!source) {
      this.error('Selected source sensor not found:', sourceId);
      return;
    }

    // Seed with the current value, then follow realtime updates.
    const initial = source.capabilitiesObj?.measure_temperature?.value;
    if (typeof initial === 'number') {
      await this.setCapabilityValue('measure_temperature', initial).catch(this.error);
    }

    this._tempInstance = source.makeCapabilityInstance('measure_temperature', (value) => {
      this.setCapabilityValue('measure_temperature', value).catch(this.error);
    });
    this.log('Mirroring room temperature from', source.name);
  }

  async _onCapabilities(values) {
    const cur = (cap) => this.getCapabilityValue(cap);

    const power = 'onoff' in values ? values.onoff : cur('onoff');
    const mode = values.pana_mode ?? cur('pana_mode');
    const fan = values.pana_fan ?? cur('pana_fan');
    let temp = values.target_temperature ?? cur('target_temperature');
    temp = Math.min(30, Math.max(16, Math.round(temp)));

    // Turning off: send OFF and stop.
    if ('onoff' in values && values.onoff === false) {
      return this._send({ power: false });
    }
    // Adjusting settings while off: just remember them, don't wake the unit.
    if (!power) return undefined;

    return this._send({
      power: true, mode, temp, fan,
    });
  }

  async _send(state) {
    if (!this.signal) throw new Error('IR blaster signal unavailable');
    const key = cmdKey(state);
    this.log('IR →', key);
    await this.signal.cmd(key);
  }

  async onUninit() {
    if (this._tempInstance) {
      this._tempInstance.destroy();
      this._tempInstance = null;
    }
    if (this._onSettingsChange) {
      this.homey.settings.removeListener('set', this._onSettingsChange);
      this.homey.settings.removeListener('unset', this._onSettingsChange);
    }
  }

};
