package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/service"
	"github.com/ongchu/pos-backend/internal/websocket"
)

// GetSettings lấy cấu hình cửa hàng, ngân hàng và mẫu bill
func GetSettings(c *gin.Context) {
	db := GetDB(c)
	if db == nil {
		c.JSON(http.StatusOK, gin.H{"data": models.POSSettings{
			StoreName:    "Quán Chè Bưởi",
			StoreAddress: "Trụ sở chính",
			StorePhone:   "0392387165",
			PaperSize:    "K80",
			BankName:     "MBBank Quân Đội",
		}})
		return
	}

	tenantID := GetTenantID(c, "tenant_ongchu")

	var settings models.POSSettings
	if err := ScopeTenant(db, tenantID).First(&settings).Error; err != nil {
		// Tạo bản ghi mặc định nếu chưa có
		settings = models.POSSettings{
			ID:                    uuid.New().String(),
			TenantID:              CanonicalTenantID(tenantID),
			BranchID:              "branch_01",
			StoreName:             "Cửa Hàng F&B",
			StoreAddress:          "Việt Nam",
			StorePhone:            "",
			Slogan:                "Vị Ngon Tròn Đầy",
			OpeningHours:          "07:00 - 22:30",
			WifiName:              "",
			WifiPassword:          "",
			Website:               "",
			FacebookPage:          "",
			BankCode:              "MB",
			BankName:              "MBBank Quân Đội",
			BankAccountNo:         "",
			BankAccountName:       "",
			BankBranch:            "",
			TransferSyntax:        "[MA_DON]",
			QRPaymentTemplate:     "compact2",
			SoundboxProvider:      "mbbank",
			MBSoundboxEnabled:     false,
			MBSoundboxID:          "",
			MBMerchantID:          "",
			MBRefPrefix:           "HD",
			MBRawQRString:         "",
			ReceiptTitle:          "HÓA ĐƠN THANH TOÁN",
			ReceiptFooter:         "Cảm ơn Quý khách & Hẹn gặp lại!",
			PrinterIP:             "192.168.1.200",
			PrinterPort:           9100,
			PaperSize:             "K80",
			PrintCopies:           1,
			PrintQROnBill:         true,
			PrintWifiOnBill:       true,
			PrintCashierOnBill:    true,
			PrintItemNoteOnBill:   true,
			PrintBarcodeOnBill:    true,
			AutoCut:               true,
			KickDrawer:            true,
			VATRate:               0,
			ServiceFeeRate:        0,
			DefaultOrderChannel:   "dine_in",
			AutoPrintOnPayment:    true,
			RequireTableSelection: true,
			AllowNegativeStock:    true,
			RequirePinForVoid:     true,
			HighDiscountThreshold: 20,
			KDSAutoCleanupMinutes: 30,
			CFDWelcomeMessage:     "Kính Chào Quý Khách!",
			CreatedAt:             time.Now(),
			UpdatedAt:             time.Now(),
		}
		_ = db.Create(&settings)
	}

	c.JSON(http.StatusOK, gin.H{"data": settings})
}

// UpdateSettings cập nhật cấu hình hệ thống
func UpdateSettings(c *gin.Context) {
	var input models.POSSettings
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := GetDB(c)
	if db == nil {
		c.JSON(http.StatusOK, gin.H{"data": input, "message": "Đã cập nhật cài đặt"})
		return
	}

	fallbackTenant := input.TenantID
	if fallbackTenant == "" {
		fallbackTenant = "tenant_ongchu"
	}
	tenantID := CanonicalTenantID(GetTenantID(c, fallbackTenant))

	var settings models.POSSettings
	if err := ScopeTenant(db, tenantID).First(&settings).Error; err != nil {
		// Tạo mới
		input.ID = uuid.New().String()
		input.TenantID = tenantID
		if input.BranchID == "" {
			input.BranchID = "branch_01"
		}
		input.CreatedAt = time.Now()
		input.UpdatedAt = time.Now()
		if err := db.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		settings = input
	} else {
		// Cập nhật các trường
		input.ID = settings.ID
		input.TenantID = settings.TenantID
		if input.BranchID == "" {
			input.BranchID = settings.BranchID
		}
		input.CreatedAt = settings.CreatedAt
		input.UpdatedAt = time.Now()
		if err := db.Save(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		settings = input
	}

	websocket.GlobalHub.BroadcastToTenant(tenantID, "settings_updated", settings)
	c.JSON(http.StatusOK, gin.H{"data": settings, "message": "Cập nhật cài đặt thành công"})
}

// TestTelegramAlert gửi tin nhắn kiểm thử bot Telegram
func TestTelegramAlert(c *gin.Context) {
	var req struct {
		BotToken string `json:"bot_token"`
		ChatID   string `json:"chat_id"`
	}
	_ = c.ShouldBindJSON(&req)

	if req.BotToken == "" || req.ChatID == "" {
		// Lấy từ settings nếu không gửi kèm
		if database.DB != nil {
			var s models.POSSettings
			if err := database.DB.First(&s).Error; err == nil {
				if req.BotToken == "" {
					req.BotToken = s.TelegramBotToken
				}
				if req.ChatID == "" {
					req.ChatID = s.TelegramChatID
				}
			}
		}
	}

	if req.BotToken == "" || req.ChatID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vui lòng nhập Bot Token và Chat ID"})
		return
	}

	// Gửi tin nhắn kiểm thử bất đồng bộ
	msg := fmt.Sprintf("👑 <b>OngChu POS Anti-Fraud Alert</b>\n\n✅ Kết nối Bot Telegram thành công!\nHệ thống sẵn sàng gửi cảnh báo gian lận cho Chủ Quán.\n\n⏱️ Thời gian: %s", time.Now().Format("15:04:05 02/01/2006"))
	go service.SendTelegramCustomAlert(req.BotToken, req.ChatID, msg)

	c.JSON(http.StatusOK, gin.H{"message": "Đã gửi lệnh kiểm thử Bot Telegram"})
}
