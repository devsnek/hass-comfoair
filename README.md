# ComfoAir

Use a serial connection (or ESPHome serial proxy) to control your ComfoAir system.

## Compatibility

This is a list of models that are known to work, feel free to add yours if you tested it successfully:

* Zehnder WHR 930
* Zehnder WHR 950
* Zehnder ComfoAir 160
* Zehnder ComfoAir 200
* Zehnder ComfoAir 500
* Zehnder Comfoair 550
* Zehnder ComfoD 300
* Zehnder ComfoD 350
* Zehnder ComfoD 450
* Zehnder ComfoD 550

## Incompatible

* Zehnder ComfoAir Q350 (CAN)
* Zehnder ComfoAir Q450 (CAN)
* Zehnder ComfoAir Q600 (CAN)


## Connecting to ComfoAir RS232

If your device uses an RJ45 port for RS232, please note that this is not compatible with
the more commonly found "Cisco Style" RS232 adapeters. If you use one of these it will
likely damage or destroy your hardware!

This diagram shows the wiring used by ComfoAir devices:

![](https://community-assets.home-assistant.io/original/3X/5/e/5e8c76a9cadf7ed59be6d994c659d15f9ca73b57.png)

## Lovelace card

The integration bundles a custom dashboard card and registers it automatically —
no manual copy to `/config/www` and no resource registration needed. After
installing the integration, just add a card of type `custom:comfoair-card`.

It shows the four air temperatures arranged around the unit, the supply/return
air levels and fan speeds, status chips (bypass, summer mode, preheating,
filter), the comfort setpoint with `-`/`+` controls, and ventilation level
buttons (Away / Low / Medium / High — also cycled by clicking the fan row).
Clicking any value opens its more-info dialog.

All entity ids are configurable because they depend on the device name (find
the real ids under Settings → Devices & Services → ComfoAir). Any omitted key
falls back to a `comfoair`-slug default; entities that do not exist render as
`—`.

```yaml
type: custom:comfoair-card
title: ComfoAir 350
climate: climate.comfoair
outside_temp: sensor.comfoair_outside_air_temperature
supply_temp: sensor.comfoair_supply_air_temperature
return_temp: sensor.comfoair_return_air_temperature
exhaust_temp: sensor.comfoair_exhaust_air_temperature
supply_level: sensor.comfoair_supply_air_level
return_level: sensor.comfoair_return_air_level
intake_fan: sensor.comfoair_supply_fan_speed
exhaust_fan: sensor.comfoair_return_fan_speed
bypass: binary_sensor.comfoair_bypass_valve_open
summer_mode: binary_sensor.comfoair_summer_mode
preheating: binary_sensor.comfoair_preheating_state
filter_status: sensor.comfoair_filter_status
temp_step: 1          # °C step for the comfort +/- buttons
```

The card also supports an optional Fan Balance select (`fan_balance` config
key); the control is only rendered when such an entity exists.

## ESPHome serial bridge

If the ComfoAir is not physically near the Home Assistant host, an ESP32 can
bridge its RS232 to the network. See
[`esphome/comfoair-350-control.yaml`](esphome/comfoair-350-control.yaml) for a
minimal UART + `serial_proxy` example (GPIO pins are placeholders).
