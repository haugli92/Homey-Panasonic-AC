# Panasonic CS-E12DKEW (IR) — Homey app

Control a **Panasonic CS-E12DKEW** heat pump from [Homey](https://homey.app) over
infrared, using Homey's **built-in IR blaster**. The unit shows up as a normal
climate device with on/off, target temperature, operating mode and fan speed —
so you get the thermostat tile, Flows and schedules, without pasting raw IR codes.

> ⚠️ **Scope:** This app currently targets the single model **CS-E12DKEW**
> (Panasonic "DKE" IR protocol). Other models are untested.

## How it works

Panasonic air conditioners don't have a discrete "power on" code — every button
press transmits the **entire state** (power + mode + temperature + fan) as one
frame with a checksum. This app therefore computes the correct full-state frame
for whatever combination you set and sends the matching Pronto HEX command.

The IR encoder in [`lib/panasonic-dke.js`](lib/panasonic-dke.js) is a faithful
port of the Panasonic **DKE** protocol from
[IRremoteESP8266](https://github.com/crankyoldgit/IRremoteESP8266)
(`ir_Panasonic.cpp`). The generated `HEAT / 22°C / auto` frame is byte-for-byte
identical to a code verified working on a real CS-E12DKEW.

All command variants are pre-generated into the IR signal manifest:

```bash
npm run generate   # writes .homeycompose/signals/ir/panasonic_dke.json
```

## Capabilities

| Capability           | Values                                   |
| -------------------- | ---------------------------------------- |
| `onoff`              | on / off                                 |
| `target_temperature` | 16–30 °C (1° steps)                      |
| `pana_mode`          | auto / heat / cool / dry / fan-only      |
| `pana_fan`           | auto / low / medium / high               |

## Install (developer mode)

Requires [Node.js](https://nodejs.org), the
[Homey CLI](https://apps.developer.homey.app/the-basics/getting-started) and a
free Homey developer account. Homey and your computer must be on the same network.

```bash
npm install -g homey
homey login
homey app run        # run live for testing
# or
homey app install    # install onto your Homey
```

Then in the Homey app: **Devices → + → this app → Panasonic CS-E12DKEW**.
Place Homey with line of sight to the indoor unit.

## Limitations

- **One-way.** Homey sends but cannot read the unit's actual state (no IR
  receiver). If someone uses the physical remote, Homey's shown state can drift
  until the next command is sent.
- Vertical swing is left at the unit's default; fan speeds are auto/low/med/high.

## Credits & licensing

Protocol logic ported from **IRremoteESP8266** by David Conran et al.
(LGPL-2.1). Released under the MIT license — see [`LICENSE`](LICENSE). If you plan
a wider public release, review compatibility with the upstream LGPL terms.
