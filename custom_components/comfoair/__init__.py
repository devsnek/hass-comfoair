"""ComfoAir ventilation integration."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_PORT, Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady

from .const import DEFAULT_NAME, DOMAIN
from .coordinator import ComfoAirCoordinator
from .transport import ComfoAirTransport

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [
    Platform.CLIMATE,
    Platform.SENSOR,
    Platform.BINARY_SENSOR,
    Platform.BUTTON,
]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up ComfoAir from a config entry."""
    port = entry.data[CONF_PORT]
    name = entry.title or DEFAULT_NAME

    _LOGGER.info("Setting up ComfoAir entry %s on %s", name, port)

    transport = ComfoAirTransport(port=port)
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
        await transport.close()
        raise ConfigEntryNotReady(f"probe failed: {err}") from err

    _LOGGER.info(
        "ComfoAir probe ok: firmware=%s version=%s features=%s",
        coordinator.firmware_name,
        coordinator.firmware_version,
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
        await coordinator.transport.close()
    return unloaded
