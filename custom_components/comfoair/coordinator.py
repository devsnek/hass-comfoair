"""DataUpdateCoordinator for the ComfoAir integration.

The wire protocol is fire-and-forget: we send a read command, the device
sends back a frame, and the device *also* volunteers state updates without
being polled. We don't pair requests with responses. Instead, the transport
dispatches every non-ACK frame to `on_frame`, which looks up a parser by
msg_id and pushes the updated state to entities.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import timedelta
from typing import Any, Callable

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from . import protocol as p
from .const import (
    DOMAIN,
    FEATURE_BYPASS,
    FEATURE_ENTHALPY,
    FEATURE_EWT,
    FEATURE_FIREPLACE,
    FEATURE_KITCHEN_HOOD,
    FEATURE_POSTHEATING,
    FEATURE_PREHEATING,
    MAX_TEMPERATURE,
    MIN_TEMPERATURE,
)
from .protocol import Frame
from .transport import ComfoAirTransport

_LOGGER = logging.getLogger(__name__)

POLL_INTERVAL = timedelta(seconds=10)
PROBE_TIMEOUT = 3.0


class ComfoAirCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Polls the ventilation unit and exposes parsed values to entities."""

    transport: ComfoAirTransport
    features: dict[str, bool]
    device_name: str
    firmware_name: str | None = None
    firmware_version: str | None = None
    bootloader_name: str | None = None
    bootloader_version: str | None = None
    connector_board_name: str | None = None
    connector_board_version: str | None = None
    cc_ease_version: str | None = None
    cc_luxe_version: str | None = None

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        transport: ComfoAirTransport,
        device_name: str,
    ) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=f"{DOMAIN}:{entry.entry_id}",
            update_interval=POLL_INTERVAL,
        )
        self.entry = entry
        self.transport = transport
        self.device_name = device_name
        self.features = {
            FEATURE_PREHEATING: False,
            FEATURE_BYPASS: False,
            FEATURE_FIREPLACE: False,
            FEATURE_KITCHEN_HOOD: False,
            FEATURE_POSTHEATING: False,
            FEATURE_ENTHALPY: False,
            FEATURE_EWT: False,
        }
        self._state: dict[str, Any] = {}
        self.transport.add_callback(self.on_frame)

    # ---- frame dispatch ------------------------------------------------------

    def on_frame(self, frame: Frame) -> None:
        """Called by the transport for every non-ACK frame."""
        parser = _PARSERS.get(frame.msg_id)
        if parser is None:
            _LOGGER.debug(
                "Unhandled frame 0x%02X data=%s", frame.msg_id, frame.data.hex()
            )
            return
        try:
            parser(self, frame.data)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("parse error for 0x%02X", frame.msg_id)
            return
        # Push the updated snapshot to entities. Safe to call from the reader
        # task because we're on the event loop.
        self.async_set_updated_data(dict(self._state))

    # ---- setup / discovery ---------------------------------------------------

    async def async_probe(self) -> None:
        """Discover firmware identity and which optional modules are present.

        Called once during async_setup_entry. Raises on failure.
        """
        _LOGGER.debug("Probe: requesting firmware version")
        await self.transport.request(
            p.CMD_GET_FIRMWARE_VERSION,
            p.RES_GET_FIRMWARE_VERSION,
            timeout=PROBE_TIMEOUT,
        )

        _LOGGER.debug("Probe: requesting bootloader version")
        await self.transport.request(
            p.CMD_GET_BOOTLOADER_VERSION,
            p.RES_GET_BOOTLOADER_VERSION,
            timeout=PROBE_TIMEOUT,
        )

        _LOGGER.debug("Probe: requesting connector board version")
        await self.transport.request(
            p.CMD_GET_CONNECTOR_BOARD_VERSION,
            p.RES_GET_CONNECTOR_BOARD_VERSION,
            timeout=PROBE_TIMEOUT,
        )

        _LOGGER.debug("Probe: requesting status")
        await self.transport.request(
            p.CMD_GET_STATUS, p.RES_GET_STATUS, timeout=PROBE_TIMEOUT
        )

    def _poll_commands(self) -> list[int]:
        cmds = [
            p.CMD_GET_FAN_STATUS,
            p.CMD_GET_VENTILATION_LEVEL,
            p.CMD_GET_TEMPERATURES,
            p.CMD_GET_FAULTS,
            p.CMD_GET_OPERATION_HOURS,
            p.CMD_GET_TIME_DELAY,
            p.CMD_GET_VALVE_STATUS,
        ]
        if self.features[FEATURE_BYPASS]:
            cmds.append(p.CMD_GET_BYPASS_CONTROL_STATUS)
        if self.features[FEATURE_PREHEATING]:
            cmds.append(p.CMD_GET_PREHEATING_STATUS)
        if self.features[FEATURE_ENTHALPY]:
            cmds.append(p.CMD_GET_SENSOR_DATA)
        return cmds

    # ---- polling -------------------------------------------------------------

    async def _async_update_data(self) -> dict[str, Any]:
        try:
            if not self.transport.is_connected:
                await self.transport.connect()
            for cmd in self._poll_commands():
                await self.transport.send(cmd)
                await asyncio.sleep(0.5)
        except (ConnectionError, asyncio.TimeoutError) as err:
            raise UpdateFailed(str(err)) from err
        return dict(self._state)

    # ---- parsers (data slices map directly to msg bytes in registers.h) ------

    def _parse_bootloader(self, d: bytes) -> None:
        self.bootloader_version = f"{d[0]}.{d[1]:02d}b{d[2]}"
        self.bootloader_name = d[3:13].rstrip(b"\x00").decode("ascii", errors="replace")

    def _parse_firmware(self, d: bytes) -> None:
        self.firmware_version = f"{d[0]}.{d[1]:02d}b{d[2]}"
        self.firmware_name = d[3:13].rstrip(b"\x00").decode("ascii", errors="replace")

    def _parse_connector_board(self, d: bytes) -> None:
        self.connector_board_version = f"{d[0]}.{d[1]:02d}"
        self.connector_board_name = (
            d[2:12].rstrip(b"\x00").decode("ascii", errors="replace")
        )
        self.cc_ease_version = f"{d[12] >> 4}.{d[12] & 0x0f:02d}" if d[12] else None
        self.cc_luxe_version = f"{d[13] >> 4}.{d[13] & 0x0f:02d}" if d[13] else None

    def _parse_status(self, d: bytes) -> None:
        self.features = {
            FEATURE_PREHEATING: bool(d[0]),
            FEATURE_BYPASS: bool(d[1]),
            FEATURE_FIREPLACE: bool(d[4] & 0x01),
            FEATURE_KITCHEN_HOOD: bool(d[4] & 0x02),
            FEATURE_POSTHEATING: bool(d[4] & 0x04),
            FEATURE_ENTHALPY: bool(d[9]),
            FEATURE_EWT: bool(d[10]),
        }

    def _parse_fan(self, d: bytes) -> None:
        s = self._state
        s["intake_fan_speed"] = d[0]
        s["exhaust_fan_speed"] = d[1]
        s["intake_fan_speed_rpm"] = p.rpm_from_period(p.u16(d, 2))
        s["exhaust_fan_speed_rpm"] = p.rpm_from_period(p.u16(d, 4))

    def _parse_level(self, d: bytes) -> None:
        s = self._state
        s["return_air_level"] = d[6]
        s["supply_air_level"] = d[7]
        s["ventilation_level"] = d[8] - 1
        s["current_level_raw"] = d[8]
        s["supply_fan_active"] = d[9] == 1

    def _parse_temps(self, d: bytes) -> None:
        s = self._state
        s["target_temperature"] = p.byte_to_temp(d[0])
        present = d[5]
        if present & 0x01:
            s["outside_air_temperature"] = p.byte_to_temp(d[1])
        if present & 0x02:
            s["supply_air_temperature"] = p.byte_to_temp(d[2])
        if present & 0x04:
            s["return_air_temperature"] = p.byte_to_temp(d[3])
            s["current_temperature"] = p.byte_to_temp(d[3])
        if present & 0x08:
            s["exhaust_air_temperature"] = p.byte_to_temp(d[4])
        if present & 0x10:
            s["ewt_temperature"] = p.byte_to_temp(d[6])
        if present & 0x20:
            s["reheating_temperature"] = p.byte_to_temp(d[7])
        if present & 0x40:
            s["kitchen_hood_temperature"] = p.byte_to_temp(d[8])

    def _parse_faults(self, d: bytes) -> None:
        status = d[8]
        self._state["filter_status"] = (
            "Ok" if status == 0 else "Full" if status == 1 else "Unknown"
        )

    def _parse_hours(self, d: bytes) -> None:
        s = self._state
        s["level0_hours"] = p.u24(d, 0)
        s["level1_hours"] = p.u24(d, 3)
        s["level2_hours"] = p.u24(d, 6)
        s["level3_hours"] = p.u24(d, 17)
        s["frost_protection_hours"] = p.u16(d, 9)
        s["preheating_hours"] = p.u16(d, 11)
        s["bypass_open_hours"] = p.u16(d, 13)
        s["filter_hours"] = p.u16(d, 15)

    def _parse_time_delay(self, d: bytes) -> None:
        s = self._state
        s["bathroom_switch_on_delay_minutes"] = d[0]
        s["bathroom_switch_off_delay_minutes"] = d[1]
        s["l1_switch_off_delay_minutes"] = d[2]
        s["boost_ventilation_minutes"] = d[3]
        s["filter_warning_weeks"] = d[4]
        s["rf_high_time_short_minutes"] = d[5]
        s["rf_high_time_long_minutes"] = d[6]
        s["extractor_hood_switch_off_delay_minutes"] = d[7]

    def _parse_valve(self, d: bytes) -> None:
        s = self._state
        s["bypass_valve"] = d[0]
        s["bypass_valve_open"] = d[0] != 0
        s["preheating_state"] = d[1] != 0
        s["motor_current_bypass"] = d[2]
        s["motor_current_preheating"] = d[3]

    def _parse_bypass(self, d: bytes) -> None:
        s = self._state
        s["bypass_factor"] = d[2]
        s["bypass_step"] = d[3]
        s["bypass_correction"] = d[4]
        s["summer_mode"] = d[6] != 0

    def _parse_preheating(self, d: bytes) -> None:
        s = self._state
        s["preheating_valve"] = (
            "Closed" if d[0] == 0 else "Open" if d[0] == 1 else "Unknown"
        )
        s["frost_protection_active"] = d[1] != 0
        s["preheating_state"] = d[2] != 0
        s["frost_protection_minutes"] = p.u16(d, 3)
        s["frost_protection_level"] = {
            0: "GuaranteedProtection",
            1: "HighProtection",
            2: "NominalProtection",
            3: "Economy",
        }.get(d[5], "Unknown")

    def _parse_sensor_data(self, d: bytes) -> None:
        self._state["enthalpy_temperature"] = p.byte_to_temp(d[0])

    # ---- writes --------------------------------------------------------------

    async def async_set_level(self, level: int) -> None:
        if not 0 <= level <= 4:
            raise ValueError(f"invalid ventilation level: {level}")
        await self.transport.send(p.CMD_SET_LEVEL, bytes([level]))

    async def async_set_comfort_temperature(self, temperature: float) -> None:
        if not MIN_TEMPERATURE <= temperature <= MAX_TEMPERATURE:
            raise ValueError(f"invalid comfort temperature: {temperature}")
        await self.transport.send(
            p.CMD_SET_COMFORT_TEMPERATURE, bytes([p.temp_to_byte(temperature)])
        )

    async def async_reset_filter(self) -> None:
        await self.transport.send(p.CMD_RESET_AND_SELF_TEST, bytes([0, 0, 0, 1]))

    async def async_reset_errors(self) -> None:
        await self.transport.send(p.CMD_RESET_AND_SELF_TEST, bytes([1, 0, 0, 0]))


_PARSERS: dict[int, Callable[[ComfoAirCoordinator, bytes], None]] = {
    p.RES_GET_BOOTLOADER_VERSION: ComfoAirCoordinator._parse_bootloader,
    p.RES_GET_FIRMWARE_VERSION: ComfoAirCoordinator._parse_firmware,
    p.RES_GET_CONNECTOR_BOARD_VERSION: ComfoAirCoordinator._parse_connector_board,
    p.RES_GET_STATUS: ComfoAirCoordinator._parse_status,
    p.RES_GET_FAN_STATUS: ComfoAirCoordinator._parse_fan,
    p.RES_GET_VENTILATION_LEVEL: ComfoAirCoordinator._parse_level,
    p.RES_GET_TEMPERATURES: ComfoAirCoordinator._parse_temps,
    p.RES_GET_FAULTS: ComfoAirCoordinator._parse_faults,
    p.RES_GET_OPERATION_HOURS: ComfoAirCoordinator._parse_hours,
    p.RES_GET_TIME_DELAY: ComfoAirCoordinator._parse_time_delay,
    p.RES_GET_VALVE_STATUS: ComfoAirCoordinator._parse_valve,
    p.RES_GET_BYPASS_CONTROL_STATUS: ComfoAirCoordinator._parse_bypass,
    p.RES_GET_PREHEATING_STATUS: ComfoAirCoordinator._parse_preheating,
    p.RES_GET_SENSOR_DATA: ComfoAirCoordinator._parse_sensor_data,
}
