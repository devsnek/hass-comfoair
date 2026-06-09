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


# --- _parse_cc_ease_display (0x3C) --------------------------------------------


def test_parse_cc_ease_display_decodes_text_weekday_and_colon() -> None:
    coord = make_coordinator()
    data = bytes(
        [
            0x04 | 0x80,  # d[0]: weekday Monday (bit 2) + colon (bit 7)
            0x06,  # d[1]: leading digit "1", no symbol bits
            0x5B,  # d[2]: "2"
            0x4F,  # d[3]: "3"
            0x66,  # d[4]: "4"
            0x6D,  # d[5]: "5"
            0x7D,  # d[6]: "6"
            0x07,  # d[7]: "7"
            0x00,  # d[8]: " ", dot bit clear
            0x00,  # d[9]: no flags
        ]
    )
    coord._parse_cc_ease_display(data)
    s = coord._state
    assert s["cc_ease_weekday"] == "Monday"
    assert s["cc_ease_colon"] is True
    assert s["cc_ease_text"] == "1234567 "
    assert s["cc_ease_dot"] is False
    # No symbol bits anywhere -> every symbol/bar is off.
    assert all(v is False for k, v in s.items() if k.startswith("cc_ease_symbol_"))
    assert s["cc_ease_bar_1"] is False


def test_parse_cc_ease_display_decodes_all_symbol_bits() -> None:
    coord = make_coordinator()
    data = bytes(
        [
            0x80,  # d[0]: colon only, no weekday bit set
            0x06
            | 0x08
            | 0x10
            | 0x20
            | 0x40
            | 0x80,  # leading "1" + auto/manual/filter/supply/exhaust
            0x80,  # d[2]: fan symbol (segment " ")
            0x80,  # d[3]: kitchen hood
            0x80,  # d[4]: preheating
            0x80,  # d[5]: frost
            0x80,  # d[6]: ewt
            0x80,  # d[7]: postheating
            0x80,  # d[8]: dot (segment " ")
            0xFF,  # d[9]: degree, bypass, bars 1-3, house, supply_air, exhaust_air
        ]
    )
    coord._parse_cc_ease_display(data)
    s = coord._state
    assert s["cc_ease_weekday"] is None  # no weekday bit set
    assert s["cc_ease_colon"] is True
    assert s["cc_ease_text"] == "1       "
    assert s["cc_ease_dot"] is True
    assert s["cc_ease_symbol_auto"] is True
    assert s["cc_ease_symbol_manual"] is True
    assert s["cc_ease_symbol_filter"] is True
    assert s["cc_ease_symbol_supply"] is True
    assert s["cc_ease_symbol_exhaust"] is True
    assert s["cc_ease_symbol_fan"] is True
    assert s["cc_ease_symbol_kitchen_hood"] is True
    assert s["cc_ease_symbol_preheating"] is True
    assert s["cc_ease_symbol_frost"] is True
    assert s["cc_ease_symbol_ewt"] is True
    assert s["cc_ease_symbol_postheating"] is True
    assert s["cc_ease_symbol_degree"] is True
    assert s["cc_ease_symbol_bypass"] is True
    assert s["cc_ease_bar_1"] is True
    assert s["cc_ease_bar_2"] is True
    assert s["cc_ease_bar_3"] is True
    assert s["cc_ease_symbol_house"] is True
    assert s["cc_ease_symbol_supply_air"] is True
    assert s["cc_ease_symbol_exhaust_air"] is True


def test_parse_cc_ease_display_unknown_segments_fall_back_to_question_mark() -> None:
    coord = make_coordinator()
    data = bytes(
        [
            0x00,  # no weekday, no colon
            0x01,  # leading digit 0x01 not in lookup -> "?"
            0x01,  # d[2]: 0x01 not a valid seven-segment -> "?"
            0x3F,  # "0"
            0x00,  # " "
            0x00,  # " "
            0x00,  # " "
            0x00,  # " "
            0x00,  # " "
            0x00,
        ]
    )
    coord._parse_cc_ease_display(data)
    assert coord._state["cc_ease_text"] == "??0     "


def test_parse_cc_ease_display_short_frame_is_ignored() -> None:
    coord = make_coordinator()
    coord._parse_cc_ease_display(bytes(9))  # needs >= 10 bytes
    assert coord._state == {}


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


# --- fan balance --------------------------------------------------------------


def _seed_balanced(coord: ComfoAirCoordinator) -> None:
    coord._fan_baseline = {
        "return_air_level_absent": 15,
        "return_air_level_low": 30,
        "return_air_level_medium": 50,
        "return_air_level_high": 70,
        "supply_air_level_absent": 15,
        "supply_air_level_low": 30,
        "supply_air_level_medium": 50,
        "supply_air_level_high": 70,
    }


async def test_async_set_fan_balance_balanced_restores_both_sides() -> None:
    coord = make_coordinator()
    _seed_balanced(coord)
    fake = FakeTransport()
    coord.transport = cast(ComfoAirTransport, fake)
    await coord.async_set_fan_balance("balanced")
    cmd, data = fake.sent[0]
    assert cmd == p.CMD_SET_VENTILATION_LEVEL
    # order: exhaust a/l/m, supply a/l/m, exhaust high, supply high, trailing 0
    assert data == bytes([15, 30, 50, 15, 30, 50, 70, 70, 0x00])


async def test_async_set_fan_balance_supply_only_zeroes_exhaust() -> None:
    coord = make_coordinator()
    _seed_balanced(coord)
    fake = FakeTransport()
    coord.transport = cast(ComfoAirTransport, fake)
    await coord.async_set_fan_balance("supply_only")
    _cmd, data = fake.sent[0]
    assert data == bytes([0, 0, 0, 15, 30, 50, 0, 70, 0x00])


async def test_async_set_fan_balance_exhaust_only_zeroes_supply() -> None:
    coord = make_coordinator()
    _seed_balanced(coord)
    fake = FakeTransport()
    coord.transport = cast(ComfoAirTransport, fake)
    await coord.async_set_fan_balance("exhaust_only")
    _cmd, data = fake.sent[0]
    assert data == bytes([15, 30, 50, 0, 0, 0, 70, 0, 0x00])


async def test_async_set_fan_balance_invalid_mode_raises() -> None:
    coord = make_coordinator()
    coord._fan_baseline = {}
    with pytest.raises(ValueError):
        await coord.async_set_fan_balance("nonsense")


def test_fan_balance_property() -> None:
    coord = make_coordinator()
    # balanced: both sides non-zero
    coord._state.update(
        {
            "return_air_level_low": 30, "return_air_level_medium": 50, "return_air_level_high": 70,
            "supply_air_level_low": 30, "supply_air_level_medium": 50, "supply_air_level_high": 70,
        }
    )
    assert coord.fan_balance == "balanced"
    # supply off -> exhaust only
    coord._state.update(
        {"supply_air_level_low": 0, "supply_air_level_medium": 0, "supply_air_level_high": 0}
    )
    assert coord.fan_balance == "exhaust_only"
    # exhaust off too would be both off; restore supply, zero exhaust -> supply only
    coord._state.update(
        {
            "supply_air_level_low": 30, "supply_air_level_medium": 50, "supply_air_level_high": 70,
            "return_air_level_low": 0, "return_air_level_medium": 0, "return_air_level_high": 0,
        }
    )
    assert coord.fan_balance == "supply_only"


def test_parse_level_updates_fan_baseline() -> None:
    coord = make_coordinator()
    coord._fan_baseline = {}
    data = bytes([15, 30, 50, 15, 30, 50, 30, 30, 2, 1, 70, 70])
    coord._parse_level(data)
    assert coord._fan_baseline["supply_air_level_high"] == 70
    assert coord._fan_baseline["return_air_level_low"] == 30
