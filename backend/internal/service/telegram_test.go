package service

import (
	"testing"
)

func TestTelegramAlertServiceLocal(t *testing.T) {
	svc := &TelegramAlertService{
		BotToken: "",
		ChatID:   "",
	}

	// Calling alerts with empty config logs locally without error or panic
	svc.SendAlert("TEST", "Test message", "info")
	svc.AlertVoidAfterPrint("Bàn 01", "Trà Sữa", 35000, "Thu Ngân A")
	svc.AlertManualDrawerKick("Thu Ngân B")
	svc.AlertShiftMismatch("Ca Sáng", "Thu Ngân C", 1000000, 900000, -100000)
}

func TestSharedHTTPClientConfiguration(t *testing.T) {
	if sharedHTTPClient == nil {
		t.Fatal("sharedHTTPClient should not be nil")
	}
	if sharedHTTPClient.Timeout == 0 {
		t.Error("sharedHTTPClient timeout should be set")
	}
}
