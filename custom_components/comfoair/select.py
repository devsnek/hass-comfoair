from __future__ import annotations

import logging

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, FAN_BALANCE_OPTIONS, RS232_MODES
from .coordinator import ComfoAirCoordinator
from .entity import ComfoAirEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: ComfoAirCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        [ComfoAirFanBalanceSelect(coordinator), ComfoAirRS232ModeSelect(coordinator)]
    )


class ComfoAirFanBalanceSelect(ComfoAirEntity, SelectEntity):
    _attr_icon = "mdi:fan"
    _attr_options = list(FAN_BALANCE_OPTIONS)

    def __init__(self, coordinator: ComfoAirCoordinator) -> None:
        super().__init__(coordinator, "fan_balance")

    @property
    def current_option(self) -> str | None:
        return self.coordinator.fan_balance()

    async def async_select_option(self, option: str) -> None:
        await self.coordinator.async_set_fan_balance(option)


class ComfoAirRS232ModeSelect(ComfoAirEntity, SelectEntity):
    """Control for the PC port mode (0x9B).

    There is no read command for this; the state is only known once the unit
    has echoed a mode back in 0x9C after a set. The unit forgets the mode on
    power loss, so the coordinator stores it and reapplies it.
    """

    _attr_icon = "mdi:serial-port"
    _attr_options = list(RS232_MODES)
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, coordinator: ComfoAirCoordinator) -> None:
        super().__init__(coordinator, "rs232_mode")

    @property
    def current_option(self) -> str | None:
        return self.coordinator.data.get("rs232_mode")

    async def async_select_option(self, option: str) -> None:
        await self.coordinator.async_set_rs232_mode(option)
