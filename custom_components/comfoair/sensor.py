"""Sensor platform for ComfoAir."""

from __future__ import annotations

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
    UnitOfElectricCurrent,
    UnitOfTemperature,
    UnitOfTime,
    UnitOfVolume,
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


_TEMP = dict(
    device_class=SensorDeviceClass.TEMPERATURE,
    native_unit_of_measurement=UnitOfTemperature.CELSIUS,
    state_class=SensorStateClass.MEASUREMENT,
    suggested_display_precision=1,
)
_PCT = dict(
    native_unit_of_measurement=PERCENTAGE,
    state_class=SensorStateClass.MEASUREMENT,
)
_RPM = dict(
    native_unit_of_measurement=REVOLUTIONS_PER_MINUTE,
    state_class=SensorStateClass.MEASUREMENT,
)
_HOURS = dict(
    native_unit_of_measurement=UnitOfTime.HOURS,
    device_class=SensorDeviceClass.DURATION,
    state_class=SensorStateClass.TOTAL_INCREASING,
)
_MINUTES = dict(
    native_unit_of_measurement=UnitOfTime.MINUTES,
    device_class=SensorDeviceClass.DURATION,
    state_class=SensorStateClass.MEASUREMENT,
)

SENSORS: tuple[ComfoAirSensorEntityDescription, ...] = (
    # fan
    ComfoAirSensorEntityDescription(
        key="intake_fan_speed", name="Intake Fan Speed", **_PCT
    ),
    ComfoAirSensorEntityDescription(
        key="exhaust_fan_speed", name="Exhaust Fan Speed", **_PCT
    ),
    ComfoAirSensorEntityDescription(
        key="intake_fan_speed_rpm", name="Intake Fan Speed RPM", **_RPM
    ),
    ComfoAirSensorEntityDescription(
        key="exhaust_fan_speed_rpm", name="Exhaust Fan Speed RPM", **_RPM
    ),
    # ventilation level
    ComfoAirSensorEntityDescription(
        key="ventilation_level",
        name="Ventilation Level",
        state_class=SensorStateClass.MEASUREMENT,
    ),
    ComfoAirSensorEntityDescription(
        key="return_air_level",
        name="Return Air Level",
        native_unit_of_measurement=UnitOfVolume.CUBIC_METERS,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
    ),
    ComfoAirSensorEntityDescription(
        key="supply_air_level",
        name="Supply Air Level",
        native_unit_of_measurement=UnitOfVolume.CUBIC_METERS,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
    ),
    # temperatures
    ComfoAirSensorEntityDescription(
        key="outside_air_temperature", name="Outside Air Temperature", **_TEMP
    ),
    ComfoAirSensorEntityDescription(
        key="supply_air_temperature", name="Supply Air Temperature", **_TEMP
    ),
    ComfoAirSensorEntityDescription(
        key="return_air_temperature", name="Return Air Temperature", **_TEMP
    ),
    ComfoAirSensorEntityDescription(
        key="exhaust_air_temperature", name="Exhaust Air Temperature", **_TEMP
    ),
    # operation hours
    ComfoAirSensorEntityDescription(key="level0_hours", name="Level 0 Hours", **_HOURS),
    ComfoAirSensorEntityDescription(key="level1_hours", name="Level 1 Hours", **_HOURS),
    ComfoAirSensorEntityDescription(key="level2_hours", name="Level 2 Hours", **_HOURS),
    ComfoAirSensorEntityDescription(key="level3_hours", name="Level 3 Hours", **_HOURS),
    ComfoAirSensorEntityDescription(
        key="frost_protection_hours", name="Frost Protection Hours", **_HOURS
    ),
    ComfoAirSensorEntityDescription(key="filter_hours", name="Filter Hours", **_HOURS),
    # time delays
    ComfoAirSensorEntityDescription(
        key="bathroom_switch_on_delay_minutes",
        name="Bathroom Switch On Delay",
        **_MINUTES,
    ),
    ComfoAirSensorEntityDescription(
        key="bathroom_switch_off_delay_minutes",
        name="Bathroom Switch Off Delay",
        **_MINUTES,
    ),
    ComfoAirSensorEntityDescription(
        key="l1_switch_off_delay_minutes", name="L1 Switch Off Delay", **_MINUTES
    ),
    ComfoAirSensorEntityDescription(
        key="boost_ventilation_minutes", name="Boost Ventilation", **_MINUTES
    ),
    ComfoAirSensorEntityDescription(
        key="filter_warning_weeks",
        name="Filter Warning Weeks",
        native_unit_of_measurement="weeks",
        state_class=SensorStateClass.MEASUREMENT,
    ),
    ComfoAirSensorEntityDescription(
        key="rf_high_time_short_minutes", name="RF High Time Short", **_MINUTES
    ),
    ComfoAirSensorEntityDescription(
        key="rf_high_time_long_minutes", name="RF High Time Long", **_MINUTES
    ),
    # text / enum-like
    ComfoAirSensorEntityDescription(key="filter_status", name="Filter Status"),
    # bypass (optional)
    ComfoAirSensorEntityDescription(
        key="bypass_valve", name="Bypass Valve", **_PCT, feature=FEATURE_BYPASS
    ),
    ComfoAirSensorEntityDescription(
        key="bypass_factor", name="Bypass Factor", feature=FEATURE_BYPASS
    ),
    ComfoAirSensorEntityDescription(
        key="bypass_step", name="Bypass Step", feature=FEATURE_BYPASS
    ),
    ComfoAirSensorEntityDescription(
        key="bypass_correction", name="Bypass Correction", feature=FEATURE_BYPASS
    ),
    ComfoAirSensorEntityDescription(
        key="bypass_open_hours",
        name="Bypass Open Hours",
        **_HOURS,
        feature=FEATURE_BYPASS,
    ),
    ComfoAirSensorEntityDescription(
        key="motor_current_bypass",
        name="Motor Current Bypass",
        device_class=SensorDeviceClass.CURRENT,
        native_unit_of_measurement=UnitOfElectricCurrent.AMPERE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        feature=FEATURE_BYPASS,
    ),
    # preheating (optional)
    ComfoAirSensorEntityDescription(
        key="motor_current_preheating",
        name="Motor Current Preheating",
        device_class=SensorDeviceClass.CURRENT,
        native_unit_of_measurement=UnitOfElectricCurrent.AMPERE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        feature=FEATURE_PREHEATING,
    ),
    ComfoAirSensorEntityDescription(
        key="preheating_hours",
        name="Preheating Hours",
        **_HOURS,
        feature=FEATURE_PREHEATING,
    ),
    ComfoAirSensorEntityDescription(
        key="frost_protection_minutes",
        name="Frost Protection Minutes",
        **_MINUTES,
        feature=FEATURE_PREHEATING,
    ),
    ComfoAirSensorEntityDescription(
        key="preheating_valve", name="Preheating Valve", feature=FEATURE_PREHEATING
    ),
    ComfoAirSensorEntityDescription(
        key="frost_protection_level",
        name="Frost Protection Level",
        feature=FEATURE_PREHEATING,
    ),
    # enthalpy / EWT / post-heating / kitchen hood (optional temps)
    ComfoAirSensorEntityDescription(
        key="enthalpy_temperature",
        name="Enthalpy Temperature",
        **_TEMP,
        feature=FEATURE_ENTHALPY,
    ),
    ComfoAirSensorEntityDescription(
        key="ewt_temperature", name="EWT Temperature", **_TEMP, feature=FEATURE_EWT
    ),
    ComfoAirSensorEntityDescription(
        key="reheating_temperature",
        name="Reheating Temperature",
        **_TEMP,
        feature=FEATURE_POSTHEATING,
    ),
    ComfoAirSensorEntityDescription(
        key="kitchen_hood_temperature",
        name="Kitchen Hood Temperature",
        **_TEMP,
        feature=FEATURE_KITCHEN_HOOD,
    ),
    ComfoAirSensorEntityDescription(
        key="extractor_hood_switch_off_delay_minutes",
        name="Extractor Hood Switch Off Delay",
        **_MINUTES,
        feature=FEATURE_KITCHEN_HOOD,
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
