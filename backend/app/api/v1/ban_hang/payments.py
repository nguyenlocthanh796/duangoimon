import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.audit import log_action
from app.models.ban_hang import Order
from app.models.ban_hang import Table

router = APIRouter(prefix="/ban-hang/payments", tags=["ban-hang"])


class PaymentCreate(BaseModel):
    order_id: str
    payment_method: str = "tien_mat"
    amount_received: float | None = None
    splits: list[dict] | None = None


@router.post("")
async def process_payment(body: PaymentCreate, request: Request, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(select(Order).where(Order.id == uuid.UUID(body.order_id)))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == "da_thanh_toan":
        raise HTTPException(status_code=400, detail="Order already paid")

    old_status = order.status
    if body.splits:
        methods = [s["method"] for s in body.splits]
        order.payment_method = "+".join(methods)
    else:
        order.payment_method = body.payment_method

    order.status = "da_thanh_toan"
    order.paid_at = datetime.now(timezone.utc)

    if order.table_id:
        await db.execute(update(Table).where(Table.id == order.table_id).values(status="trong"))

    await db.commit()
    await db.refresh(order)

    # Audit log
    await log_action(
        db, str(_user["sub"]), _user.get("username"),
        "update", "order", str(order.id),
        old_value={"status": old_status},
        new_value={"status": "da_thanh_toan", "payment_method": order.payment_method},
        request=request,
    )

    from app.core.inventory import deduct_inventory
    await deduct_inventory(str(order.id), db)

    from app.core.ws_manager import ws_manager
    await ws_manager.broadcast("kitchen", {
        "event": "order_updated",
        "order": {"id": str(order.id), "status": "da_thanh_toan"},
    })

    return {"status": "ok", "order_id": str(order.id)}
