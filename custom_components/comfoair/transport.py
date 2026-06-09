"""Async serial transport for the ComfoAir protocol.

The device speaks half-duplex: most commands get an ACK plus (optionally) a
data response, and the device also volunteers state updates without being
polled.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Callable
from serialx import Parity, StopBits, open_serial_connection
from homeassistant.core import HomeAssistant

from .protocol import Frame, FrameParser, encode_frame

_LOGGER = logging.getLogger(__name__)

BAUDRATE = 9600
DEFAULT_WAIT_TIMEOUT = 2.0


class ComfoAirTransport:
    """Owns the serial connection and a background read loop."""

    def __init__(self, port: str, hass: HomeAssistant) -> None:
        self.hass = hass
        self.port = port

        self._reader_task: asyncio.Task[None] | None = None
        self._writer: asyncio.StreamWriter | None = None
        self._write_lock = asyncio.Lock()

        self._is_closing: bool = False

        self._waiters: dict[int, list[asyncio.Future[Frame]]] = {}
        self._callbacks: list[Callable[[Frame], None]] = []

    @property
    def is_connected(self) -> bool:
        return (
            self._writer is not None
            and not self._writer.is_closing()
            and self._reader_task is not None
            and not self._reader_task.done()
        )

    async def disconnect(self) -> None:
        self._is_closing = True
        await self._teardown()

    async def _teardown(self) -> None:
        if self._reader_task is not None and not self._reader_task.done():
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError, Exception:  # noqa: BLE001
                pass
        self._reader_task = None
        if self._writer is not None:
            try:
                self._writer.close()
                await self._writer.wait_closed()
            except Exception:  # noqa: BLE001
                pass
        self._writer = None
        self._fail_waiters(ConnectionError("transport closed"))

    async def connect(self) -> None:
        self._is_closing = False
        await self._teardown()
        _LOGGER.debug("Opening serial connection to %s @ %d", self.port, BAUDRATE)
        reader, self._writer = await open_serial_connection(
            url=self.port,
            baudrate=BAUDRATE,
            parity=Parity.NONE,
            stopbits=StopBits.ONE,
        )
        self._reader_task = self.hass.async_create_background_task(
            self._reader(reader), "ComfoAir Serial Reader"
        )
        _LOGGER.debug("Serial connection to %s established", self.port)

    async def _reader(self, reader: asyncio.StreamReader) -> None:
        parser = FrameParser()
        try:
            while True:
                chunk = await reader.read(64)
                if not chunk:
                    raise ConnectionError("serial EOF")
                for frame in parser.feed(chunk):
                    self._dispatch(frame)
        except asyncio.CancelledError:
            raise
        except Exception as err:  # noqa: BLE001
            if not self._is_closing:
                _LOGGER.warning("ComfoAir reader stopped: %s", err)
                self._fail_waiters(err)

    def _dispatch(self, frame: Frame) -> None:
        if frame.is_ack:
            return

        for callback in self._callbacks:
            try:
                callback(frame)
            except Exception:  # noqa: BLE001
                _LOGGER.exception("error handling frame 0x%02X", frame.msg_id)

        waiters = self._waiters.pop(frame.msg_id, None)
        if waiters:
            for fut in waiters:
                if not fut.done():
                    fut.set_result(frame)

    async def send(self, cmd: int, data: bytes = b"") -> None:
        """Write a command frame. Does not wait for any response."""
        async with self._write_lock:
            if self._writer is None:
                raise ConnectionError("ComfoAir transport not connected")
            self._writer.write(encode_frame(cmd, data))
            await self._writer.drain()

    async def request(
        self,
        cmd: int,
        expected_msg_id: int,
        data: bytes = b"",
        timeout: float = DEFAULT_WAIT_TIMEOUT,
    ) -> Frame:
        """Send a command and resolve on the next frame matching expected_msg_id."""
        loop = asyncio.get_running_loop()
        fut: asyncio.Future[Frame] = loop.create_future()
        self._waiters.setdefault(expected_msg_id, []).append(fut)
        try:
            await self.send(cmd, data)
            return await asyncio.wait_for(fut, timeout=timeout)
        finally:
            waiters = self._waiters.get(expected_msg_id)
            if waiters is not None:
                try:
                    waiters.remove(fut)
                except ValueError:
                    pass
                if not waiters:
                    self._waiters.pop(expected_msg_id, None)

    def add_callback(self, callback: Callable[[Frame], None]) -> None:
        self._callbacks.append(callback)

    def _fail_waiters(self, err: BaseException) -> None:
        for futs in list(self._waiters.values()):
            for fut in futs:
                if not fut.done():
                    fut.set_exception(err)
        self._waiters.clear()
