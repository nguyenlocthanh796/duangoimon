"""Weighted-average inventory costing — month-end close (Thông tư 152/2025 §3).

TT152 mandates the WEIGHTED AVERAGE method computed at period
END (bình quân cuối kỳ). FIFO and LIFO are NOT permitted.

For each (branch, product, period):
    opening_value = opening_qty * prior_period_avg_cost   (from SoS2d)
    inbound_value = sum(amount for nhap in period)
    inbound_qty   = sum(qty    for nhap in period)
    avg = (opening_value + inbound_value) / (opening_qty + inbound_qty)
    -> backfill unit_cost on all xuat transactions of the period
    -> write SoS2d (closing qty * avg) and SoS2c (cost_of_goods)

Cost is computed ONLY at period close, never in realtime.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ke_toan import SoS2c, SoS2d
from app.models.quan_ly import Inventory, InventoryTransaction


def _prev_period(period: str) -> str:
    y, m = period.split("-")
    m = int(m) - 1
    if m == 0:
        m = 12
        y = str(int(y) - 1)
    return f"{y}-{m:02d}"


def weighted_avg(
    opening_qty,
    opening_value,
    inbound_qty,
    inbound_value,
) -> Decimal:
    """Pure weighted-average at period end (TT152 §3).

    avg = (opening_value + inbound_value) / (opening_qty + inbound_qty)
    Safe divide-by-zero -> 0. This is the ONLY permitted cost method;
    FIFO and LIFO MUST NOT be implemented anywhere.
    """
    oq = Decimal(str(opening_qty))
    ov = Decimal(str(opening_value))
    iq = Decimal(str(inbound_qty))
    iv = Decimal(str(inbound_value))
    denom = oq + iq
    if denom == 0:
        return Decimal("0")
    return (ov + iv) / denom


async def compute_period(
    db: AsyncSession,
    branch_id,
    period: str,
) -> dict:
    """Compute weighted-average unit cost per product for `period`.

    Returns a mapping product_id -> avg_cost. No FIFO/LIFO paths exist.
    """
    # Distinct products with activity this period.
    rows = await db.execute(
        select(
            InventoryTransaction.product_id,
            func.coalesce(
                func.sum(
                    func.case(
                        (InventoryTransaction.type == "nhap", InventoryTransaction.amount), else_=0
                    )
                ),
                0,
            ).label("inbound_value"),
            func.coalesce(
                func.sum(
                    func.case(
                        (InventoryTransaction.type == "nhap", InventoryTransaction.quantity),
                        else_=0,
                    )
                ),
                0,
            ).label("inbound_qty"),
        )
        .where(
            and_(
                InventoryTransaction.branch_id == branch_id,
                InventoryTransaction.accounting_period == period,
            )
        )
        .group_by(InventoryTransaction.product_id)
    )
    results = rows.all()

    avg_by_product: dict = {}
    for product_id, inbound_value, inbound_qty in results:
        # Prior-period avg cost (from SoS2d closing of previous month).
        prev = await db.execute(
            select(SoS2d.avg_cost, SoS2d.closing_qty)
            .where(
                and_(
                    SoS2d.branch_id == branch_id,
                    SoS2d.product_id == product_id,
                    SoS2d.period_month == _prev_period(period),
                )
            )
            .order_by(SoS2d.id.desc())
            .limit(1)
        )
        prev_row = prev.first()
        if prev_row:
            prev_avg = Decimal(str(prev_row.avg_cost or 0))
            prev_qty = Decimal(str(prev_row.closing_qty or 0))
        else:
            # Fallback: opening inventory on-hand.
            inv = await db.execute(
                select(Inventory.quantity).where(
                    and_(Inventory.branch_id == branch_id, Inventory.product_id == product_id)
                )
            )
            prev_qty = Decimal(str(inv.scalar() or 0))
            prev_avg = Decimal("0")

        opening_value = prev_qty * prev_avg
        denom = prev_qty + Decimal(str(inbound_qty))
        if denom == 0:
            avg = Decimal("0")
        else:
            avg = (opening_value + Decimal(str(inbound_value))) / denom
        avg_by_product[product_id] = avg
    return avg_by_product


async def close_period(db: AsyncSession, branch_id, period: str) -> dict:
    """Run the EOM close: backfill unit_cost + write SoS2d/SoS2c."""
    avg_by_product = await compute_period(db, branch_id, period)

    # Backfill unit_cost on outbound transactions of the period.
    for product_id, avg in avg_by_product.items():
        await db.execute(
            InventoryTransaction.__table__.update()
            .where(
                and_(
                    InventoryTransaction.branch_id == branch_id,
                    InventoryTransaction.product_id == product_id,
                    InventoryTransaction.type == "xuat",
                    InventoryTransaction.accounting_period == period,
                )
            )
            .values(unit_cost=float(avg), avg_cost_backfilled=True)
        )

    # Write SoS2d (closing inventory at avg cost).
    rows = await db.execute(
        select(
            InventoryTransaction.product_id,
            func.coalesce(
                func.sum(
                    func.case(
                        (InventoryTransaction.type == "nhap", InventoryTransaction.quantity),
                        else_=0,
                    )
                ),
                0,
            ).label("inqty"),
            func.coalesce(
                func.sum(
                    func.case(
                        (InventoryTransaction.type == "xuat", InventoryTransaction.quantity),
                        else_=0,
                    )
                ),
                0,
            ).label("outqty"),
        )
        .where(
            and_(
                InventoryTransaction.branch_id == branch_id,
                InventoryTransaction.accounting_period == period,
            )
        )
        .group_by(InventoryTransaction.product_id)
    )
    total_cost_of_goods = Decimal("0")
    for product_id, inqty, outqty in rows.all():
        avg = avg_by_product.get(product_id, Decimal("0"))
        # closing qty = current on-hand (from Inventory) as of close.
        inv = await db.execute(
            select(Inventory.quantity).where(
                and_(Inventory.branch_id == branch_id, Inventory.product_id == product_id)
            )
        )
        closing_qty = Decimal(str(inv.scalar() or 0))
        closing_value = closing_qty * avg
        total_cost_of_goods += Decimal(str(outqty)) * avg
        s2d = SoS2d(
            branch_id=branch_id,
            period_month=period,
            product_id=product_id,
            opening_qty=Decimal("0"),
            inbound_qty=Decimal(str(inqty)),
            outbound_qty=Decimal(str(outqty)),
            closing_qty=closing_qty,
            avg_cost=avg,
            closing_value=closing_value,
        )
        db.add(s2d)

    # Write SoS2c (cost of goods sold for the period).
    s2c = SoS2c(
        branch_id=branch_id,
        period_month=period,
        revenue=Decimal("0"),
        cost_of_goods=total_cost_of_goods,
        other_expense=Decimal("0"),
        taxable_income=Decimal("0"),
    )
    db.add(s2c)
    await db.commit()
    return {
        "period": period,
        "products": len(avg_by_product),
        "cost_of_goods": float(total_cost_of_goods),
    }


def current_period() -> str:
    today = date.today()
    return f"{today.year}-{today.month:02d}"
