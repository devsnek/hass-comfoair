"""Tests for the ComfoAir coordinator's pure parsing and write-path logic.

The frame parsers and helpers don't touch Home Assistant, so we exercise them on
a bare coordinator instance built with ``object.__new__`` (skipping the
HA-dependent ``__init__``) rather than standing up a full hass fixture.
"""

from __future__ import annotations

from typing import cast

import pytest

from custom_components.comfoair import protocol as p
from custom_components.comfoair.const import (
    FEATURE_BYPASS,
    FEATURE_ENTHALPY,
    FEATURE_EWT,
    FEATURE_FIREPLACE,
    FEATURE_KITCHEN_HOOD,
    FEATURE_POSTHEATING,
    FEATURE_PREHEATING,
)
from custom_components.comfoair.coordinator import (
    ComfoAirCoordinator,
    _format_errors,
    _get_byte,
)
from custom_components.comfoair.transport import ComfoAirTransport


def make_coordinator() -> ComfoAirCoordinator:
    coord = object.__new__(ComfoAirCoordinator)
    coord._state = {}
    coord.features = {
        FEATURE_PREHEATING: False,
        FEATURE_BYPASS: False,
        FEATURE_FIREPLACE: False,
        FEATURE_KITCHEN_HOOD: False,
        FEATURE_POSTHEATING: False,
        FEATURE_ENTHALPY: False,
        FEATURE_EWT: False,
    }
    return coord


class FakeTransport:
    """Records sends so write-path tests can assert on the wire commands."""

    def __init__(self) -> None:
        self.sent: list[tuple[int, bytes]] = []

    async def send(self, cmd: int, data: bytes = b"") -> None:
        self.sent.append((cmd, data))


# --- _get_byte ----------------------------------------------------------------


def test_get_byte_in_range() -> None:
    assert _get_byte(b"\x01\x02\x03", 1) == 0x02


def test_get_byte_out_of_range_returns_none() -> None:
    assert _get_byte(b"\x01", 5) is None


# --- _format_errors -----------------------------------------------------------


def test_format_errors_empty() -> None:
    assert _format_errors(0, 0, 0, 0) == "OK"


def test_format_errors_a_low_bits() -> None:
    # bit 0 -> A1, bit 7 -> A8
    assert _format_errors(0b1000_0001, 0, 0, 0) == "A1, A8"


def test_format_errors_a_high_uses_lookup_table() -> None:
    # a_high bit 0 -> A9, bit 7 -> A0
    assert _format_errors(0, 0b1000_0001, 0, 0) == "A9, A0"


def test_format_errors_e_and_ea_bits() -> None:
    assert _format_errors(0, 0, 0b0000_0001, 0b0000_0010) == "E1, EA2"


def test_format_errors_ordering() -> None:
    # A-low, then A-high, then E, then EA.
    assert _format_errors(0b1, 0b1, 0b1, 0b1) == "A1, A9, E1, EA1"


# --- _parse_fan ---------------------------------------------------------------


def test_parse_fan() -> None:
    coord = make_coordinator()
    # supply%, return%, supply period (u16), return period (u16)
    data = bytes([40, 60]) + (1250).to_bytes(2, "big") + (2500).to_bytes(2, "big")
    coord._parse_fan(data)
    s = coord._state
    assert s["supply_fan_speed"] == 40
    assert s["return_fan_speed"] == 60
    assert s["supply_fan_speed_rpm"] == 1500
    assert s["return_fan_speed_rpm"] == 750


# --- _parse_temps -------------------------------------------------------------


def test_parse_temps_present_mask_gates_fields() -> None:
    coord = make_coordinator()
    data = bytearray(9)
    data[0] = p.temp_to_byte(21.0)  # target, always set
    data[1] = p.temp_to_byte(10.0)  # outside
    data[3] = p.temp_to_byte(18.0)  # return / current
    data[5] = 0x01 | 0x04  # present mask: outside + return
    coord._parse_temps(bytes(data))
    s = coord._state
    assert s["target_temperature"] == 21.0
    assert s["outside_air_temperature"] == 10.0
    assert s["return_air_temperature"] == 18.0
    assert s["current_temperature"] == 18.0
    # supply bit not set -> not populated
    assert "supply_air_temperature" not in s


def test_parse_temps_no_optional_fields() -> None:
    coord = make_coordinator()
    data = bytes([p.temp_to_byte(22.0)]) + bytes(8)  # present mask byte is 0
    coord._parse_temps(data)
    assert coord._state == {"target_temperature": 22.0}


# --- _parse_bypass (short-frame tolerance) ------------------------------------


def test_parse_bypass_full_frame() -> None:
    coord = make_coordinator()
    data = bytes(
        [0, 0, 50, 1, 2, 0, 1]
    )  # factor, step, correction at 2..4; summer at 6
    coord._parse_bypass(data)
    s = coord._state
    assert s["bypass_factor"] == 50
    assert s["bypass_step"] == 1
    assert s["bypass_correction"] == 2
    assert s["summer_mode"] is True


def test_parse_bypass_short_frame_skips_missing_bytes() -> None:
    coord = make_coordinator()
    # Only 4 bytes: summer_mode byte (index 6) is absent and must be skipped.
    coord._parse_bypass(bytes([0, 0, 33, 1]))
    s = coord._state
    assert s["bypass_factor"] == 33
    assert "summer_mode" not in s


# --- _parse_status (latching feature detection) -------------------------------


def test_parse_status_latches_features_on() -> None:
    coord = make_coordinator()
    data = bytearray(11)
    data[1] = 1  # bypass present
    data[4] = 0x04  # postheating bit
    coord._parse_status(bytes(data))
    assert coord.features[FEATURE_BYPASS] is True
    assert coord.features[FEATURE_POSTHEATING] is True


def test_parse_status_never_clears_detected_feature() -> None:
    coord = make_coordinator()
    coord.features[FEATURE_BYPASS] = True
    coord._parse_status(bytes(11))  # all-zero frame
    assert coord.features[FEATURE_BYPASS] is True


def test_parse_status_tolerates_short_frame() -> None:
    coord = make_coordinator()
    coord._parse_status(bytes([1]))  # preheating bit only; rest of frame missing
    assert coord.features[FEATURE_PREHEATING] is True
    assert coord.features[FEATURE_EWT] is False


# --- write-path validation ----------------------------------------------------


async def test_async_set_level_rejects_out_of_range() -> None:
    coord = make_coordinator()
    fake = FakeTransport()
    coord.transport = cast(ComfoAirTransport, fake)
    with pytest.raises(ValueError):
        await coord.async_set_level(5)
    assert fake.sent == []  # nothing written


async def test_async_set_level_sends_and_refreshes() -> None:
    coord = make_coordinator()
    fake = FakeTransport()
    coord.transport = cast(ComfoAirTransport, fake)
    await coord.async_set_level(2)
    assert fake.sent == [
        (p.CMD_SET_LEVEL, bytes([2])),
        (p.CMD_GET_VENTILATION_LEVEL, b""),
    ]


async def test_async_set_comfort_temperature_rejects_out_of_range() -> None:
    coord = make_coordinator()
    fake = FakeTransport()
    coord.transport = cast(ComfoAirTransport, fake)
    with pytest.raises(ValueError):
        await coord.async_set_comfort_temperature(40.0)
    assert fake.sent == []


async def test_async_set_comfort_temperature_encodes_value() -> None:
    coord = make_coordinator()
    fake = FakeTransport()
    coord.transport = cast(ComfoAirTransport, fake)
    await coord.async_set_comfort_temperature(21.0)
    cmd, data = fake.sent[0]
    assert cmd == p.CMD_SET_COMFORT_TEMPERATURE
    assert data == bytes([p.temp_to_byte(21.0)])


async def test_async_set_fan_percentages_clamps_and_requires_known_values() -> None:
    coord = make_coordinator()
    fake = FakeTransport()
    coord.transport = cast(ComfoAirTransport, fake)
    # A missing value (not in state, not overridden) raises.
    with pytest.raises(ValueError):
        await coord.async_set_fan_percentages(return_air_level_absent=20)

    # With all values present, out-of-range entries clamp to [15, 95].
    coord._state.update(
        {
            "return_air_level_absent": 5,  # clamps up to 15
            "return_air_level_low": 30,
            "return_air_level_medium": 40,
            "supply_air_level_absent": 50,
            "supply_air_level_low": 60,
            "supply_air_level_medium": 70,
            "return_air_level_high": 99,  # clamps down to 95
            "supply_air_level_high": 80,
        }
    )
    await coord.async_set_fan_percentages()
    cmd, data = fake.sent[0]
    assert cmd == p.CMD_SET_VENTILATION_LEVEL
    assert data == bytes([15, 30, 40, 50, 60, 70, 95, 80, 0x00])
