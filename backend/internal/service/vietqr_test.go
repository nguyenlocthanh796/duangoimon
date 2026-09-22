package service

import (
	"strings"
	"testing"
)

func TestGenerateVietQRQuickLink(t *testing.T) {
	link := GenerateVietQRQuickLink("MBBank", "0987654321", "NGUYEN LOC THANH", 135000, "HD-12345")

	if !strings.Contains(link, "MBBank-0987654321-compact2.png") {
		t.Errorf("QuickLink does not contain bank and account number: %s", link)
	}
	if !strings.Contains(link, "amount=135000") {
		t.Errorf("QuickLink does not contain expected amount 135000: %s", link)
	}
	if !strings.Contains(link, "addInfo=TT+HD-12345") && !strings.Contains(link, "TT%20HD-12345") {
		t.Errorf("QuickLink does not contain order code: %s", link)
	}
}

func TestGenerateVietQREMVCo(t *testing.T) {
	emv := GenerateVietQREMVCo("970422", "0987654321", 135000, "HD-12345")

	// Verify EMVCo tags
	if !strings.HasPrefix(emv, "000201010212") {
		t.Errorf("EMVCo missing standard prefix: %s", emv)
	}
	if !strings.Contains(emv, "5303704") {
		t.Errorf("EMVCo missing currency 704 (VND): %s", emv)
	}
	if !strings.Contains(emv, "5406135000") {
		t.Errorf("EMVCo missing amount tag 54: %s", emv)
	}
	if !strings.Contains(emv, "5802VN") {
		t.Errorf("EMVCo missing country code VN: %s", emv)
	}
	if !strings.Contains(emv, "6304") {
		t.Errorf("EMVCo missing CRC tag 63: %s", emv)
	}
}

func TestGenerateMBSoundboxDynamicQR(t *testing.T) {
	// Sample user hardware Soundbox ID and merchant ID
	merchantID := "VQRQAIPRU1176"
	soundboxID := "VQRLOAMB20260428110925582"
	refPrefix := "NPS6869"

	qr := GenerateMBSoundboxDynamicQR(merchantID, soundboxID, refPrefix, 45000, "HD001")

	if !strings.HasPrefix(qr, "000201010212") {
		t.Errorf("Expected dynamic QR prefix 000201010212, got %s", qr)
	}
	if !strings.Contains(qr, "970422") {
		t.Errorf("Expected MB BIN 970422, got %s", qr)
	}
	if !strings.Contains(qr, merchantID) {
		t.Errorf("Expected merchant ID %s in QR, got %s", merchantID, qr)
	}
	if !strings.Contains(qr, soundboxID) {
		t.Errorf("Expected soundbox ID %s in QR, got %s", soundboxID, qr)
	}
	if !strings.Contains(qr, "540545000") {
		t.Errorf("Expected amount tag 540545000 in QR, got %s", qr)
	}
	if !strings.HasSuffix(qr, "FB8D") {
		t.Errorf("Expected exact CCITT CRC FB8D, got %s", qr[len(qr)-4:])
	}
}

