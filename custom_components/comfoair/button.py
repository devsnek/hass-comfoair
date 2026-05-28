"""Button platform for ComfoAir: filter reset and error reset."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from homeassistant.components.button import ButtonEntity, ButtonEntityDescription
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .coordinator import ComfoAirCoordinator
from .entity import ComfoAirEntity


@dataclass(frozen=True, kw_only=True)
class ComfoAirButtonEntityDescription(ButtonEntityDescription):
    action: Callable[[ComfoAirCoordinator], Awaitable[None]]


BUTTONS: tuple[ComfoAirButtonEntityDescription, ...] = (
    ComfoAirButtonEntityDescription(
        key="filter_reset",
        name="Filter Reset",
        action=lambda c: c.async_reset_filter(),
    ),
    ComfoAirButtonEntityDescription(
        key="error_reset",
        name="Error Reset",
        action=lambda c: c.async_reset_errors(),
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(ComfoAirButton(coordinator, desc) for desc in BUTTONS)


class ComfoAirButton(ComfoAirEntity, ButtonEntity):
    entity_description: ComfoAirButtonEntityDescription

    def __init__(
        self, coordinator, description: ComfoAirButtonEntityDescription
    ) -> None:
        super().__init__(coordinator, description.key)
        self.entity_description = description

    async def async_press(self) -> None:
        await self.entity_description.action(self.coordinator)
