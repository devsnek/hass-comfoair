"""Number platform for ComfoAir: fan percentages, time delays, EWT/post-heat."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Any

from homeassistant.components.number import (
    NumberEntity,
    NumberEntityDescription,
    NumberMode,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, UnitOfTemperature, UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    DOMAIN,
    FEATURE_EWT,
    FEATURE_KITCHEN_HOOD,
    FEATURE_POSTHEATING,
    MAX_TEMPERATURE,
    MIN_TEMPERATURE,
)
from .coordinator import ComfoAirCoordinator
from .entity import ComfoAirEntity


@dataclass(frozen=True, kw_only=True)
class ComfoAirNumberEntityDescription(NumberEntityDescription):
    feature: str | None = None
    setter: str = "async_set_fan_percentages"


_FAN_LEVELS: tuple[str, ...] = (
    "return_air_level_absent",
    "return_air_level_low",
    "return_air_level_medium",
    "return_air_level_high",
    "supply_air_level_absent",
    "supply_air_level_low",
    "supply_air_level_medium",
    "supply_air_level_high",
)

_FAN_NUMBERS: tuple[ComfoAirNumberEntityDescription, ...] = tuple(
    ComfoAirNumberEntityDescription(
        key=key,
        native_unit_of_measurement=PERCENTAGE,
        native_min_value=15,
        native_max_value=95,
        native_step=1,
        mode=NumberMode.BOX,
        icon="mdi:fan",
    )
    for key in _FAN_LEVELS
)

_MIN: Any = dict(
    native_unit_of_measurement=UnitOfTime.MINUTES,
    native_step=1,
    mode=NumberMode.BOX,
)

_TIME_DELAY_NUMBERS: tuple[ComfoAirNumberEntityDescription, ...] = (
    ComfoAirNumberEntityDescription(
        key="bathroom_switch_on_delay_minutes",
        native_min_value=0,
        native_max_value=15,
        setter="async_set_time_delays",
        **_MIN,
    ),
    ComfoAirNumberEntityDescription(
        key="bathroom_switch_off_delay_minutes",
        native_min_value=0,
        native_max_value=120,
        setter="async_set_time_delays",
        **_MIN,
    ),
    ComfoAirNumberEntityDescription(
        key="l1_switch_off_delay_minutes",
        native_min_value=0,
        native_max_value=120,
        setter="async_set_time_delays",
        **_MIN,
    ),
    ComfoAirNumberEntityDescription(
        key="boost_ventilation_minutes",
        native_min_value=0,
        native_max_value=60,
        setter="async_set_time_delays",
        **_MIN,
    ),
    ComfoAirNumberEntityDescription(
        key="filter_warning_weeks",
        native_unit_of_measurement="weeks",
        native_min_value=1,
        native_max_value=52,
        native_step=1,
        mode=NumberMode.BOX,
        setter="async_set_time_delays",
    ),
    ComfoAirNumberEntityDescription(
        key="rf_high_time_short_minutes",
        native_min_value=0,
        native_max_value=60,
        setter="async_set_time_delays",
        **_MIN,
    ),
    ComfoAirNumberEntityDescription(
        key="rf_high_time_long_minutes",
        native_min_value=0,
        native_max_value=120,
        setter="async_set_time_delays",
        **_MIN,
    ),
    ComfoAirNumberEntityDescription(
        key="extractor_hood_switch_off_delay_minutes",
        native_min_value=0,
        native_max_value=120,
        setter="async_set_time_delays",
        feature=FEATURE_KITCHEN_HOOD,
        **_MIN,
    ),
)

_EWT_POSTHEAT_NUMBERS: tuple[ComfoAirNumberEntityDescription, ...] = (
    ComfoAirNumberEntityDescription(
        key="ewt_low_temperature",
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        native_min_value=-20,
        native_max_value=40,
        native_step=0.5,
        mode=NumberMode.BOX,
        setter="async_set_ewt_postheating",
        feature=FEATURE_EWT,
    ),
    ComfoAirNumberEntityDescription(
        key="ewt_high_temperature",
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        native_min_value=-20,
        native_max_value=40,
        native_step=0.5,
        mode=NumberMode.BOX,
        setter="async_set_ewt_postheating",
        feature=FEATURE_EWT,
    ),
    ComfoAirNumberEntityDescription(
        key="ewt_speed_up",
        native_unit_of_measurement=PERCENTAGE,
        native_min_value=0,
        native_max_value=100,
        native_step=1,
        mode=NumberMode.BOX,
        setter="async_set_ewt_postheating",
        feature=FEATURE_EWT,
    ),
    ComfoAirNumberEntityDescription(
        key="kitchen_hood_speed_up",
        native_unit_of_measurement=PERCENTAGE,
        native_min_value=0,
        native_max_value=100,
        native_step=1,
        mode=NumberMode.BOX,
        setter="async_set_ewt_postheating",
        feature=FEATURE_KITCHEN_HOOD,
    ),
    ComfoAirNumberEntityDescription(
        key="postheating_target_temperature",
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        native_min_value=MIN_TEMPERATURE,
        native_max_value=MAX_TEMPERATURE,
        native_step=0.5,
        mode=NumberMode.BOX,
        setter="async_set_ewt_postheating",
        feature=FEATURE_POSTHEATING,
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: ComfoAirCoordinator = hass.data[DOMAIN][entry.entry_id]
    descs = (*_FAN_NUMBERS, *_TIME_DELAY_NUMBERS, *_EWT_POSTHEAT_NUMBERS)
    async_add_entities(
        ComfoAirNumber(coordinator, desc)
        for desc in descs
        if desc.feature is None or coordinator.features.get(desc.feature)
    )


class ComfoAirNumber(ComfoAirEntity, NumberEntity):
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
        setter: Callable = getattr(self.coordinator, self.entity_description.setter)
        await setter(**{self._key: value})
