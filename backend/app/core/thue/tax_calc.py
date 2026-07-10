"""Thuế HKD calculation engine (Thông tư 152/2025/TT-BTC).

Implements the 2026 regime for Hộ Kinh Doanh / Cá nhân kinh doanh:
- Revenue-tier classification (Nhóm 1–4) — CANONICAL with core/thue/tier.py
  (Nghị định 141/2026):
    Nhóm 1 : ytd <= 1 ty        -> miễn GTGT & TNCN (S1a, 01/TKN-CNKD)
    Nhóm 2 : 1 ty < ytd <= 3 ty -> tỷ lệ ngành (VAT 1%, TNCN 0.5%)
    Nhóm 3 : 3 ty < ytd <= 50 ty-> tỷ lệ ngành (VAT 0.5%, TNCN 0.5%)
    Nhóm 4 : ytd > 50 ty        -> bắt buộc lợi nhuận (không dùng tỷ lệ đơn giản)
- Tax = GTGT (VAT) + TNCN (PIT) computed on declared revenue for N2/N3.
- Weighted-average cost tracking (TT152 §3) — no FIFO/LIFO.
"""
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum

# 1 tỷ VND threshold for mandatory full accounting (Nhóm 1).
TY_THRESHOLD = Decimal("1_000_000_000")
# 3 tỷ VND — Nhóm 2/3 boundary (Tỷ lệ ngành vs Lợi nhuận).
THREE_TY = Decimal("3_000_000_000")
# 50 tỷ VND — Nhóm 3/4 boundary.
FIFTY_TY = Decimal("50_000_000_000")

# Thuế suất (VAT %, TNCN %) theo Nhóm 1–4 (TT152/2026, tỷ lệ ngành).
# Nhóm 1 (doanh thu <= 1 tỷ): MIỄN thuế (0% / 0%).
# Nhóm 4 chuyển sang biểu thuế lợi nhuận (0% tỷ lệ đơn giản).
GROUP_RATES: dict[int, tuple[Decimal, Decimal]] = {
    1: (Decimal("0.0"), Decimal("0.0")),   # N1 miễn thuế
    2: (Decimal("1.0"), Decimal("0.5")),   # N2 tỷ lệ ngành
    3: (Decimal("0.5"), Decimal("0.5")),   # N3 tỷ lệ ngành (minh họa)
    4: (Decimal("0.0"), Decimal("0.0")),   # N4 (biểu thuế lợi nhuận)
}


class TaxGroup(str, Enum):
    N1 = "N1"
    N2 = "N2"
    N3 = "N3"
    N4 = "N4"


def classify_group(revenue_ytd: Decimal) -> int:
    """Classify an HKD into Nhóm 1–4 from year-to-date revenue (VND).

    Canonical with core/thue/tier.classify_tier:
      N1 <= 1ty | N2 1-3ty | N3 3-50ty | N4 > 50ty.
    """
    rev = Decimal(revenue_ytd)
    if rev <= TY_THRESHOLD:
        return 1
    if rev <= THREE_TY:
        return 2
    if rev <= FIFTY_TY:
        return 3
    return 4


def classify_group_strict(revenue_ytd: Decimal, opted_in: bool = True) -> int:
    """Strict classification honoring the miễn-thuế threshold (Nhóm 1).

    ``opted_in`` is retained for API compatibility; the simplified-method
    miễn-thuế threshold (Nhóm 1, <= 1 ty) applies regardless of opt-in.
    """
    rev = Decimal(revenue_ytd)
    if rev <= TY_THRESHOLD:
        return 1
    if rev <= THREE_TY:
        return 2
    if rev <= FIFTY_TY:
        return 3
    return 4 if opted_in else 4


@dataclass
class TaxResult:
    group: int
    revenue: Decimal
    vat_rate: Decimal
    pit_rate: Decimal
    vat: Decimal
    pit: Decimal
    total: Decimal

    def as_dict(self) -> dict:
        return {
            "group": self.group,
            "revenue": str(self.revenue),
            "vat_rate": str(self.vat_rate),
            "pit_rate": str(self.pit_rate),
            "vat": str(self.vat),
            "pit": str(self.pit),
            "total": str(self.total),
        }


def compute_tax(revenue: Decimal, group: int | None = None) -> TaxResult:
    """Compute VAT + PIT for a revenue amount (VND).

    If group is None, classify from revenue automatically (per tier.py).
    """
    rev = Decimal(revenue)
    g = group if group is not None else classify_group(rev)
    vat_pct, pit_pct = GROUP_RATES[g]
    vat = (rev * vat_pct / Decimal("100")).quantize(Decimal("0.01"))
    pit = (rev * pit_pct / Decimal("100")).quantize(Decimal("0.01"))
    total = (vat + pit).quantize(Decimal("0.01"))
    return TaxResult(
        group=g,
        revenue=rev.quantize(Decimal("0.01")),
        vat_rate=vat_pct,
        pit_rate=pit_pct,
        vat=vat,
        pit=pit,
        total=total,
    )


def weighted_average_cost(total_cost: Decimal, total_qty: Decimal) -> Decimal:
    """Weighted-average unit cost (TT152 §3). Avoids FIFO/LIFO.

    Returns unit cost = total_cost / total_qty, or 0 when qty is 0.
    """
    if total_qty == 0:
        return Decimal("0")
    return (Decimal(total_cost) / Decimal(total_qty)).quantize(Decimal("0.0001"))
