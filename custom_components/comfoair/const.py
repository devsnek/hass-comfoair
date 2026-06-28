"""Constants for the ComfoAir integration."""

from __future__ import annotations

DOMAIN = "comfoair"

DEFAULT_NAME = "ComfoAir"

MIN_TEMPERATURE = 12.0
MAX_TEMPERATURE = 29.0

# Fan level values used by CMD_SET_LEVEL and reported by ventilation level
LEVEL_AUTO = 0x00
LEVEL_AWAY = 0x01
LEVEL_LOW = 0x02
LEVEL_MEDIUM = 0x03
LEVEL_HIGH = 0x04

# Feature flags discovered from RES_GET_STATUS
FEATURE_PREHEATING = "preheating"
FEATURE_BYPASS = "bypass"
FEATURE_FIREPLACE = "fireplace"
FEATURE_KITCHEN_HOOD = "kitchen_hood"
FEATURE_POSTHEATING = "postheating"
FEATURE_ENTHALPY = "enthalpy"
FEATURE_EWT = "ewt"

FAN_BALANCE_BALANCED = "balanced"
FAN_BALANCE_SUPPLY_ONLY = "supply_only"
FAN_BALANCE_EXHAUST_ONLY = "exhaust_only"
FAN_BALANCE_OPTIONS = (
    FAN_BALANCE_BALANCED,
    FAN_BALANCE_SUPPLY_ONLY,
    FAN_BALANCE_EXHAUST_ONLY,
)
