"""Number platform for ComfoAir: per-level return/supply fan percentages."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.components.number import (
    NumberEntity,
    NumberEntityDescription,
    NumberMode,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .coordinator import ComfoAirCoordinator
from .entity import ComfoAirEntity


@dataclass(frozen=True, kw_only=True)
class ComfoAirNumberEntityDescription(NumberEntityDescription):
    pass


_FAN_LEVELS: tuple[tuple[str, str], ...] = (
    ("return_air_level_absent", "Return Air Level Absent"),
    ("return_air_level_low", "Return Air Level Low"),
    ("return_air_level_medium", "Return Air Level Medium"),
    ("return_air_level_high", "Return Air Level High"),
    ("supply_air_level_absent", "Supply Air Level Absent"),
    ("supply_air_level_low", "Supply Air Level Low"),
    ("supply_air_level_medium", "Supply Air Level Medium"),
    ("supply_air_level_high", "Supply Air Level High"),
)

NUMBERS: tuple[ComfoAirNumberEntityDescription, ...] = tuple(
    ComfoAirNumberEntityDescription(
        key=key,
        name=name,
        native_unit_of_measurement=PERCENTAGE,
        native_min_value=15,
        native_max_value=95,
        native_step=1,
        mode=NumberMode.BOX,
        icon="mdi:fan",
    )
    for key, name in _FAN_LEVELS
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(ComfoAirFanLevelNumber(coordinator, desc) for desc in NUMBERS)


class ComfoAirFanLevelNumber(ComfoAirEntity, NumberEntity):
    entity_description: ComfoAirNumberEntityDescription

    def __init__(
        self,
        coordinator: ComfoAirCoordinator,
        description: ComfoAirNumberEntityDescription,
    ) -> None:
        super().__init__(coordinator, description.key)
        self.entity_description = description

    @property
    def native_value(self) -> float | None:
        return self.coordinator.data.get(self._key)

    async def async_set_native_value(self, value: float) -> None:
        await self.coordinator.async_set_fan_percentages(**{self._key: int(value)})
