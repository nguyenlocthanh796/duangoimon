package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

var sharedHTTPClient = &http.Client{
	Timeout: 5 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        10,
		MaxIdleConnsPerHost: 5,
		IdleConnTimeout:     30 * time.Second,
		DisableKeepAlives:   false,
	},
}

type TelegramAlertService struct {
	BotToken string
	ChatID   string
}

var GlobalTelegramAlert = &TelegramAlertService{
	BotToken: os.Getenv("TELEGRAM_BOT_TOKEN"),
	ChatID:   os.Getenv("TELEGRAM_CHAT_ID"),
}

func (t *TelegramAlertService) SendAlert(title string, message string, severity string) {
	if t.BotToken == "" || t.ChatID == "" {
		// Log locally if Telegram bot is not yet configured by owner
		fmt.Printf("📢 [LOCAL ALERT][%s] %s: %s\n", severity, title, message)
		return
	}

	icon := "ℹ️"
	if severity == "warning" {
		icon = "⚠️"
	} else if severity == "danger" {
		icon = "🚨 BÁO ĐỘNG GIAN LẬN"
	}

	text := fmt.Sprintf("%s *%s*\n⏱ %s\n\n%s", icon, title, time.Now().Format("15:04:05 02/01/2006"), message)

	payload := map[string]string{
		"chat_id":    t.ChatID,
		"text":       text,
		"parse_mode": "Markdown",
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", t.BotToken)
	go func() {
		req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBytes))
		if err != nil {
			log.Printf("Telegram alert new request error: %v", err)
			return
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := sharedHTTPClient.Do(req)
		if err != nil {
			log.Printf("Telegram alert send error: %v", err)
			return
		}
		if resp != nil && resp.Body != nil {
			defer resp.Body.Close()
			_, _ = io.Copy(io.Discard, resp.Body)
		}
	}()
}

// Báo động khi nhân viên hủy món sau khi đã in tạm tính
func (t *TelegramAlertService) AlertVoidAfterPrint(tableName string, itemName string, amount float64, cashierName string) {
	msg := fmt.Sprintf("• *Bàn:* %s\n• *Món hủy:* %s (%.0f đ)\n• *Thu ngân thao tác:* %s\n\n_Kiểm tra ngay xem nhân viên có thu tiền khách rồi hủy đơn không!_", tableName, itemName, amount, cashierName)
	t.SendAlert("HỦY MÓN SAU KHI IN TẠM TÍNH", msg, "danger")
}

// Báo động khi mở két tiền bằng tay không có đơn
func (t *TelegramAlertService) AlertManualDrawerKick(cashierName string) {
	msg := fmt.Sprintf("• *Thu ngân:* %s vừa bấm mở ngăn kéo đựng tiền bằng tay mà không có đơn thanh toán!", cashierName)
	t.SendAlert("MỞ KÉT TIỀN BẰNG TAY", msg, "warning")
}

// Báo cáo chênh lệch tiền khi giao ca
func (t *TelegramAlertService) AlertShiftMismatch(shiftName string, cashierName string, expected float64, actual float64, diff float64) {
	msg := fmt.Sprintf("• *Ca:* %s\n• *Thu ngân:* %s\n• *Tiền lý thuyết:* %.0f đ\n• *Tiền đếm thực tế:* %.0f đ\n• *Chênh lệch:* %+.0f đ", shiftName, cashierName, expected, actual, diff)
	severity := "warning"
	if diff < -50000 {
		severity = "danger"
	}
	t.SendAlert("KẾT CA BỊ LỆCH TIỀN MẶT", msg, severity)
}

// SendTelegramCustomAlert gửi tin nhắn trực tiếp với BotToken và ChatID chỉ định
func SendTelegramCustomAlert(botToken string, chatID string, message string) {
	if botToken == "" || chatID == "" {
		return
	}
	service := TelegramAlertService{BotToken: botToken, ChatID: chatID}
	service.SendAlert("THÔNG BÁO TỪ HỆ THỐNG", message, "info")
}

