'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MODE, FAN, buildState, buildProntoHex, decodeProntoHexToState,
} = require('../lib/panasonic-dke');
const {
  MODES, FANS, TEMPS, MODE_MAP, FAN_MAP, cmdKey,
} = require('../lib/cmd-keys');

const signals = require('../.homeycompose/signals/ir/panasonic_dke.json');

// Reverse lookups: protocol number -> capability string.
const invert = (obj) => Object.keys(obj).reduce((acc, k) => {
  acc[obj[k]] = k;
  return acc;
}, {});
const MODE_NAME = invert(MODE_MAP);
const FAN_NAME = invert(FAN_MAP);

// The exact 27-byte frame confirmed working on a real CS-E12DKEW.
const VERIFIED_HEAT_22_AUTO = [
  0x02, 0x20, 0xE0, 0x04, 0x00, 0x00, 0x00, 0x06, 0x02,
  0x20, 0xE0, 0x04, 0x00, 0x41, 0x2C, 0x80, 0xA0, 0x06,
  0x00, 0x0E, 0xE0, 0x00, 0x00, 0x01, 0x00, 0x06, 0x8E,
];

test('encoder reproduces the hardware-verified HEAT/22/AUTO frame', () => {
  const state = buildState({
    power: true, mode: MODE.HEAT, temp: 22, fan: FAN.AUTO,
  });
  assert.deepEqual(state, VERIFIED_HEAT_22_AUTO);
});

test('temperature clamps to the 16-30 operating range', () => {
  assert.equal(decodeProntoHexToState(
    buildProntoHex({
      power: true, mode: MODE.HEAT, temp: 5, fan: FAN.AUTO,
    }),
  ).temp, 16);
  assert.equal(decodeProntoHexToState(
    buildProntoHex({
      power: true, mode: MODE.COOL, temp: 40, fan: FAN.AUTO,
    }),
  ).temp, 30);
});

test('every device-reachable state has a generated command', () => {
  for (const mode of MODES) {
    for (const fan of FANS) {
      if (mode === 'fan') {
        assert.ok(cmdKey({ power: true, mode, fan }) in signals.cmds);
      } else {
        for (const temp of TEMPS) {
          assert.ok(cmdKey({
            power: true, mode, temp, fan,
          }) in signals.cmds);
        }
      }
    }
  }
  assert.ok('OFF' in signals.cmds);
});

test('all 245 commands round-trip: valid checksum and correct fields', () => {
  const entries = Object.entries(signals.cmds);
  assert.equal(entries.length, 245);

  for (const [key, hex] of entries) {
    const d = decodeProntoHexToState(hex);
    assert.ok(d.checksumOk, `${key}: bad checksum`);

    if (key === 'OFF') {
      assert.equal(d.power, false, 'OFF must have power off');
      continue;
    }

    assert.equal(d.power, true, `${key}: expected power on`);

    const parts = key.split('_');
    if (parts[0] === 'FAN') {
      // FAN_<FANSPEED>
      assert.equal(MODE_NAME[d.mode], 'fan', `${key}: mode`);
      assert.equal(FAN_NAME[d.fan], parts[1].toLowerCase(), `${key}: fan`);
      assert.equal(d.temp, 27, `${key}: fan-only temp should be 27`);
    } else {
      // <MODE>_<TEMP>_<FANSPEED>
      const [mode, temp, fan] = parts;
      assert.equal(MODE_NAME[d.mode], mode.toLowerCase(), `${key}: mode`);
      assert.equal(d.temp, Number(temp), `${key}: temp`);
      assert.equal(FAN_NAME[d.fan], fan.toLowerCase(), `${key}: fan`);
    }
  }
});
