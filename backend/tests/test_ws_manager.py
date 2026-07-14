"""Tests for WebSocket ConnectionManager — channel management + auth logic.

Uses unittest.mock to avoid coupling to ASGI/WebSocket lifecycle.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock


def _mock_ws(token: str = "valid_token"):
    """Create a mock WebSocket with query_params."""
    ws = MagicMock()
    ws.query_params = {"token": token}
    ws.send_json = AsyncMock()
    ws.close = AsyncMock()
    ws.accept = AsyncMock()
    return ws


class TestConnectionManager:
    def test_init_empty_channels(self):
        from app.core.ws_manager import ConnectionManager

        mgr = ConnectionManager()
        assert mgr._channels == {}

    def test_disconnect_removes_ws(self):
        from app.core.ws_manager import ConnectionManager

        mgr = ConnectionManager()
        ws = _mock_ws()
        # Manually add to channel (bypass connect flow)
        mgr._channels["kitchen"] = [ws]
        mgr.disconnect(ws, "kitchen")
        assert ws not in mgr._channels["kitchen"]

    def test_disconnect_unknown_ws_noop(self):
        from app.core.ws_manager import ConnectionManager

        mgr = ConnectionManager()
        mgr._channels["kitchen"] = [_mock_ws()]
        # Disconnect a different ws — should not raise
        mgr.disconnect(_mock_ws(), "kitchen")
        assert len(mgr._channels["kitchen"]) == 1

    async def test_broadcast_to_all(self):
        from app.core.ws_manager import ConnectionManager

        mgr = ConnectionManager()
        ws1, ws2 = _mock_ws(), _mock_ws()
        mgr._channels["alerts"] = [ws1, ws2]
        data = {"event": "test"}

        await mgr.broadcast("alerts", data)
        ws1.send_json.assert_awaited_once_with(data)
        ws2.send_json.assert_awaited_once_with(data)

    async def test_broadcast_removes_dead_connection(self):
        from app.core.ws_manager import ConnectionManager

        mgr = ConnectionManager()
        alive = _mock_ws()
        dead = _mock_ws()
        dead.send_json = AsyncMock(side_effect=Exception("Connection closed"))
        mgr._channels["kitchen"] = [alive, dead]

        await mgr.broadcast("kitchen", {"msg": "ping"})
        # Dead connection should be removed
        assert dead not in mgr._channels["kitchen"]
        assert alive in mgr._channels["kitchen"]

    async def test_broadcast_no_channel_noop(self):
        from app.core.ws_manager import ConnectionManager

        mgr = ConnectionManager()
        # Should not raise when channel doesn't exist
        await mgr.broadcast("nonexistent", {"x": 1})
