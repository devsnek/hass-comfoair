"""Climate platform: exposes fan mode and comfort temperature."""

from __future__ import annotations

from typing import Any

from homeassistant.components.climate import (
    ClimateEntity,
    ClimateEntityFeature,
    HVACMode,
)
from homeassistant.components.climate.const import (
    FAN_AUTO,
    FAN_HIGH,
    FAN_LOW,
    FAN_MEDIUM,
    FAN_OFF,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_TEMPERATURE, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    DOMAIN,
    LEVEL_AWAY,
    LEVEL_HIGH,
    LEVEL_LOW,
    LEVEL_MEDIUM,
    LEVEL_AUTO,
    MAX_TEMPERATURE,
    MIN_TEMPERATURE,
)
from .entity import ComfoAirEntity

_FAN_TO_LEVEL = {
    FAN_OFF: LEVEL_AWAY,
    FAN_LOW: LEVEL_LOW,
    FAN_MEDIUM: LEVEL_MEDIUM,
    FAN_HIGH: LEVEL_HIGH,
    FAN_AUTO: LEVEL_AUTO,
}

_LEVEL_TO_FAN = {
    LEVEL_AWAY: FAN_OFF,
    LEVEL_LOW: FAN_LOW,
    LEVEL_MEDIUM: FAN_MEDIUM,
    LEVEL_HIGH: FAN_HIGH,
    LEVEL_AUTO: FAN_AUTO,
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([ComfoAirClimate(coordinator)])


class ComfoAirClimate(ComfoAirEntity, ClimateEntity):
    """ClimateEntity for ComfoAir fan modes and comfort temperature."""

    _attr_translation_key = "comfoair"
    _attr_name = None  # use device name
    _attr_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_min_temp = MIN_TEMPERATURE
    _attr_max_temp = MAX_TEMPERATURE
    _attr_target_temperature_step = 1
    _attr_hvac_modes = [HVACMode.FAN_ONLY, HVACMode.OFF]
    _attr_fan_modes = [FAN_OFF, FAN_LOW, FAN_MEDIUM, FAN_HIGH, FAN_AUTO]
    _attr_supported_features = (
        ClimateEntityFeature.TARGET_TEMPERATURE | ClimateEntityFeature.FAN_MODE
    )

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator, "climate")

    @property
    def hvac_mode(self) -> HVACMode:
        raw = self.coordinator.data.get("current_level_raw")
        if raw == 0x01:
            return HVACMode.OFF
        return HVACMode.FAN_ONLY

    @property
    def fan_mode(self) -> str | None:
        raw = self.coordinator.data.get("current_level_raw")
        if raw is None:
            return None
        return _LEVEL_TO_FAN.get(raw)

    @property
    def current_temperature(self) -> float | None:
        return self.coordinator.data.get("current_temperature")

    @property
    def target_temperature(self) -> float | None:
        return self.coordinator.data.get("target_temperature")

    async def async_set_fan_mode(self, fan_mode: str) -> None:
        level = _FAN_TO_LEVEL.get(fan_mode)
        if level is None:
            return
        await self.coordinator.async_set_level(level)

    async def async_set_temperature(self, **kwargs: Any) -> None:
        temp = kwargs.get(ATTR_TEMPERATURE)
        if temp is None:
            return
        await self.coordinator.async_set_comfort_temperature(float(temp))

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        if hvac_mode == HVACMode.OFF:
            await self.coordinator.async_set_level(LEVEL_AWAY)
        elif hvac_mode == HVACMode.FAN_ONLY:
            await self.coordinator.async_set_level(LEVEL_LOW)
