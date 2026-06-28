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

https://github.com/TimWeyand/lovelace-comfoair is recommended. After installing
it should "just work" with this component.

## ESPHome serial bridge

If the ComfoAir is not physically near the Home Assistant host, an ESP32 can
bridge its RS232 to the network. See
[`esphome/comfoair-350-control.yaml`](esphome/comfoair-350-control.yaml) for a
minimal UART + `serial_proxy` example (GPIO pins are placeholders).
