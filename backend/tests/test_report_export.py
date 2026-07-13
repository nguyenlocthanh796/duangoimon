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


def test_build_report_empty_rows():
    rep = build_report("HKD Rong", "0000000000", [])
    assert rep.rows == []
    assert rep.totals["revenue"] == "0.00"
    assert rep.totals["total"] == "0.00"


def test_build_report_csv_module_fn():
    from app.core.thue.report_export import build_report_csv

    rows = [RevenueRow(month="2026-01", revenue=Decimal("500000000"))]
    rep = build_report("HKD", "MST", rows)
    csv_text = build_report_csv(rep, "HKD", "MST", "N1")
    assert "HKD" in csv_text
    # 500tr -> Nhóm 1 miễn thuế -> VAT 0
    assert "0.00" in csv_text


def test_build_report_pdf_returns_bytes():
    from app.core.thue.report_export import build_report_pdf

    rows = [RevenueRow(month="2026-01", revenue=Decimal("2000000000"))]
    rep = build_report("HKD", "MST", rows)
    pdf = build_report_pdf(rep, "HKD", "MST", "N2")
    # PDF must be non-empty bytes with a PDF signature
    assert isinstance(pdf, bytes)
    assert len(pdf) > 0
    assert pdf[:4] == b"%PDF"
