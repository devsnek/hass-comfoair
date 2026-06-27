"""Select platform for ComfoAir: fan balance (supply / exhaust / both)."""

from __future__ import annotations

import logging

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, FAN_BALANCE_OPTIONS
from .coordinator import ComfoAirCoordinator
from .entity import ComfoAirEntity

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: ComfoAirCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([ComfoAirFanBalanceSelect(coordinator)])


class ComfoAirFanBalanceSelect(ComfoAirEntity, SelectEntity):
    """Select balanced / supply-only / exhaust-only ventilation.

    The current mode is read from the CC-Ease LCD display symbols (0x3C frame)
    so the machine — not Home Assistant — is the source of truth.  The write
    path uses CMD_SET_VENTILATION_LEVEL to zero one fan's per-level percentages;
    the next CC-Ease display frame then confirms the new state.

    See ComfoAirCoordinator.async_set_fan_balance for the ~15 % minimum caveat.
    """

    _attr_icon = "mdi:fan"
    _attr_options = list(FAN_BALANCE_OPTIONS)

    def __init__(self, coordinator: ComfoAirCoordinator) -> None:
        super().__init__(coordinator, "fan_balance")

    @property
    def current_option(self) -> str | None:
        return self.coordinator.fan_balance

    async def async_select_option(self, option: str) -> None:
        if option not in FAN_BALANCE_OPTIONS:
            _LOGGER.error("Invalid fan balance option: %s", option)
            return
        await self.coordinator.async_set_fan_balance(option)
