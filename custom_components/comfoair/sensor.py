"""Sensor platform for ComfoAir."""

from __future__ import annotations
from typing import Any
from dataclasses import dataclass

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import (
    PERCENTAGE,
    REVOLUTIONS_PER_MINUTE,
    EntityCategory,
    UnitOfElectricPotential,
    UnitOfTemperature,
    UnitOfTime,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    DOMAIN,
    FEATURE_BYPASS,
    FEATURE_ENTHALPY,
    FEATURE_EWT,
    FEATURE_KITCHEN_HOOD,
    FEATURE_POSTHEATING,
    FEATURE_PREHEATING,
)
from .entity import ComfoAirEntity


@dataclass(frozen=True, kw_only=True)
class ComfoAirSensorEntityDescription(SensorEntityDescription):
    feature: str | None = None


_TEMP: Any = dict(
    device_class=SensorDeviceClass.TEMPERATURE,
    native_unit_of_measurement=UnitOfTemperature.CELSIUS,
    state_class=SensorStateClass.MEASUREMENT,
    suggested_display_precision=1,
)
_PCT: Any = dict(
    native_unit_of_measurement=PERCENTAGE,
    state_class=SensorStateClass.MEASUREMENT,
)
_RPM: Any = dict(
    native_unit_of_measurement=REVOLUTIONS_PER_MINUTE,
    state_class=SensorStateClass.MEASUREMENT,
)
_HOURS: Any = dict(
    native_unit_of_measurement=UnitOfTime.HOURS,
    device_class=SensorDeviceClass.DURATION,
    state_class=SensorStateClass.TOTAL_INCREASING,
    entity_category=EntityCategory.DIAGNOSTIC,
)
_MINUTES: Any = dict(
    native_unit_of_measurement=UnitOfTime.MINUTES,
    device_class=SensorDeviceClass.DURATION,
    state_class=SensorStateClass.MEASUREMENT,
    entity_category=EntityCategory.DIAGNOSTIC,
)

SENSORS: tuple[ComfoAirSensorEntityDescription, ...] = (
    # fan
    ComfoAirSensorEntityDescription(key="supply_fan_speed", **_PCT),
    ComfoAirSensorEntityDescription(key="exhaust_fan_speed", **_PCT),
    ComfoAirSensorEntityDescription(key="supply_fan_speed_rpm", **_RPM),
    ComfoAirSensorEntityDescription(key="exhaust_fan_speed_rpm", **_RPM),
    # ventilation level
    ComfoAirSensorEntityDescription(
        key="ventilation_level",
        state_class=SensorStateClass.MEASUREMENT,
    ),
    ComfoAirSensorEntityDescription(key="return_air_level", **_PCT),
    ComfoAirSensorEntityDescription(key="supply_air_level", **_PCT),
    # temperatures
    ComfoAirSensorEntityDescription(key="outside_air_temperature", **_TEMP),
    ComfoAirSensorEntityDescription(key="supply_air_temperature", **_TEMP),
    ComfoAirSensorEntityDescription(key="return_air_temperature", **_TEMP),
    ComfoAirSensorEntityDescription(key="exhaust_air_temperature", **_TEMP),
    # operation hours
    ComfoAirSensorEntityDescription(key="level0_hours", **_HOURS),
    ComfoAirSensorEntityDescription(key="level1_hours", **_HOURS),
    ComfoAirSensorEntityDescription(key="level2_hours", **_HOURS),
    ComfoAirSensorEntityDescription(key="level3_hours", **_HOURS),
    ComfoAirSensorEntityDescription(key="frost_protection_hours", **_HOURS),
    ComfoAirSensorEntityDescription(key="filter_hours", **_HOURS),
    # text / enum-like
    ComfoAirSensorEntityDescription(
        key="filter_status", entity_category=EntityCategory.DIAGNOSTIC
    ),
    ComfoAirSensorEntityDescription(
        key="current_errors", entity_category=EntityCategory.DIAGNOSTIC
    ),
    ComfoAirSensorEntityDescription(
        key="last_errors", entity_category=EntityCategory.DIAGNOSTIC
    ),
    ComfoAirSensorEntityDescription(
        key="second_last_errors", entity_category=EntityCategory.DIAGNOSTIC
    ),
    ComfoAirSensorEntityDescription(
        key="third_last_errors", entity_category=EntityCategory.DIAGNOSTIC
    ),
    # bypass (optional)
    ComfoAirSensorEntityDescription(key="bypass_valve", **_PCT, feature=FEATURE_BYPASS),
    ComfoAirSensorEntityDescription(
        key="bypass_factor",
        feature=FEATURE_BYPASS,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    ComfoAirSensorEntityDescription(
        key="bypass_step",
        feature=FEATURE_BYPASS,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    ComfoAirSensorEntityDescription(
        key="bypass_correction",
        feature=FEATURE_BYPASS,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    ComfoAirSensorEntityDescription(
        key="bypass_open_hours",
        **_HOURS,
        feature=FEATURE_BYPASS,
    ),
    # raw ADC counts (0..255) "Motorstrom (ADC Rohdaten)"
    ComfoAirSensorEntityDescription(
        key="motor_current_bypass",
        state_class=SensorStateClass.MEASUREMENT,
        feature=FEATURE_BYPASS,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    # preheating (optional)
    ComfoAirSensorEntityDescription(
        key="motor_current_preheating",
        state_class=SensorStateClass.MEASUREMENT,
        feature=FEATURE_PREHEATING,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    ComfoAirSensorEntityDescription(
        key="preheating_hours",
        **_HOURS,
        feature=FEATURE_PREHEATING,
    ),
    ComfoAirSensorEntityDescription(
        key="frost_protection_minutes",
        **_MINUTES,
        feature=FEATURE_PREHEATING,
    ),
    ComfoAirSensorEntityDescription(
        key="preheating_valve",
        feature=FEATURE_PREHEATING,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    ComfoAirSensorEntityDescription(
        key="frost_protection_level",
        feature=FEATURE_PREHEATING,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    # enthalpy
    ComfoAirSensorEntityDescription(
        key="enthalpy_mode",
        feature=FEATURE_ENTHALPY,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    ComfoAirSensorEntityDescription(
        key="enthalpy_temperature",
        **_TEMP,
        feature=FEATURE_ENTHALPY,
    ),
    ComfoAirSensorEntityDescription(
        key="enthalpy_humidity",
        device_class=SensorDeviceClass.HUMIDITY,
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        feature=FEATURE_ENTHALPY,
    ),
    ComfoAirSensorEntityDescription(
        key="enthalpy_coefficient",
        **_PCT,
        feature=FEATURE_ENTHALPY,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    ComfoAirSensorEntityDescription(
        key="enthalpy_timer",
        **_MINUTES,
        feature=FEATURE_ENTHALPY,
    ),
    # EWT / post-heating / kitchen hood (optional temps)
    ComfoAirSensorEntityDescription(
        key="ewt_temperature", **_TEMP, feature=FEATURE_EWT
    ),
    ComfoAirSensorEntityDescription(
        key="reheating_temperature",
        **_TEMP,
        feature=FEATURE_POSTHEATING,
    ),
    ComfoAirSensorEntityDescription(
        key="kitchen_hood_temperature",
        **_TEMP,
        feature=FEATURE_KITCHEN_HOOD,
    ),
    # analog 0-10V inputs (0x13)
    ComfoAirSensorEntityDescription(
        key="analog_input_1",
        device_class=SensorDeviceClass.VOLTAGE,
        native_unit_of_measurement=UnitOfElectricPotential.VOLT,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=2,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    ComfoAirSensorEntityDescription(
        key="analog_input_2",
        device_class=SensorDeviceClass.VOLTAGE,
        native_unit_of_measurement=UnitOfElectricPotential.VOLT,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=2,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    ComfoAirSensorEntityDescription(
        key="analog_input_3",
        device_class=SensorDeviceClass.VOLTAGE,
        native_unit_of_measurement=UnitOfElectricPotential.VOLT,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=2,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    ComfoAirSensorEntityDescription(
        key="analog_input_4",
        device_class=SensorDeviceClass.VOLTAGE,
        native_unit_of_measurement=UnitOfElectricPotential.VOLT,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=2,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    # post-heating diagnostics (read-only; the controller drives them)
    ComfoAirSensorEntityDescription(
        key="postheating_power",
        state_class=SensorStateClass.MEASUREMENT,
        feature=FEATURE_POSTHEATING,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
    ComfoAirSensorEntityDescription(
        key="postheating_power_i",
        state_class=SensorStateClass.MEASUREMENT,
        feature=FEATURE_POSTHEATING,
        entity_category=EntityCategory.DIAGNOSTIC,
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator = hass.data[DOMAIN][entry.entry_id]
    entities = [
        ComfoAirSensor(coordinator, desc)
        for desc in SENSORS
        if desc.feature is None or coordinator.features.get(desc.feature)
    ]
    async_add_entities(entities)


class ComfoAirSensor(ComfoAirEntity, SensorEntity):
    entity_description: ComfoAirSensorEntityDescription

    def __init__(
        self, coordinator, description: ComfoAirSensorEntityDescription
    ) -> None:
        super().__init__(coordinator, description.key)
        self.entity_description = description

    @property
    def native_value(self):
        return self.coordinator.data.get(self._key)
