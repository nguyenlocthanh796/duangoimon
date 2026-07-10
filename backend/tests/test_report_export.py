"""Unit tests for thuế HKD report export (TT152/2026)."""
from decimal import Decimal

from app.core.thue.report_export import RevenueRow, build_report


def test_build_report_rows_and_totals():
    # Revenues clearly in Nhóm 2 (1ty < ytd <= 3ty): 1% VAT, 0.5% PIT.
    rows = [
        RevenueRow(month="2026-01", revenue=Decimal("1500000000"), cost=Decimal("900000000")),
        RevenueRow(month="2026-02", revenue=Decimal("1200000000"), cost=Decimal("600000000")),
    ]
    rep = build_report("Tiem Tap Hoa A", "0123456789", rows)
    assert len(rep.rows) == 2
    # 1.5ty N2 -> VAT 15,000,000 + PIT 7,500,000 = 22,500,000
    assert rep.rows[0].vat == "15000000.00"
    assert rep.rows[0].pit == "7500000.00"
    assert rep.totals["revenue"] == "2700000000.00"
    assert rep.totals["vat"] == "27000000.00"
    assert rep.totals["pit"] == "13500000.00"
    assert rep.totals["total"] == "40500000.00"


def test_report_csv_contains_header_and_totals():
    rows = [RevenueRow(month="2026-01", revenue=Decimal("1500000000"))]
    csv_text = build_report("HKD", "MST", rows).to_csv()
    assert "HKD" in csv_text
    assert "MST" in csv_text
    assert "TONG" in csv_text
    assert "1500000000.00" in csv_text
