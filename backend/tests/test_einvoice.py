"""Unit tests for e-invoice integration (Viettel payload builder + CRP stub)."""
import pytest


class TestInvoiceDataclasses:
    def test_invoice_line_defaults(self):
        from app.integrations.einvoice import InvoiceLine

        line = InvoiceLine(product_code="P1", product_name="Cà phê")
        assert line.unit == "phần"
        assert line.vat_rate == 8

    def test_invoice_data_defaults(self):
        from app.integrations.einvoice import InvoiceData

        inv = InvoiceData(buyer_name="Nguyễn Văn A")
        assert inv.lines == []
        assert inv.payment_method == "TM"


class TestViettelPayload:
    def test_build_payload_structure(self):
        from app.integrations.einvoice import InvoiceData, InvoiceLine, ViettelClient

        client = ViettelClient(username="u", password="p", supplier_tax_code="0123456789")
        inv = InvoiceData(
            buyer_name="Công ty X",
            buyer_tax_code="0987654321",
            lines=[
                InvoiceLine(
                    product_code="SP1",
                    product_name="Trà sữa",
                    quantity=2,
                    unit_price=25000,
                    total=50000,
                    vat_rate=8,
                    vat_amount=4000,
                )
            ],
            total=50000,
            vat_amount=4000,
            grand_total=54000,
        )
        payload = client._build_payload(inv)
        assert payload["supplierTaxCode"] == "0123456789"
        assert payload["buyerName"] == "Công ty X"
        assert len(payload["lines"]) == 1
        assert payload["lines"][0]["lineNumber"] == 1
        assert payload["lines"][0]["productCode"] == "SP1"
        assert payload["grandTotal"] == 54000
        assert "createdAt" in payload

    def test_build_payload_empty_lines(self):
        from app.integrations.einvoice import InvoiceData, ViettelClient

        client = ViettelClient(username="u", password="p", supplier_tax_code="0123456789")
        payload = client._build_payload(InvoiceData(buyer_name="X"))
        assert payload["lines"] == []


class TestCashRegisterClient:
    async def test_issue_returns_accepted(self):
        from app.integrations.einvoice import CashRegisterInvoiceClient

        client = CashRegisterInvoiceClient()
        result = await client.issue("M23-000001", {"order_id": "abc"})
        assert result["status"] == "accepted"
        assert result["tax_auth_status"] == "da_tiep_nhan"
        assert result["invoice_code"] == "M23-000001"

    async def test_adjust_references_original(self):
        from app.integrations.einvoice import CashRegisterInvoiceClient

        client = CashRegisterInvoiceClient()
        result = await client.adjust("M23-000002", "M23-000001", {})
        # NĐ70: adjustment references the original, never cancels it
        assert result["adjustment_of"] == "M23-000001"
        assert result["status"] == "accepted"

    async def test_get_status(self):
        from app.integrations.einvoice import CashRegisterInvoiceClient

        client = CashRegisterInvoiceClient()
        result = await client.get_status("M23-000001")
        assert result["status"] == "accepted"


class TestStubClients:
    async def test_vnpt_not_implemented(self):
        from app.integrations.einvoice import InvoiceData, VNPTClient

        client = VNPTClient(username="u", password="p")
        with pytest.raises(NotImplementedError):
            await client.publish(InvoiceData(buyer_name="X"))

    async def test_misa_not_implemented(self):
        from app.integrations.einvoice import InvoiceData, MISAClient

        client = MISAClient(api_key="k")
        with pytest.raises(NotImplementedError):
            await client.publish(InvoiceData(buyer_name="X"))
