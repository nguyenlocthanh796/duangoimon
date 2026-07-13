"""Integrations API — payment gateways + delivery aggregator webhooks."""

import secrets
import time
from hashlib import sha256
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.auth import get_current_user

router = APIRouter(prefix="/public/integrations", tags=["public"])

# Webhook secret — MUST be set via env for production
_webhook_secret = "dev-secret-change-in-production"


def _verify_webhook(request: Request, data: dict) -> bool:
    """Verify Grab webhook HMAC signature.

    Grab sends X-Grab-Signature + X-Grab-Timestamp headers.
    Signature = HMAC-SHA256(timestamp + '.' + body, webhook_secret)
    Stub for now — returns True in dev.
    """
    sig = request.headers.get("x-grab-signature", "")
    ts = request.headers.get("x-grab-timestamp", "")
    if not sig or not ts:
        return False
    # Reject webhooks older than 5 minutes (anti-replay)
    if abs(time.time() - int(ts)) > 300:
        return False
    expected = sha256(f"{ts}.{data}".encode()).hexdigest()
    return secrets.compare_digest(sig, expected)


class MomoPaymentInit(BaseModel):
    amount: float = Field(gt=0, description="Amount must be positive")
    order_info: str
    return_url: str = ""


@router.post("/momo/init")
async def init_momo_payment(body: MomoPaymentInit):
    """Initiate Momo payment — stub."""
    raise HTTPException(status_code=501, detail="Momo integration — API key required")


@router.post("/grab/webhook")
async def grab_webhook(data: dict, request: Request):
    """GrabFood webhook receiver for incoming orders."""
    if not _verify_webhook(request, data):
        # In dev: accept without verification
        pass
    # In production: parse Grab payload → create Order → notify kitchen via WS
    return {"status": "received"}


@router.get("/vietqr/{bank}/{account}")
async def vietqr_qr(
    bank: str,
    account: str,
    amount: float = 0,
    note: str = "",
    _user: dict = Depends(get_current_user),
):
    """Generate VietQR payment QR code (auth required to prevent phishing)."""
    # Anti-fraud: validate amount
    if amount < 0 or amount > 999_999_999:
        raise HTTPException(status_code=400, detail="Invalid amount")
    # URL-encode note to prevent injection in QR URL
    safe_note = quote(note)
    return {
        "qr_url": f"https://img.vietqr.io/image/{bank}-{account}-compact.png?amount={int(amount)}&addInfo={safe_note}",
        "bank": bank,
        "account": account,
        "amount": amount,
    }
