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

// Room temperature is the core mirrored value (always present on our device).
// Extra readings are added when the chosen source exposes them, and removed
// when it doesn't — so Homey's built-in status-indicator picker only offers
// what the sensor actually provides.
const CORE_CAP = 'measure_temperature';
const OPTIONAL_CAPS = ['measure_humidity'];

module.exports = class PanasonicDkeDevice extends Homey.Device {

  async onInit() {
    this._instances = {};

    try {
      this.signal = this.homey.rf.getSignalInfrared(SIGNAL_ID);
    } catch (err) {
      this.error('Failed to acquire IR signal:', err);
    }

    // Migrate devices added before measure_temperature existed.
    if (!this.hasCapability(CORE_CAP)) {
      await this.addCapability(CORE_CAP).catch(this.error);
    }

    await this._ensureDefaults();

    // Panasonic sends the whole state in one frame, so batch simultaneous
    // capability changes and emit a single IR command.
    this.registerMultipleCapabilityListener(
      ['onoff', 'target_temperature', 'pana_mode', 'pana_fan'],
      (values) => this._onCapabilities(values),
      500,
    );

    // Mirror readings from a user-selected source device, and re-subscribe
    // whenever that selection changes.
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

  // --- External sensor mirroring ---

  _destroyInstances() {
    for (const instance of Object.values(this._instances)) {
      try {
        instance.destroy();
      } catch (err) {
        this.error('Failed to destroy capability instance:', err);
      }
    }
    this._instances = {};
  }

  _mirror(source, cap) {
    const initial = source.capabilitiesObj?.[cap]?.value;
    if (typeof initial === 'number') {
      this.setCapabilityValue(cap, initial).catch(this.error);
    }
    this._instances[cap] = source.makeCapabilityInstance(cap, (value) => {
      this.setCapabilityValue(cap, value).catch(this.error);
    });
  }

  async _applySensorSource() {
    this._destroyInstances();

    const map = this.homey.settings.get(SOURCES_SETTING) || {};
    const sourceId = map[this.getData().id];

    // No source selected: clear temperature and drop the optional readings.
    if (!sourceId) {
      await this.setCapabilityValue(CORE_CAP, null).catch(() => {});
      await this._removeOptionalCaps();
      return;
    }

    const { homeyApi } = this.homey.app;
    if (!homeyApi) {
      this.error('HomeyAPI not ready; cannot subscribe to source sensor');
      return;
    }

    const source = await homeyApi.devices.getDevice({ id: sourceId }).catch(() => null);
    if (!source) {
      this.error('Selected source sensor not found:', sourceId);
      return;
    }

    const caps = Array.isArray(source.capabilities) ? source.capabilities : [];
    const mirrored = [];

    // Core: room temperature.
    if (caps.includes(CORE_CAP)) {
      this._mirror(source, CORE_CAP);
      mirrored.push(CORE_CAP);
    } else {
      await this.setCapabilityValue(CORE_CAP, null).catch(() => {});
    }

    // Optional readings: add when present on the source, remove otherwise.
    for (const cap of OPTIONAL_CAPS) {
      if (caps.includes(cap)) {
        if (!this.hasCapability(cap)) await this.addCapability(cap).catch(this.error);
        this._mirror(source, cap);
        mirrored.push(cap);
      } else if (this.hasCapability(cap)) {
        await this.removeCapability(cap).catch(this.error);
      }
    }

    this.log(`Mirroring from ${source.name}: ${mirrored.join(', ') || 'nothing'}`);
  }

  async _removeOptionalCaps() {
    for (const cap of OPTIONAL_CAPS) {
      if (this.hasCapability(cap)) await this.removeCapability(cap).catch(this.error);
    }
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
    this._destroyInstances();
    if (this._onSettingsChange) {
      this.homey.settings.removeListener('set', this._onSettingsChange);
      this.homey.settings.removeListener('unset', this._onSettingsChange);
    }
  }

};
