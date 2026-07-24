"""WebSocket connection manager with token auth."""

from typing import Any

from fastapi import WebSocket

from app.core.auth import decode_token


class ConnectionManager:
    """Manages WebSocket connections grouped by channel."""

    def __init__(self):
        self._channels: dict[str, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, channel: str = "kitchen"):
        await ws.accept()
        self._channels.setdefault(channel, []).append(ws)

    def disconnect(self, ws: WebSocket, channel: str = "kitchen"):
        conns = self._channels.get(channel, [])
        if ws in conns:
            conns.remove(ws)

    async def broadcast(self, channel: str, data: dict[str, Any]):
        dead: list[WebSocket] = []
        for ws in self._channels.get(channel, []):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._channels.get(channel, []).remove(ws)


ws_manager = ConnectionManager()
