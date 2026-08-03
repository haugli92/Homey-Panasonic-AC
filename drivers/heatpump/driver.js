'use strict';

const Homey = require('homey');

module.exports = class PanasonicDkeDriver extends Homey.Driver {

  async onInit() {
    this.log('Panasonic CS-E12DKEW driver initialised');
  }

  // No discovery for an IR device — offer the single supported model.
  async onPairListDevices() {
    return [
      {
        name: 'Panasonic CS-E12DKEW',
        data: { id: 'panasonic-cs-e12dkew' },
      },
    ];
  }

};
