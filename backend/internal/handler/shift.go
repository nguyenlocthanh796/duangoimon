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

type OpenShiftRequest struct {
	TenantID     string  `json:"tenant_id"`
	BranchID     string  `json:"branch_id"`
	CashierID    string  `json:"cashier_id"`
	CashierName  string  `json:"cashier_name"`
	ShiftName    string  `json:"shift_name"`    // Ca Sáng, Ca Chiều, Ca Tối
	StartingCash float64 `json:"starting_cash"` // Tiền lẻ có sẵn đầu ca
	Note         string  `json:"note"`
}

func OpenShift(c *gin.Context) {
	var req OpenShiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	shiftID := uuid.New().String()
	shift := models.CashShift{
		ID:                 shiftID,
		TenantID:           req.TenantID,
		BranchID:           req.BranchID,
		CashierID:          req.CashierID,
		CashierName:        req.CashierName,
		ShiftName:          req.ShiftName,
		StartingCash:       req.StartingCash,
		TotalCashSales:     0,
		TotalVietQRSales:   0,
		TotalCashIn:        0,
		TotalCashOut:       0,
		ExpectedEndingCash: req.StartingCash,
		ActualEndingCash:   0,
		DifferenceAmount:   0,
		Status:             "dang_mo",
		Note:               req.Note,
		OpenedAt:           time.Now(),
	}

	if database.DB != nil {
		database.DB.Create(&shift)
	}

	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":          "shift_opened",
		"shift_id":      shiftID,
		"cashier_name":  req.CashierName,
		"shift_name":    req.ShiftName,
		"starting_cash": req.StartingCash,
	})

	c.JSON(http.StatusCreated, gin.H{
		"message": "Đã mở ca làm việc thành công",
		"shift":   shift,
	})
}

type CloseShiftRequest struct {
	ActualEndingCash float64 `json:"actual_ending_cash"` // Số tiền mặt thu ngân đếm thực tế trong két
	Note             string  `json:"note"`
}

func CloseShift(c *gin.Context) {
	shiftID := c.Param("id")
	var req CloseShiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var shift models.CashShift
	if database.DB != nil {
		if err := database.DB.First(&shift, "id = ?", shiftID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy ca làm việc"})
			return
		}

		now := time.Now()
		// Tính tổng doanh thu tiền mặt và VietQR thực tế phát sinh trong ca
		var cashSales float64
		var vietqrSales float64

		database.DB.Model(&models.Order{}).
			Where("shift_id = ? AND status = 'da_thanh_toan' AND payment_method = 'tien_mat'", shiftID).
			Select("COALESCE(SUM(total_amount), 0)").Scan(&cashSales)

		database.DB.Model(&models.Order{}).
			Where("shift_id = ? AND status = 'da_thanh_toan' AND payment_method = 'chuyen_khoan_vietqr'", shiftID).
			Select("COALESCE(SUM(total_amount), 0)").Scan(&vietqrSales)

		shift.TotalCashSales = cashSales
		shift.TotalVietQRSales = vietqrSales
		shift.ExpectedEndingCash = shift.StartingCash + cashSales + shift.TotalCashIn - shift.TotalCashOut
		shift.ActualEndingCash = req.ActualEndingCash
		shift.DifferenceAmount = req.ActualEndingCash - shift.ExpectedEndingCash
		shift.Status = "da_dong"
		shift.ClosedAt = &now
		if req.Note != "" {
			shift.Note = req.Note
		}

		database.DB.Save(&shift)

		// 📢 Gửi báo động Telegram trực tiếp cho Chủ Quán nếu phát hiện lệch két
		if shift.DifferenceAmount != 0 {
			service.GlobalTelegramAlert.AlertShiftMismatch(shift.ShiftName, shift.CashierName, shift.ExpectedEndingCash, shift.ActualEndingCash, shift.DifferenceAmount)

			severity := "warning"
			if shift.DifferenceAmount < -50000 {
				severity = "danger"
			}
			auditLog := models.AuditLog{
				ID:          uuid.New().String(),
				TenantID:    shift.TenantID,
				BranchID:    shift.BranchID,
				Action:      "lech_ket_giao_ca",
				PerformedBy: shift.CashierName,
				Details:     fmt.Sprintf("Ca %s bị lệch tiền mặt: %+.0f đ (Lý thuyết: %.0f đ, Thực tế: %.0f đ)", shift.ShiftName, shift.DifferenceAmount, shift.ExpectedEndingCash, shift.ActualEndingCash),
				Severity:    severity,
				CreatedAt:   now,
			}
			database.DB.Create(&auditLog)
		}
	}

	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":              "shift_closed",
		"shift_id":          shiftID,
		"cashier_name":      shift.CashierName,
		"difference_amount": shift.DifferenceAmount,
		"expected_cash":     shift.ExpectedEndingCash,
		"actual_cash":       shift.ActualEndingCash,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Đã kết ca & đối soát két tiền mặt thành công",
		"shift":   shift,
	})
}

func GetCurrentShift(c *gin.Context) {
	tenantID := GetTenantID(c, "default")
	branchID := c.DefaultQuery("branch_id", "default")

	var shift models.CashShift
	if database.DB != nil {
		query := ScopeTenant(database.DB.Where("status = 'dang_mo'"), tenantID)
		if branchID != "" && branchID != "default" {
			query = query.Where("branch_id = ?", branchID)
		}
		err := query.Order("opened_at desc").First(&shift).Error
		if err != nil {
			RespondSuccess(c, http.StatusOK, gin.H{"active_shift": nil})
			return
		}
	}

	RespondSuccess(c, http.StatusOK, gin.H{"active_shift": shift})
}

// GetShiftHistory lấy danh sách lịch sử ca làm việc thực tế từ CSDL
func GetShiftHistory(c *gin.Context) {
	tenantID := GetTenantID(c)
	branchID := c.Query("branch_id")

	var shifts []models.CashShift
	if database.DB != nil {
		query := ScopeTenant(database.DB, tenantID)
		if branchID != "" && branchID != "default" {
			query = query.Where("branch_id = ?", branchID)
		}
		query.Order("opened_at desc").Limit(50).Find(&shifts)
	}

	RespondSuccess(c, http.StatusOK, gin.H{"shifts": shifts})
}
