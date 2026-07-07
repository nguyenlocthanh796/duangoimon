"""Integrations API — payment gateways + delivery aggregator webhooks."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/public/integrations", tags=["public"])


class MomoPaymentInit(BaseModel):
    amount: float
    order_info: str
    return_url: str = ""


@router.post("/momo/init")
async def init_momo_payment(body: MomoPaymentInit):
    """Initiate Momo payment — stub."""
    raise HTTPException(status_code=501, detail="Momo integration — API key required")


@router.post("/grab/webhook")
async def grab_webhook(data: dict):
    """GrabFood webhook receiver for incoming orders."""
    # In production: parse Grab payload → create Order → notify kitchen via WS
    return {"status": "received"}


@router.get("/vietqr/{bank}/{account}")
async def vietqr_qr(bank: str, account: str, amount: float = 0, note: str = ""):
    """Generate VietQR payment QR code."""
    return {
        "qr_url": f"https://img.vietqr.io/image/{bank}-{account}-compact.png?amount={int(amount)}&addInfo={note}",
        "bank": bank,
        "account": account,
        "amount": amount,
    }
