'use strict';

const Homey = require('homey');
const { randomUUID } = require('crypto');

module.exports = class PanasonicDkeDriver extends Homey.Driver {

  async onInit() {
    this.log('Panasonic CS-E12DKEW driver initialised');
  }

  // No discovery for an IR device. Offer one unit to add, with a unique id so
  // multiple air conditioners can be added and configured independently.
  async onPairListDevices() {
    return [
      {
        name: 'Panasonic CS-E12DKEW',
        data: { id: randomUUID() },
      },
    ];
  }

};
