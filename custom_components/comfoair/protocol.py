"""ComfoAir wire protocol: frame encoding, decoding, and command IDs.

Ported from registers.h / comfoair.cpp. Frame format on the wire:

    0x07 0xF0 0x00 <cmd> <len> <data...> <checksum> 0x07 0x0F

Any 0x07 byte appearing inside <cmd>..<checksum> is escaped by doubling it
(0x07 0x07). ACK frames are just `0x07 0xF3`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator
from math import ceil

PREFIX = 0x07
HEAD = 0xF0
TAIL = 0x0F
ACK = 0xF3
CHECKSUM_SEED = 173

# --- command / response IDs ---------------------------------------------------

CMD_GET_BOOTLOADER_VERSION = 0x67
RES_GET_BOOTLOADER_VERSION = 0x68
CMD_GET_FIRMWARE_VERSION = 0x69
RES_GET_FIRMWARE_VERSION = 0x6A
CMD_GET_CONNECTOR_BOARD_VERSION = 0xA1
RES_GET_CONNECTOR_BOARD_VERSION = 0xA2

CMD_GET_INPUTS = 0x03
RES_GET_INPUTS = 0x04
CMD_GET_FAN_STATUS = 0x0B
RES_GET_FAN_STATUS = 0x0C
CMD_GET_ANALOG_INPUTS = 0x13
RES_GET_ANALOG_INPUTS = 0x14
CMD_GET_VALVE_STATUS = 0x0D
RES_GET_VALVE_STATUS = 0x0E
CMD_GET_TEMPERATURE_STATUS = 0x0F
RES_GET_TEMPERATURE_STATUS = 0x10
CMD_GET_SENSOR_DATA = 0x97
RES_GET_SENSOR_DATA = 0x98
CMD_GET_VENTILATION_LEVEL = 0xCD
RES_GET_VENTILATION_LEVEL = 0xCE
CMD_GET_TEMPERATURES = 0xD1
RES_GET_TEMPERATURES = 0xD2
CMD_GET_STATUS = 0xD5
RES_GET_STATUS = 0xD6
CMD_GET_FAULTS = 0xD9
RES_GET_FAULTS = 0xDA
CMD_GET_OPERATION_HOURS = 0xDD
RES_GET_OPERATION_HOURS = 0xDE
CMD_GET_BYPASS_CONTROL_STATUS = 0xDF
RES_GET_BYPASS_CONTROL_STATUS = 0xE0
CMD_GET_PREHEATING_STATUS = 0xE1
RES_GET_PREHEATING_STATUS = 0xE2
CMD_GET_TIME_DELAY = 0xC9
RES_GET_TIME_DELAY = 0xCA
CMD_GET_EWT_POSTHEATING = 0xEB
RES_GET_EWT_POSTHEATING = 0xEC

CMD_SET_LEVEL = 0x99
CMD_SET_VENTILATION_LEVEL = 0xCF
CMD_SET_COMFORT_TEMPERATURE = 0xD3
CMD_SET_TIME_DELAY = 0xCB
CMD_RESET_AND_SELF_TEST = 0xDB
CMD_SET_EWT_POSTHEATING = 0xED

CMD_CC_EASE_KEY_STATUS = 0x37
CMD_CC_EASE_SET_DISPLAY = 0x3C


# --- frame data structure -----------------------------------------------------


@dataclass(frozen=True)
class Frame:
    """A decoded ComfoAir response frame (or ACK)."""

    msg_id: int
    data: bytes

    @property
    def is_ack(self) -> bool:
        return self.msg_id == ACK


# --- encoding -----------------------------------------------------------------


def _checksum(cmd: int, data: bytes) -> int:
    return (CHECKSUM_SEED + cmd + len(data) + sum(data)) & 0xFF


def _escape(body: bytes) -> bytes:
    out = bytearray()
    for b in body:
        out.append(b)
        if b == PREFIX:
            out.append(PREFIX)
    return bytes(out)


def encode_frame(cmd: int, data: bytes = b"") -> bytes:
    """Serialize a command frame ready to write to the UART."""
    return (
        bytes([PREFIX, HEAD, 0x00, cmd, len(data)])
        + _escape(data + bytes([_checksum(cmd, data)]))
        + bytes([PREFIX, TAIL])
    )


# --- decoding -----------------------------------------------------------------


class FrameParser:
    """Incrementally consume bytes and yield decoded frames.

    Only the data area is escaped: a literal 0x07 inside <data> is doubled
    (0x07 0x07 -> 0x07). The <cmd> and <len> header bytes are sent raw, so a
    frame whose length is 0x07 carries a single 0x07 length byte. We therefore
    read <cmd> and <len> literally, then length-delimit the data region and
    apply unescaping only there — a marker-based parser would mistake the raw
    0x07 length byte for an escape prefix and drop the whole frame, which is
    what left every 0xE0 (bypass/summer mode) and 0xEC (EWT) frame, both
    length 7, unparsed. ACK frames are just `0x07 0xF3`.
    """

    # parser states
    _IDLE = 0  # waiting for PREFIX
    _AFTER_PREFIX = 1  # got PREFIX, expecting HEAD or ACK
    _AFTER_HEAD = 2  # got HEAD, expecting 0x00
    _CMD = 3  # next byte is the raw command byte
    _LEN = 4  # next byte is the raw length byte
    _DATA = 5  # collecting <len> data bytes + 1 checksum (with unescaping)
    _DATA_ESCAPE = 6  # saw PREFIX inside the data region; next byte decides
    _END_TAIL = 7  # data complete, saw end PREFIX, expecting TAIL

    def __init__(self) -> None:
        self._state = self._IDLE
        self._body = bytearray()
        self._remaining = 0  # data + checksum bytes still to read

    def feed(self, chunk: bytes) -> Iterator[Frame]:
        for byte in chunk:
            frame = self._step(byte)
            if frame is not None:
                yield frame

    def _reset(self) -> None:
        self._state = self._IDLE
        self._body.clear()
        self._remaining = 0

    def _resync(self, b: int) -> None:
        """Drop the current frame; if b is a PREFIX, start a new one."""
        self._reset()
        if b == PREFIX:
            self._state = self._AFTER_PREFIX

    def _step(self, b: int) -> Frame | None:
        st = self._state
        if st == self._IDLE:
            if b == PREFIX:
                self._state = self._AFTER_PREFIX
            return None

        if st == self._AFTER_PREFIX:
            if b == ACK:
                self._reset()
                return Frame(msg_id=ACK, data=b"")
            if b == HEAD:
                self._state = self._AFTER_HEAD
                return None
            # stray byte; resync (this byte might itself be a PREFIX)
            self._resync(b)
            return None

        if st == self._AFTER_HEAD:
            if b == 0x00:
                self._state = self._CMD
            else:
                self._resync(b)
            return None

        if st == self._CMD:
            self._body.append(b)
            self._state = self._LEN
            return None

        if st == self._LEN:
            self._body.append(b)
            self._remaining = b + 1  # <len> data bytes + 1 checksum byte
            self._state = self._DATA
            return None

        if st == self._DATA:
            if self._remaining == 0:
                # data + checksum complete; expect end marker 0x07 0x0F
                if b == PREFIX:
                    self._state = self._END_TAIL
                else:
                    self._resync(b)
                return None
            if b == PREFIX:
                self._state = self._DATA_ESCAPE
                return None
            self._body.append(b)
            self._remaining -= 1
            return None

        if st == self._DATA_ESCAPE:
            if b == PREFIX:
                # escaped literal 0x07 inside the data/checksum region
                self._body.append(PREFIX)
                self._remaining -= 1
                self._state = self._DATA
                return None
            # a lone 0x07 in the data region is unexpected (truncated frame)
            self._resync(b)
            return None

        if st == self._END_TAIL:
            if b == TAIL:
                frame = self._finalize()
                self._reset()
                return frame
            self._resync(b)
            return None

        return None

    def _finalize(self) -> Frame | None:
        # body = [cmd, len, ...data..., checksum]
        if len(self._body) < 3:
            return None
        cmd = self._body[0]
        length = self._body[1]
        if len(self._body) != 2 + length + 1:
            return None
        data = bytes(self._body[2 : 2 + length])
        expected = _checksum(cmd, data)
        if self._body[2 + length] != expected:
            return None
        return Frame(msg_id=cmd, data=data)


# --- helpers ------------------------------------------------------------------


def temp_to_byte(celsius: float) -> int:
    """Encode a temperature for SET_COMFORT_TEMPERATURE: (T + 20) * 2."""
    return int((celsius + 20.0) * 2.0) & 0xFF


def byte_to_temp(value: int) -> float:
    """Decode a temperature byte: value / 2 - 20."""
    return value / 2.0 - 20.0


def rpm_from_period(raw: int) -> int:
    """Fan period -> RPM. Sent value is 1875000 / RPM."""
    if raw == 0:
        return 0
    return int(1875000 / raw)


def u16(data: bytes, offset: int) -> int:
    return (data[offset] << 8) | data[offset + 1]


def u24(data: bytes, offset: int) -> int:
    return (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2]


def ms_to_byte(ms: int) -> int:
    """Encode milliseconds."""
    ms = min(ms, 4080)
    return ceil(ms / 16.0)


CC_EASE_LEADING_DIGIT: dict[int, str] = {0x00: " ", 0x03: "2", 0x06: "1"}
CC_EASE_SEVEN_SEGMENT: dict[int, str] = {
    0x00: " ",
    0x3F: "0",
    0x06: "1",
    0x5B: "2",
    0x4F: "3",
    0x66: "4",
    0x6D: "5",
    0x7D: "6",
    0x07: "7",
    0x7F: "8",
    0x6F: "9",
    0x77: "A",
    0x7C: "b",
    0x39: "C",
    0x5E: "d",
    0x79: "E",
    0x71: "F",
    0x76: "H",
    0x38: "L",
    0x54: "n",
    0x5C: "o",
    0x73: "P",
    0x50: "r",
    0x78: "t",
    0x3E: "U",
    0x40: "-",
}

CC_EASE_WEEKDAYS = (
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
)
