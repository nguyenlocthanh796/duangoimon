"""HKD revenue-tier classification (Nghị định 141/2026 & Thông tư 152/2025).

Revenue thresholds (VND/year):
  Nhóm 1 : revenue_ytd <= 1 ty        -> miễn GTGT & TNCN (S1a, 01/TKN-CNKD)
  Nhóm 2 : 1 ty < ytd <= 3 ty       -> S2a (ty le) HOAC S2b-e (loi nhuan 15%)
  Nhóm 3 : 3 ty < ytd <= 50 ty      -> bat buoc loi nhuan 17%
  Nhóm 4 : ytd > 50 ty              -> bat buoc loi nhuan 20%

All comparisons are done with Decimal to avoid float rounding errors at the
1 ty / 3 ty / 50 ty boundaries.
"""
from decimal import Decimal
from typing import Literal

from app.models.thue.hkd_profile import HKDProfile

TIER_META: dict[str, dict] = {
    "N1": {
        "label": "Nhóm 1 (<= 1 ty - Miễn thuế)",
        "tax_method": "mien_thue",
        "sach_bat_buoc": ["SoS1a", "01_TKN_CNKD"],
        "thue_suat": Decimal("0"),
    },
    "N2": {
        "label": "Nhóm 2 (>1 ty - 3 ty)",
        "tax_method": "ty_le_nganh",
        "sach_bat_buoc": ["SoS2a", "SoS2b", "SoS2c", "SoS2d", "SoS2e", "01_CNKD"],
        "thue_suat": Decimal("1"),
    },
    "N3": {
        "label": "Nhóm 3 (>3 ty - 50 ty)",
        "tax_method": "loi_nhuận",
        "sach_bat_buoc": ["SoS2b", "SoS2c", "SoS2d", "SoS2e", "01_CNKD"],
        "thue_suat": Decimal("17"),
    },
    "N4": {
        "label": "Nhóm 4 (>50 ty)",
        "tax_method": "loi_nhuận",
        "sach_bat_buoc": ["SoS2b", "SoS2c", "SoS2d", "SoS2e", "01_CNKD"],
        "thue_suat": Decimal("20"),
    },
}

ONE_TY = Decimal("1000000000")
THREE_TY = Decimal("3000000000")
FIFTY_TY = Decimal("50000000000")


def classify_tier(revenue_ytd: Decimal | float | int | str) -> Literal["N1", "N2", "N3", "N4"]:
    """Return HKD tier from cumulative yearly revenue (VND)."""
    ytd = Decimal(str(revenue_ytd))
    if ytd <= ONE_TY:
        return "N1"
    if ytd <= THREE_TY:
        return "N2"
    if ytd <= FIFTY_TY:
        return "N3"
    return "N4"


def tier_of_profile(profile: HKDProfile) -> str:
    return classify_tier(profile.revenue_ytd)
