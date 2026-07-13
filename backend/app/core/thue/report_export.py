"""Báo cáo thuế HKD — xuất khẩu BC26/BC21 (TT152/2026).

Builds a monthly tax-declaration report from revenue rows and exports to
CSV or PDF. CSV uses pure stdlib; PDF uses reportlab when available, else a
minimal dependency-free PDF writer, so the export endpoint always returns a
valid file.
"""

import csv
import io
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Iterable, List

from app.core.thue.tax_calc import compute_tax


@dataclass
class RevenueRow:
    """One month of revenue for a single HKD."""

    month: str  # e.g. "2026-01"
    revenue: Decimal
    cost: Decimal = Decimal("0")  # weighted-average cost basis for the month


@dataclass
class ReportRow:
    month: str
    revenue: str
    cost: str
    vat: str
    pit: str
    total: str
    group: int


@dataclass
class TaxReport:
    hkd_name: str
    tax_code: str
    rows: List[ReportRow] = field(default_factory=list)
    totals: dict = field(default_factory=dict)

    def to_csv(self) -> str:
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["HKD", self.hkd_name, "MST", self.tax_code])
        w.writerow(["Thang", "Doanh thu", "Chi phi", "Thue GTGT", "Thue TNCN", "Tong thue", "Nhom"])
        for r in self.rows:
            w.writerow([r.month, r.revenue, r.cost, r.vat, r.pit, r.total, r.group])
        t = self.totals
        w.writerow(
            [
                "TONG",
                t.get("revenue", "0"),
                t.get("cost", "0"),
                t.get("vat", "0"),
                t.get("pit", "0"),
                t.get("total", "0"),
                "",
            ]
        )
        return buf.getvalue()


def build_report(hkd_name: str, tax_code: str, rows: Iterable[RevenueRow]) -> TaxReport:
    """Aggregate revenue rows into a TaxReport using the TT152 engine."""
    report_rows: List[ReportRow] = []
    sum_rev = Decimal("0")
    sum_cost = Decimal("0")
    sum_vat = Decimal("0")
    sum_pit = Decimal("0")
    for row in rows:
        rev = Decimal(row.revenue)
        cost = Decimal(row.cost)
        res = compute_tax(rev)
        report_rows.append(
            ReportRow(
                month=row.month,
                revenue=f"{rev:.2f}",
                cost=f"{cost:.2f}",
                vat=f"{res.vat:.2f}",
                pit=f"{res.pit:.2f}",
                total=f"{res.total:.2f}",
                group=res.group,
            )
        )
        sum_rev += rev
        sum_cost += cost
        sum_vat += res.vat
        sum_pit += res.pit
    totals = {
        "revenue": f"{sum_rev:.2f}",
        "cost": f"{sum_cost:.2f}",
        "vat": f"{sum_vat:.2f}",
        "pit": f"{sum_pit:.2f}",
        "total": f"{(sum_vat + sum_pit):.2f}",
    }
    return TaxReport(hkd_name=hkd_name, tax_code=tax_code, rows=report_rows, totals=totals)


def build_report_csv(report: TaxReport, hkd_name: str, tax_code: str, tier: str) -> str:
    """Module-level CSV builder used by the report router (P4.1)."""
    return report.to_csv()


def build_report_pdf(report: TaxReport, hkd_name: str, tax_code: str, tier: str) -> bytes:
    """Module-level PDF builder. Uses reportlab if present, else fallback."""
    try:
        import io

        from reportlab.lib import colors as rl_colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Table, TableStyle

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4)
        styles = getSampleStyleSheet()
        elems = [
            Paragraph(f"Bao cao thue HKD - {hkd_name}", styles["Title"]),
            Paragraph(f"MST: {tax_code} - Nhom: {tier}", styles["Normal"]),
        ]
        data = [["Thang", "Doanh thu", "Chi phi", "Thue GTGT", "Thue TNCN", "Tong thue", "Nhom"]]
        for r in report.rows:
            data.append([r.month, r.revenue, r.cost, r.vat, r.pit, r.total, str(r.group)])
        t = report.totals
        data.append(
            [
                "TONG",
                t.get("revenue", "0"),
                t.get("cost", "0"),
                t.get("vat", "0"),
                t.get("pit", "0"),
                t.get("total", "0"),
                "",
            ]
        )
        table = Table(data, hAlign="LEFT")
        table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.5, rl_colors.grey),
                    ("BACKGROUND", (0, 0), (-1, 0), rl_colors.HexColor("#1E3A8A")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), rl_colors.white),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                ]
            )
        )
        elems.append(table)
        doc.build(elems)
        return buf.getvalue()
    except Exception:
        return _minimal_pdf(report, hkd_name, tax_code, tier)


def _minimal_pdf(report: TaxReport, hkd_name: str, tax_code: str, tier: str) -> bytes:
    """Fallback: build a minimal valid PDF with the report text (no deps)."""
    lines = [f"Bao cao thue HKD - {hkd_name}", f"MST: {tax_code}  Nhom: {tier}", ""]
    lines.append("Thang | Doanh thu | Chi phi | GTGT | TNCN | Tong | Nhom")
    for r in report.rows:
        lines.append(
            f"{r.month} | {r.revenue} | {r.cost} | {r.vat} | {r.pit} | {r.total} | {r.group}"
        )
    t = report.totals
    lines.append(
        f"TONG | {t.get('revenue','0')} | {t.get('cost','0')} | {t.get('vat','0')} | {t.get('pit','0')} | {t.get('total','0')} |"
    )

    text = "\n".join(lines)
    objects = []
    objects.append("<< /Type /Catalog /Pages 2 0 R >>")
    objects.append("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objects.append(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"
    )
    stream = f"BT /F1 10 Tf 40 800 Td 11 TL ({_esc(text)}) Tj ET"
    objects.append(f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream")
    objects.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    pdf = b"%PDF-1.4\n"
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{i} 0 obj\n{obj}\nendobj\n".encode("latin-1")
    xref_pos = len(pdf)
    n = len(objects) + 1
    pdf += f"xref\n0 {n}\n".encode("latin-1")
    pdf += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        pdf += f"{off:010d} 00000 n \n".encode("latin-1")
    pdf += f"trailer\n<< /Size {n} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF".encode("latin-1")
    return pdf


def _esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
