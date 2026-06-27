"""ComfoAir ventilation integration."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_PORT, Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import entity_registry as er

from .const import DEFAULT_NAME, DOMAIN
from .coordinator import ComfoAirCoordinator
from .transport import ComfoAirTransport

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [
    Platform.CLIMATE,
    Platform.SENSOR,
    Platform.BINARY_SENSOR,
    Platform.BUTTON,
    Platform.NUMBER,
    Platform.SELECT,
]

CARD_URL = "/comfoair/comfoair-card.js"
_CARD_REGISTERED_KEY = "comfoair_card_registered"


async def _async_register_card(hass: HomeAssistant) -> None:
    """Serve the bundled Lovelace card and load it in the frontend.

    The card ships inside the integration, so installing the integration
    (e.g. via HACS) is all that is needed — no manual copy to /config/www
    and no Lovelace resource registration.
    """
    if hass.data.get(_CARD_REGISTERED_KEY):
        return
    hass.data[_CARD_REGISTERED_KEY] = True
    card_path = Path(__file__).parent / "www" / "comfoair-card.js"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(CARD_URL, str(card_path), cache_headers=False)]
    )
    add_extra_js_url(hass, CARD_URL)


_UNIQUE_ID_MIGRATIONS = {
    # Renamed for supply/return/outside/exhaust terminology ("intake" fan is supply fan).
    "intake_fan_speed": "supply_fan_speed",
    "intake_fan_speed_rpm": "supply_fan_speed_rpm",
    # The "Abluft" fan is the Return-port fan, not exhaust (Fortluft).
    "exhaust_fan_speed": "return_fan_speed",
    "exhaust_fan_speed_rpm": "return_fan_speed_rpm",
}


def _migrate_unique_ids(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Rename entity-registry unique IDs for keys that have been renamed."""
    registry = er.async_get(hass)
    prefix = f"{entry.entry_id}_"
    for old_suffix, new_suffix in _UNIQUE_ID_MIGRATIONS.items():
        old_unique_id = f"{prefix}{old_suffix}"
        new_unique_id = f"{prefix}{new_suffix}"
        entity_id = registry.async_get_entity_id(Platform.SENSOR, DOMAIN, old_unique_id)
        if entity_id is None:
            continue
        if registry.async_get_entity_id(Platform.SENSOR, DOMAIN, new_unique_id):
            # New entity already exists; drop the stale one to avoid a clash.
            _LOGGER.debug("Removing stale entity %s during migration", entity_id)
            registry.async_remove(entity_id)
            continue
        _LOGGER.info("Migrating unique_id %s -> %s", old_unique_id, new_unique_id)
        registry.async_update_entity(entity_id, new_unique_id=new_unique_id)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up ComfoAir from a config entry."""
    port = entry.data[CONF_PORT]
    name = entry.title or DEFAULT_NAME

    _LOGGER.info("Setting up ComfoAir entry %s on %s", name, port)

    await _async_register_card(hass)

    _migrate_unique_ids(hass, entry)

    transport = ComfoAirTransport(port=port, hass=hass)
    coordinator = ComfoAirCoordinator(hass, entry, transport, device_name=name)

    try:
        await transport.connect()
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning("ComfoAir transport.connect to %s failed: %r", port, err)
        raise ConfigEntryNotReady(f"cannot open {port}: {err}") from err

    try:
        await coordinator.async_probe()
    except Exception as err:  # noqa: BLE001
        _LOGGER.warning("ComfoAir probe on %s failed: %r", port, err)
        await transport.disconnect()
        raise ConfigEntryNotReady(f"probe failed: {err}") from err

    _LOGGER.info(
        "ComfoAir probe ok:\n"
        "  Bootloader %s v%s\n"
        "  Firmware %s v%s\n"
        "  Connector Board %s v%s\n"
        "  CC-Ease v%s\n"
        "  CC-Luxe v%s\n"
        "  features=%s",
        coordinator.bootloader_name,
        coordinator.bootloader_version,
        coordinator.firmware_name,
        coordinator.firmware_version,
        coordinator.connector_board_name,
        coordinator.connector_board_version,
        coordinator.cc_ease_version,
        coordinator.cc_luxe_version,
        {k: v for k, v in coordinator.features.items() if v},
    )

    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    coordinator: ComfoAirCoordinator | None = hass.data.get(DOMAIN, {}).pop(
        entry.entry_id, None
    )
    if coordinator is not None:
        await coordinator.transport.disconnect()
    return unloaded
