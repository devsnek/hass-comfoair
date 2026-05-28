"""Base entity for the ComfoAir integration."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import ComfoAirCoordinator


class ComfoAirEntity(CoordinatorEntity[ComfoAirCoordinator]):
    """Entity tied to the shared ComfoAir coordinator."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: ComfoAirCoordinator, key: str) -> None:
        super().__init__(coordinator)
        self._key = key
        self._attr_unique_id = f"{coordinator.entry.entry_id}_{key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, coordinator.entry.entry_id)},
            name=coordinator.device_name,
            manufacturer="Zehnder",
            model=coordinator.firmware_name,
            sw_version=coordinator.firmware_version,
        )
