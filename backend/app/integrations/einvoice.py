"""E-invoice client: Viettel HDDT + VNPT + MISA.

Usage:
    from app.integrations.einvoice import ViettelClient, InvoiceData

    client = ViettelClient(username="xxx", password="yyy", supplier_tax_code="0123456789")
    result = await client.publish(InvoiceData(...))

ponytail: needs real API credentials + supplier registration.
Add when e-invoice service is contracted.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class InvoiceLine:
    """Single line in an e-invoice."""
    product_code: str
    product_name: str
    unit: str = "phần"
    quantity: float = 1
    unit_price: float = 0
    total: float = 0
    vat_rate: int = 8  # 8% or 10%
    vat_amount: float = 0


@dataclass
class InvoiceData:
    """Data required for a Vietnamese e-invoice."""
    buyer_name: str
    buyer_tax_code: str = ""
    buyer_address: str = ""
    buyer_phone: str = ""
    lines: list[InvoiceLine] = field(default_factory=list)
    total: float = 0
    vat_amount: float = 0
    grand_total: float = 0
    payment_method: str = "TM"  # TM = cash, CK = transfer
    note: str = ""


class ViettelClient:
    """Viettel HDDT (Hoa don dien tu) client.
    
    API docs: https://hddt.viettel.vn/
    """
    
    def __init__(
        self,
        username: str,
        password: str,
        supplier_tax_code: str,
        base_url: str = "https://api.hddt.viettel.vn",
    ):
        self.username = username
        self.password = password
        self.supplier_tax_code = supplier_tax_code
        self.base_url = base_url
        self._token: str | None = None

    async def _login(self) -> str:
        """Authenticate with Viettel API and get token."""
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/auth/login",
                json={
                    "username": self.username,
                    "password": self.password,
                    "supplierTaxCode": self.supplier_tax_code,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            self._token = data.get("accessToken", "")
            return self._token

    async def publish(self, invoice: InvoiceData) -> dict:
        """Publish an e-invoice. Returns result with invoice_number."""
        if not self._token:
            await self._login()

        import httpx
        async with httpx.AsyncClient() as client:
            payload = self._build_payload(invoice)
            resp = await client.post(
                f"{self.base_url}/api/invoice/v1/publish",
                headers={"Authorization": f"Bearer {self._token}"},
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_status(self, invoice_number: str) -> dict:
        """Check invoice status (issued/cancelled)."""
        if not self._token:
            await self._login()
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/api/invoice/v1/{invoice_number}/status",
                headers={"Authorization": f"Bearer {self._token}"},
            )
            resp.raise_for_status()
            return resp.json()

    async def cancel(self, invoice_number: str, reason: str) -> dict:
        """Cancel an e-invoice."""
        if not self._token:
            await self._login()
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/api/invoice/v1/cancel",
                headers={"Authorization": f"Bearer {self._token}"},
                json={"invoiceNumber": invoice_number, "reason": reason},
            )
            resp.raise_for_status()
            return resp.json()

    def _build_payload(self, inv: InvoiceData) -> dict:
        """Build Viettel API request body from InvoiceData."""
        lines = []
        for i, line in enumerate(inv.lines, 1):
            lines.append({
                "lineNumber": i,
                "productCode": line.product_code,
                "productName": line.product_name,
                "unit": line.unit,
                "quantity": line.quantity,
                "unitPrice": line.unit_price,
                "total": line.total,
                "vatRate": line.vat_rate,
                "vatAmount": line.vat_amount,
            })
        return {
            "supplierTaxCode": self.supplier_tax_code,
            "invoiceTemplate": "01GTKT0/001",  # standard VAT invoice
            "invoiceSeries": "AA/24E",  # series for current year
            "buyerName": inv.buyer_name,
            "buyerTaxCode": inv.buyer_tax_code,
            "buyerAddress": inv.buyer_address,
            "buyerPhone": inv.buyer_phone,
            "lines": lines,
            "total": inv.total,
            "vatAmount": inv.vat_amount,
            "grandTotal": inv.grand_total,
            "paymentMethod": inv.payment_method,
            "note": inv.note,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }


class VNPTClient:
    """VNPT E-invoice client stub."""
    
    def __init__(self, username: str, password: str, base_url: str = "https://einvoice.vnpt.vn"):
        self.username = username
        self.password = password
        self.base_url = base_url

    async def publish(self, invoice: InvoiceData) -> dict:
        raise NotImplementedError("VNPT e-invoice — add when contracted")


class MISAClient:
    """MISA e-invoice client stub."""
    
    def __init__(self, api_key: str, base_url: str = "https://api.misa.com"):
        self.api_key = api_key
        self.base_url = base_url

    async def publish(self, invoice: InvoiceData) -> dict:
        raise NotImplementedError("MISA e-invoice — add when contracted")
