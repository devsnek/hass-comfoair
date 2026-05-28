"""Constants for the ComfoAir integration."""

from __future__ import annotations

from datetime import timedelta

DOMAIN = "comfoair"

DEFAULT_NAME = "ComfoAir"
DEFAULT_SCAN_INTERVAL = timedelta(seconds=10)

MIN_TEMPERATURE = 12.0
MAX_TEMPERATURE = 29.0

# Fan level values used by CMD_SET_LEVEL and reported by ventilation level
LEVEL_AUTO = 0x00
LEVEL_AWAY = 0x01
LEVEL_LOW = 0x02
LEVEL_MEDIUM = 0x03
LEVEL_HIGH = 0x04

# Feature flags discovered from RES_GET_STATUS
FEATURE_PREHEATING = "preheating_present"
FEATURE_BYPASS = "bypass_present"
FEATURE_FIREPLACE = "fireplace_present"
FEATURE_KITCHEN_HOOD = "kitchen_hood_present"
FEATURE_POSTHEATING = "postheating_present"
FEATURE_ENTHALPY = "enthalpy_present"
FEATURE_EWT = "ewt_present"
