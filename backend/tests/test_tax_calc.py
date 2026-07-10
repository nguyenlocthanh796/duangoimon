"""Unit tests for thuế HKD calculation engine (TT152/2026).

Tier boundaries are canonical with core/thue/tier.classify_tier:
  Nhóm 1 : ytd <= 1 ty        -> miễn thuế (VAT 0%, PIT 0%)
  Nhóm 2 : 1 ty < ytd <= 3 ty -> VAT 1%, PIT 0.5%
  Nhóm 3 : 3 ty < ytd <= 50 ty-> VAT 0.5%, PIT 0.5%
  Nhóm 4 : ytd > 50 ty        -> biểu thuế lợi nhuận (tỷ lệ đơn giản = 0)
"""
from decimal import Decimal

from app.core.thue.tax_calc import (
    classify_group,
    classify_group_strict,
    compute_tax,
    weighted_average_cost,
)


def test_classify_group_boundaries():
    assert classify_group(Decimal("2_000_000_000")) == 2
    assert classify_group(Decimal("1_000_000_000")) == 1
    assert classify_group(Decimal("999_000_000")) == 1
    assert classify_group(Decimal("100_000_000")) == 1
    assert classify_group(Decimal("99_000_000")) == 1
    # Upper tiers
    assert classify_group(Decimal("3_000_000_000")) == 2
    assert classify_group(Decimal("50_000_000_000")) == 3


def test_classify_group_strict_mien():
    # Below 1ty always Nhóm 1 (miễn thuế), regardless of opt-in.
    assert classify_group_strict(Decimal("50_000_000"), opted_in=False) == 1
    assert classify_group_strict(Decimal("50_000_000"), opted_in=True) == 1


def test_compute_tax_nhom2():
    # 2 ty -> Nhóm 2: VAT 1% = 20,000,000 ; PIT 0.5% = 10,000,000
    r = compute_tax(Decimal("2_000_000_000"))
    assert r.group == 2
    assert r.vat == Decimal("20000000.00")
    assert r.pit == Decimal("10000000.00")
    assert r.total == Decimal("30000000.00")


def test_compute_tax_nhom1_mien():
    # 500tr -> Nhóm 1 (<=1ty) miễn thuế
    r = compute_tax(Decimal("500_000_000"))
    assert r.group == 1
    assert r.vat == Decimal("0.00")
    assert r.pit == Decimal("0.00")
    assert r.total == Decimal("0.00")


def test_compute_tax_nhom2_explicit():
    r = compute_tax(Decimal("500_000_000"), group=2)
    # VAT 1% = 5,000,000 ; PIT 0.5% = 2,500,000
    assert r.vat == Decimal("5000000.00")
    assert r.pit == Decimal("2500000.00")
    assert r.total == Decimal("7500000.00")


def test_compute_tax_nhom4_zero():
    r = compute_tax(Decimal("30_000_000"), group=4)
    assert r.vat == Decimal("0.00")
    assert r.pit == Decimal("0.00")
    assert r.total == Decimal("0.00")


def test_weighted_average_cost():
    # 2 batches: 10 units @100, 10 units @200 -> 150/unit.
    assert weighted_average_cost(Decimal("3000"), Decimal("20")) == Decimal("150.0000")
    assert weighted_average_cost(Decimal("100"), Decimal("0")) == Decimal("0")
