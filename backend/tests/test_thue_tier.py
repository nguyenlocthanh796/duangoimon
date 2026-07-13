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


def test_classify_tier_accepts_string():
    assert classify_tier("500000000") == "N1"
    assert classify_tier("2000000000") == "N2"


def test_tier_meta_structure():
    from decimal import Decimal

    from app.core.thue.tier import TIER_META

    # All 4 tiers present with required keys
    for tier in ("N1", "N2", "N3", "N4"):
        assert tier in TIER_META
        assert "label" in TIER_META[tier]
        assert "tax_method" in TIER_META[tier]
        assert "thue_suat" in TIER_META[tier]

    # N1 is tax-exempt; N4 has the highest rate
    assert TIER_META["N1"]["thue_suat"] == Decimal("0")
    assert TIER_META["N4"]["thue_suat"] == Decimal("20")
