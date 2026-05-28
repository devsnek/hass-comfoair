"""Config flow for ComfoAir."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import usb
from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_PORT

from . import protocol as p
from .const import DEFAULT_NAME, DOMAIN
from .transport import ComfoAirTransport

_LOGGER = logging.getLogger(__name__)

CONF_MANUAL_PATH = "Enter Manually"


class ComfoAirConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for ComfoAir."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Pick a serial port from the discovered list, or fall through to manual entry."""
        errors: dict[str, str] = {}
        if user_input is not None:
            selection = user_input[CONF_PORT]
            if selection == CONF_MANUAL_PATH:
                return await self.async_step_manual_path()
            err = await self._probe(selection)
            if err is None:
                await self.async_set_unique_id(selection)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title=DEFAULT_NAME, data={CONF_PORT: selection}
                )
            errors["base"] = err

        ports = await usb.async_scan_serial_ports(self.hass)
        options = {
            port.device: (
                f"{port.device} - {port.description or 'n/a'}"
                f", s/n: {port.serial_number or 'n/a'}"
                + (f" - {port.manufacturer}" if port.manufacturer else "")
            )
            for port in ports
        }
        options[CONF_MANUAL_PATH] = CONF_MANUAL_PATH

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({vol.Required(CONF_PORT): vol.In(options)}),
            errors=errors,
        )

    async def async_step_manual_path(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Let the user type a serial device path manually."""
        errors: dict[str, str] = {}
        if user_input is not None:
            port = user_input[CONF_PORT]
            err = await self._probe(port)
            if err is None:
                await self.async_set_unique_id(port)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title=DEFAULT_NAME, data={CONF_PORT: port}
                )
            errors["base"] = err

        return self.async_show_form(
            step_id="manual_path",
            data_schema=vol.Schema({vol.Required(CONF_PORT): str}),
            errors=errors,
        )

    async def _probe(self, port: str) -> str | None:
        """Open the port and verify the device responds. Returns an error key or None."""
        transport = ComfoAirTransport(port=port)
        try:
            await transport.connect()
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("ComfoAir probe: cannot open %s: %s", port, err)
            return "cannot_connect"
        try:
            await transport.request(
                p.CMD_GET_FIRMWARE_VERSION,
                p.RES_GET_FIRMWARE_VERSION,
                timeout=3.0,
            )
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("ComfoAir probe: no response on %s: %s", port, err)
            return "no_response"
        finally:
            await transport.close()
        return None
