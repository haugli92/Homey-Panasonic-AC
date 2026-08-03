'use strict';

const Homey = require('homey');

class PanasonicDkeApp extends Homey.App {

  async onInit() {
    this.log('Panasonic CS-E12DKEW (IR) app initialised');
  }

}

module.exports = PanasonicDkeApp;
