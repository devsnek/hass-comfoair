"""Tests for the ComfoAir wire protocol: encoding, decoding, and helpers."""

from __future__ import annotations

import pytest

from custom_components.comfoair import protocol as p
from custom_components.comfoair.protocol import (
    ACK,
    HEAD,
    PREFIX,
    TAIL,
    Frame,
    FrameParser,
    byte_to_temp,
    encode_frame,
    rpm_from_period,
    temp_to_byte,
    u16,
    u24,
)


def parse_all(*chunks: bytes) -> list[Frame]:
    """Feed one or more chunks through a single parser and collect frames."""
    parser = FrameParser()
    frames: list[Frame] = []
    for chunk in chunks:
        frames.extend(parser.feed(chunk))
    return frames


# --- checksum -----------------------------------------------------------------


def test_checksum_seed_only() -> None:
    # cmd=0, len=0, no data -> just the seed.
    assert p._checksum(0x00, b"") == p.CHECKSUM_SEED


def test_checksum_includes_cmd_len_and_data() -> None:
    assert p._checksum(0xD5, b"") == (p.CHECKSUM_SEED + 0xD5) & 0xFF
    assert p._checksum(0x10, b"\x01\x02") == (p.CHECKSUM_SEED + 0x10 + 2 + 3) & 0xFF


def test_checksum_wraps_to_byte() -> None:
    assert (
        p._checksum(0xFF, b"\xff\xff\xff")
        == (p.CHECKSUM_SEED + 0xFF + 3 + 0xFF * 3) & 0xFF
    )


# --- encode_frame -------------------------------------------------------------


def test_encode_frame_no_data() -> None:
    frame = encode_frame(p.CMD_GET_STATUS)
    checksum = p._checksum(p.CMD_GET_STATUS, b"")
    assert frame == bytes(
        [PREFIX, HEAD, 0x00, p.CMD_GET_STATUS, 0x00, checksum, PREFIX, TAIL]
    )


def test_encode_frame_with_data() -> None:
    data = bytes([0x12, 0x34])
    frame = encode_frame(0x40, data)
    checksum = p._checksum(0x40, data)
    assert frame == bytes(
        [PREFIX, HEAD, 0x00, 0x40, 0x02, 0x12, 0x34, checksum, PREFIX, TAIL]
    )


def test_encode_frame_escapes_prefix_in_data() -> None:
    # A literal 0x07 in the data region must be doubled.
    frame = encode_frame(0x10, bytes([PREFIX]))
    # body = [0x10, 0x01, 0x07, checksum]; the 0x07 data byte is doubled.
    assert frame[:3] == bytes([PREFIX, HEAD, 0x00])
    assert bytes([PREFIX, PREFIX]) in frame[3:-2]
    # Round-trips back to the original single 0x07.
    (decoded,) = parse_all(frame)
    assert decoded == Frame(msg_id=0x10, data=bytes([PREFIX]))


def test_encode_frame_escapes_prefix_checksum() -> None:
    # cmd=0x5A, no data -> checksum lands on 0x07, which must be escaped.
    assert p._checksum(0x5A, b"") == PREFIX
    frame = encode_frame(0x5A)
    (decoded,) = parse_all(frame)
    assert decoded == Frame(msg_id=0x5A, data=b"")


# --- FrameParser round trips --------------------------------------------------


@pytest.mark.parametrize(
    "cmd,data",
    [
        (p.RES_GET_STATUS, b""),
        (p.RES_GET_FAN_STATUS, bytes([0x10, 0x20, 0x07, 0x53, 0x03, 0x84])),
        (p.RES_GET_TEMPERATURES, bytes(range(9))),
        (0xEC, bytes(range(7))),  # length-7 frame (raw 0x07 length byte)
        (0xE0, bytes(7)),  # length-7 all zeros
    ],
)
def test_encode_then_parse_round_trip(cmd: int, data: bytes) -> None:
    (frame,) = parse_all(encode_frame(cmd, data))
    assert frame == Frame(msg_id=cmd, data=data)


def test_encode_does_not_escape_raw_header_bytes() -> None:
    # cmd and len are written raw; a 0x07 length byte stays a single 0x07 so the
    # parser (which reads <len> literally) stays in sync.
    wire = encode_frame(0xEC, bytes(7))  # len == 0x07
    assert wire[3] == 0xEC  # cmd, raw
    assert wire[4] == PREFIX  # len == 7, a single raw 0x07 (not doubled)


def test_length_seven_frame_is_not_mistaken_for_escape() -> None:
    # The <len> byte is 0x07 here; a marker-based parser would treat it as an
    # escape prefix and drop the frame. Data also contains a real 0x07.
    data = bytes([0x01, PREFIX, 0x03, 0x04, 0x05, 0x06, 0x07])
    (frame,) = parse_all(encode_frame(0xEC, data))
    assert frame == Frame(msg_id=0xEC, data=data)


def test_parser_handles_data_split_across_chunks() -> None:
    wire = encode_frame(p.RES_GET_FAN_STATUS, bytes([1, 2, 3, 4, 5, 6]))
    frames = parse_all(*(wire[i : i + 1] for i in range(len(wire))))
    assert frames == [
        Frame(msg_id=p.RES_GET_FAN_STATUS, data=bytes([1, 2, 3, 4, 5, 6]))
    ]


def test_parser_yields_multiple_frames_in_one_chunk() -> None:
    wire = encode_frame(0x10, b"\x01") + encode_frame(0x20, b"\x02\x03")
    assert parse_all(wire) == [
        Frame(msg_id=0x10, data=b"\x01"),
        Frame(msg_id=0x20, data=b"\x02\x03"),
    ]


# --- ACK and resync -----------------------------------------------------------


def test_ack_frame() -> None:
    (frame,) = parse_all(bytes([PREFIX, ACK]))
    assert frame.is_ack
    assert frame == Frame(msg_id=ACK, data=b"")


def test_non_ack_frame_is_not_ack() -> None:
    (frame,) = parse_all(encode_frame(0x10))
    assert not frame.is_ack


def test_leading_garbage_is_dropped() -> None:
    wire = bytes([0x00, 0xAB, 0xCD]) + encode_frame(0x10, b"\x01")
    assert parse_all(wire) == [Frame(msg_id=0x10, data=b"\x01")]


def test_bad_checksum_frame_is_rejected() -> None:
    wire = bytearray(encode_frame(0x10, b"\x01\x02"))
    wire[-3] ^= 0xFF  # corrupt the checksum byte
    assert parse_all(bytes(wire)) == []


def test_resync_recovers_after_corrupt_frame() -> None:
    # A frame with a wrong tail byte should be dropped, then a good frame parses.
    bad = bytearray(encode_frame(0x10, b"\x01"))
    bad[-1] = 0xFF  # break the TAIL
    good = encode_frame(0x20, b"\x02")
    assert parse_all(bytes(bad) + good) == [Frame(msg_id=0x20, data=b"\x02")]


def test_parser_can_be_reused_after_yielding() -> None:
    parser = FrameParser()
    assert list(parser.feed(encode_frame(0x10))) == [Frame(msg_id=0x10, data=b"")]
    assert list(parser.feed(encode_frame(0x20))) == [Frame(msg_id=0x20, data=b"")]


# --- helpers ------------------------------------------------------------------


@pytest.mark.parametrize("celsius", [12.0, 15.0, 20.0, 20.5, 29.0])
def test_temp_byte_round_trip(celsius: float) -> None:
    assert byte_to_temp(temp_to_byte(celsius)) == celsius


def test_temp_to_byte_known_value() -> None:
    assert temp_to_byte(20.0) == 80
    assert byte_to_temp(80) == 20.0


def test_rpm_from_period_zero() -> None:
    assert rpm_from_period(0) == 0


def test_rpm_from_period_known() -> None:
    assert rpm_from_period(1250) == 1500
    assert rpm_from_period(1875000) == 1


def test_u16() -> None:
    assert u16(b"\x12\x34", 0) == 0x1234
    assert u16(b"\x00\x12\x34", 1) == 0x1234


def test_u24() -> None:
    assert u24(b"\x01\x02\x03", 0) == 0x010203
    assert u24(b"\xff\xff\xff", 0) == 0xFFFFFF
