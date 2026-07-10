"""Tests for HKD revenue-tier classification."""
from decimal import Decimal

import pytest

from app.core.thue.tier import classify_tier


@pytest.mark.parametrize("ytd,expected", [
    (Decimal("0"), "N1"),
    (Decimal("999999999"), "N1"),
    (Decimal("1000000000"), "N1"),          # exactly 1 ty -> N1
    (Decimal("1000000001"), "N2"),          # just over 1 ty
    (Decimal("3000000000"), "N2"),          # exactly 3 ty -> N2
    (Decimal("3000000001"), "N3"),          # just over 3 ty
    (Decimal("50000000000"), "N3"),         # exactly 50 ty -> N3
    (Decimal("50000000001"), "N4"),         # just over 50 ty
    (Decimal("999999999999"), "N4"),
])
def test_classify_tier_boundaries(ytd, expected):
    assert classify_tier(ytd) == expected


def test_classify_tier_accepts_float():
    # float must be converted safely (no rounding error at boundary)
    assert classify_tier(1_000_000_000) == "N1"
    assert classify_tier(1_000_000_001) == "N2"
