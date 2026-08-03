'use strict';

/**
 * Generates .homeycompose/signals/ir/panasonic_dke.json — a Pronto HEX
 * command map covering every reachable state of the Panasonic CS-E12DKEW:
 *   OFF, and ON for {auto,heat,cool,dry} x 16-30C x {auto,low,med,high}
 *   plus fan-only mode x {auto,low,med,high}.
 *
 * Run: npm run generate  (or: node tools/generate-signals.js)
 */

const fs = require('fs');
const path = require('path');
const { buildProntoHex, MODE, FAN } = require('../lib/panasonic-dke');
const {
  MODES, FANS, TEMPS, MODE_MAP, FAN_MAP, cmdKey,
} = require('../lib/cmd-keys');

const cmds = {};

// OFF (carried mode/temp are irrelevant when the power bit is 0).
cmds[cmdKey({ power: false })] = buildProntoHex({
  power: false, mode: MODE.HEAT, temp: 22, fan: FAN.AUTO,
});

for (const mode of MODES) {
  if (mode === 'fan') {
    for (const fan of FANS) {
      cmds[cmdKey({ power: true, mode, fan })] = buildProntoHex({
        power: true, mode: MODE.FAN, temp: 27, fan: FAN_MAP[fan],
      });
    }
    continue;
  }
  for (const temp of TEMPS) {
    for (const fan of FANS) {
      cmds[cmdKey({
        power: true, mode, temp, fan,
      })] = buildProntoHex({
        power: true, mode: MODE_MAP[mode], temp, fan: FAN_MAP[fan],
      });
    }
  }
}

const signal = { type: 'prontohex', cmds };

const outPath = path.join(
  __dirname, '..', '.homeycompose', 'signals', 'ir', 'panasonic_dke.json',
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(signal, null, 2)}\n`);

console.log(`Wrote ${Object.keys(cmds).length} IR commands to ${outPath}`);
