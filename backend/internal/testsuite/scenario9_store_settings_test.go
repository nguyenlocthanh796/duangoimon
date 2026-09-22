package testsuite

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ongchu/pos-backend/internal/models"
)

func TestScenario9_Store_Settings_And_Bill_Customization(t *testing.T) {
	_, router := SetupTestEnv(t)

	// 1. GET /api/v1/settings
	wGet := httptest.NewRecorder()
	reqGet, _ := http.NewRequest("GET", "/api/v1/settings", nil)
	router.ServeHTTP(wGet, reqGet)
	if wGet.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for GET settings, got %d", wGet.Code)
	}

	// 2. Cập nhật thông tin cửa hàng, ngân hàng VietQR và mẫu bill
	wUpdate := httptest.NewRecorder()
	bodyUpdate := `{
		"store_name": "Trà Sữa Ông Chủ Chi Nhánh 1",
		"slogan": "Trọn vị thanh mát — Đậm đà bản sắc!",
		"store_address": "128 Nguyễn Trãi, Phường 3, Quận 5, TP.HCM",
		"store_phone": "0908 123 456",
		"opening_hours": "07:00 - 23:00",
		"wifi_name": "OngChu_VIP_5G",
		"wifi_password": "ongchuvipkemoi",
		"bank_code": "VCB",
		"bank_name": "Vietcombank",
		"bank_account_no": "0071001234567",
		"bank_account_name": "NGUYEN VAN CHU QUAN",
		"bank_branch": "CN Bến Thành",
		"transfer_syntax": "POS [MA_DON]",
		"qr_payment_template": "compact2",
		"paper_size": "K58",
		"receipt_title": "PHIẾU THANH TOÁN TIỀN",
		"receipt_footer": "Hẹn gặp lại quý khách lần sau!",
		"print_copies": 2,
		"print_qr_on_bill": true,
		"print_wifi_on_bill": true,
		"print_cashier_on_bill": true,
		"print_barcode_on_bill": true,
		"auto_cut": false,
		"kick_drawer": true,
		"vat_rate": 8,
		"service_fee_rate": 5,
		"default_order_channel": "takeaway",
		"telegram_bot_token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
		"telegram_chat_id": "-100987654321",
		"enable_telegram_alerts": true
	}`
	reqUp, _ := http.NewRequest("PUT", "/api/v1/settings", bytes.NewBufferString(bodyUpdate))
	reqUp.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wUpdate, reqUp)
	if wUpdate.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for updating settings, got %d: %s", wUpdate.Code, wUpdate.Body.String())
	}

	var resUpdate struct {
		Data models.POSSettings `json:"data"`
	}
	_ = json.Unmarshal(wUpdate.Body.Bytes(), &resUpdate)

	s := resUpdate.Data
	if s.StoreName != "Trà Sữa Ông Chủ Chi Nhánh 1" {
		t.Errorf("Expected store name updated, got %s", s.StoreName)
	}
	if s.PaperSize != "K58" {
		t.Errorf("Expected paper size K58, got %s", s.PaperSize)
	}
	if s.BankCode != "VCB" || s.BankAccountNo != "0071001234567" {
		t.Errorf("Expected bank VCB/0071001234567, got %s/%s", s.BankCode, s.BankAccountNo)
	}
	if s.VATRate != 8 || s.ServiceFeeRate != 5 {
		t.Errorf("Expected VAT 8%%, Service 5%%, got %v / %v", s.VATRate, s.ServiceFeeRate)
	}
	if s.DefaultOrderChannel != "takeaway" {
		t.Errorf("Expected takeaway order channel, got %s", s.DefaultOrderChannel)
	}

	// 3. Test Telegram Alert test endpoint
	wTelegram := httptest.NewRecorder()
	bodyTg := `{"bot_token": "test_token", "chat_id": "test_chat"}`
	reqTg, _ := http.NewRequest("POST", "/api/v1/settings/test-telegram", bytes.NewBufferString(bodyTg))
	reqTg.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wTelegram, reqTg)
	if wTelegram.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for telegram test, got %d", wTelegram.Code)
	}
}
