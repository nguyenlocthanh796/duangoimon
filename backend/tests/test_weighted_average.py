"""Tests for weighted-average costing (TT152 §3)."""
from decimal import Decimal

import pytest

from app.core.thue.weighted_average import weighted_avg


def test_weighted_avg_basic():
    # opening 100 @ 5000 = 500,000 ; inbound 50 @ 6000 = 300,000
    avg = weighted_avg(100, 500_000, 50, 300_000)
    # (500000 + 300000) / 150 = 800000 / 150 = 5333.333...
    expected = Decimal("800000") / Decimal("150")
    assert avg == expected


def test_weighted_avg_empty_denom_returns_zero():
    assert weighted_avg(0, 0, 0, 0) == Decimal("0")


def test_weighted_avg_no_fifo_like():
    # Sanity: weighted avg is NOT first-in-first-out.
    # opening 10 @ 1000, inbound 10 @ 9000 -> avg 5000 (not 1000, not 9000)
    avg = weighted_avg(10, 10_000, 10, 90_000)
    assert avg == Decimal("5000")


@pytest.mark.parametrize("oq,ov,iq,iv,expected", [
    (0, 0, 100, 100_000, Decimal("1000")),
    (100, 100_000, 0, 0, Decimal("1000")),
    (0, 0, 0, 0, Decimal("0")),
    (50, 250_000, 150, 1_050_000, Decimal("6500")),
])
def test_weighted_avg_parametrized(oq, ov, iq, iv, expected):
    assert weighted_avg(oq, ov, iq, iv) == expected


def test_prev_period_mid_year():
    from app.core.thue.weighted_average import _prev_period
    assert _prev_period("2024-06") == "2024-05"


def test_prev_period_year_boundary():
    from app.core.thue.weighted_average import _prev_period
    # January rolls back to December of previous year
    assert _prev_period("2024-01") == "2023-12"


def test_current_period_format():
    from app.core.thue.weighted_average import current_period
    import re
    p = current_period()
    # Must be YYYY-MM
    assert re.match(r"^\d{4}-\d{2}$", p)
