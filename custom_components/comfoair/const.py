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

# RS232 (PC port) modes for CMD_SET_RS232_MODE, echoed back in RES_SET_RS232_MODE
RS232_MODE_END = "end"
RS232_MODE_PC_ONLY = "pc_only"
RS232_MODE_CC_EASE_ONLY = "cc_ease_only"
RS232_MODE_PC_MASTER = "pc_master"
RS232_MODE_PC_LOG = "pc_log"
RS232_MODES = {
    RS232_MODE_END: 0x00,
    RS232_MODE_PC_ONLY: 0x01,
    RS232_MODE_CC_EASE_ONLY: 0x02,
    RS232_MODE_PC_MASTER: 0x03,
    RS232_MODE_PC_LOG: 0x04,
}
