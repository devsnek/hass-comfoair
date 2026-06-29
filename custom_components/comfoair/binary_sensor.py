"""Binary sensor platform for ComfoAir."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.components.binary_sensor import (
    BinarySensorEntity,
    BinarySensorEntityDescription,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    DOMAIN,
    FEATURE_BYPASS,
    FEATURE_KITCHEN_HOOD,
    FEATURE_PREHEATING,
)
from .entity import ComfoAirEntity


@dataclass(frozen=True, kw_only=True)
class ComfoAirBinarySensorEntityDescription(BinarySensorEntityDescription):
    feature: str | None = None


SENSORS: tuple[ComfoAirBinarySensorEntityDescription, ...] = (
    ComfoAirBinarySensorEntityDescription(key="supply_fan_active"),
    ComfoAirBinarySensorEntityDescription(
        key="frost_protection_active",
        feature=FEATURE_PREHEATING,
    ),
    ComfoAirBinarySensorEntityDescription(key="summer_mode", feature=FEATURE_BYPASS),
    ComfoAirBinarySensorEntityDescription(
        key="bypass_valve_open", feature=FEATURE_BYPASS
    ),
    ComfoAirBinarySensorEntityDescription(
        key="preheating_state",
        feature=FEATURE_PREHEATING,
    ),
    # physical switch inputs (0x03 Eingänge)
    ComfoAirBinarySensorEntityDescription(
        key="step_switch_l1", entity_category=EntityCategory.DIAGNOSTIC
    ),
    ComfoAirBinarySensorEntityDescription(
        key="step_switch_l2", entity_category=EntityCategory.DIAGNOSTIC
    ),
    ComfoAirBinarySensorEntityDescription(
        key="bathroom_switch", entity_category=EntityCategory.DIAGNOSTIC
    ),
    ComfoAirBinarySensorEntityDescription(
        key="bathroom_switch_2", entity_category=EntityCategory.DIAGNOSTIC
    ),
    ComfoAirBinarySensorEntityDescription(
        key="external_filter_switch", entity_category=EntityCategory.DIAGNOSTIC
    ),
    ComfoAirBinarySensorEntityDescription(
        key="heat_recovery_switch", entity_category=EntityCategory.DIAGNOSTIC
    ),
    ComfoAirBinarySensorEntityDescription(
        key="kitchen_hood_switch",
        feature=FEATURE_KITCHEN_HOOD,
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
        ComfoAirBinarySensor(coordinator, desc)
        for desc in SENSORS
        if desc.feature is None or coordinator.features.get(desc.feature)
    ]
    async_add_entities(entities)


class ComfoAirBinarySensor(ComfoAirEntity, BinarySensorEntity):
    entity_description: ComfoAirBinarySensorEntityDescription

    def __init__(
        self, coordinator, description: ComfoAirBinarySensorEntityDescription
    ) -> None:
        super().__init__(coordinator, description.key)
        self.entity_description = description

    @property
    def is_on(self) -> bool | None:
        return self.coordinator.data.get(self._key)
