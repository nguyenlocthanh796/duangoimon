package handler

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/websocket"
	"gorm.io/gorm"
)

type CreateCashTransactionRequest struct {
	TenantID      string  `json:"tenant_id"`
	BranchID      string  `json:"branch_id"`
	ShiftID       *string `json:"shift_id"`
	Type          string  `json:"type"`           // thu, chi
	Category      string  `json:"category"`       // chi_mua_da, chi_mua_rau_cho, chi_ung_luong, chi_mat_bang, thu_khac
	Amount        float64 `json:"amount"`
	Description   string  `json:"description"`
	PerformedBy   string  `json:"performed_by"`
	PaymentMethod string  `json:"payment_method"` // tien_mat, chuyen_khoan
	ExpenseType   string  `json:"expense_type"`   // hoat_dong, co_dinh
}

type VoidCashTransactionRequest struct {
	VoidReason string `json:"void_reason"`
	VoidedBy   string `json:"voided_by"`
}

func CreateCashTransaction(c *gin.Context) {
	var req CreateCashTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pm := req.PaymentMethod
	if pm == "" {
		pm = "tien_mat"
	}

	et := req.ExpenseType
	if et == "" && req.Type == "chi" {
		et = "hoat_dong"
	}

	tx := models.CashTransaction{
		ID:            uuid.New().String(),
		TenantID:      req.TenantID,
		BranchID:      req.BranchID,
		ShiftID:       req.ShiftID,
		Type:          req.Type,
		Category:      req.Category,
		Amount:        req.Amount,
		Description:   req.Description,
		PerformedBy:   req.PerformedBy,
		Status:        "completed",
		PaymentMethod: pm,
		ExpenseType:   et,
		CreatedAt:     time.Now(),
	}

	if database.DB != nil {
		err := database.DB.Transaction(func(dbTx *gorm.DB) error {
			if err := dbTx.Create(&tx).Error; err != nil {
				return err
			}

			// Cập nhật dòng tiền vào ca làm việc hiện tại nếu là TIỀN MẶT
			if req.ShiftID != nil && *req.ShiftID != "" && pm == "tien_mat" {
				var shift models.CashShift
				if err := dbTx.First(&shift, "id = ?", *req.ShiftID).Error; err == nil {
					if req.Type == "thu" {
						shift.TotalCashIn += req.Amount
					} else {
						shift.TotalCashOut += req.Amount
					}
					shift.ExpectedEndingCash = shift.StartingCash + shift.TotalCashSales + shift.TotalCashIn - shift.TotalCashOut
					if err := dbTx.Save(&shift).Error; err != nil {
						return err
					}
				}
			}
			return nil
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi ghi nhận sổ quỹ: %v", err)})
			return
		}
	}

	// Realtime broadcast đến dashboard chủ quán
	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":           "cash_transaction_created",
		"id":             tx.ID,
		"tx_type":        req.Type,
		"category":       req.Category,
		"amount":         req.Amount,
		"description":    req.Description,
		"payment_method": pm,
		"expense_type":   et,
	})

	c.JSON(http.StatusCreated, gin.H{
		"message":     "Đã ghi nhận phiếu thu/chi vào Sổ Quỹ Tiền Mặt Thực Tế",
		"transaction": tx,
	})
}

func VoidCashTransaction(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu mã phiếu thu/chi"})
		return
	}

	var req VoidCashTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req.VoidReason = "Chủ quán hủy phiếu"
		req.VoidedBy = "Chủ Quán"
	}
	if req.VoidReason == "" {
		req.VoidReason = "Chủ quán hủy phiếu"
	}
	if req.VoidedBy == "" {
		req.VoidedBy = "Chủ Quán"
	}

	now := time.Now()

	if database.DB != nil {
		var tx models.CashTransaction
		if err := database.DB.First(&tx, "id = ?", id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy phiếu thu/chi"})
			return
		}

		if tx.Status == "voided" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Phiếu này đã bị hủy trước đó"})
			return
		}

		err := database.DB.Transaction(func(dbTx *gorm.DB) error {
			tx.Status = "voided"
			tx.VoidReason = &req.VoidReason
			tx.VoidedBy = &req.VoidedBy
			tx.VoidedAt = &now

			if err := dbTx.Save(&tx).Error; err != nil {
				return err
			}

			// Hoàn lại dòng tiền két nếu giao dịch thuộc ca và là TIỀN MẶT
			if tx.ShiftID != nil && *tx.ShiftID != "" && (tx.PaymentMethod == "tien_mat" || tx.PaymentMethod == "") {
				var shift models.CashShift
				if err := dbTx.First(&shift, "id = ?", *tx.ShiftID).Error; err == nil {
					if tx.Type == "thu" {
						shift.TotalCashIn = max(0, shift.TotalCashIn-tx.Amount)
					} else {
						shift.TotalCashOut = max(0, shift.TotalCashOut-tx.Amount)
					}
					shift.ExpectedEndingCash = shift.StartingCash + shift.TotalCashSales + shift.TotalCashIn - shift.TotalCashOut
					if err := dbTx.Save(&shift).Error; err != nil {
						return err
					}
				}
			}
			return nil
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi hủy phiếu: %v", err)})
			return
		}
	}

	// Realtime broadcast thông báo hủy phiếu
	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":        "cash_transaction_voided",
		"id":          id,
		"void_reason": req.VoidReason,
		"voided_by":   req.VoidedBy,
		"voided_at":   now,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Đã hủy phiếu thu/chi thành công và hoàn lại dòng tiền két",
		"id":      id,
	})
}

func GetCashTransactions(c *gin.Context) {
	tenantID := GetTenantID(c, "tenant-default")
	branchID := strings.TrimSpace(c.Query("branch_id"))
	db := GetDB(c)
	var transactions []models.CashTransaction

	if db != nil {
		query := ScopeTenant(db.Model(&models.CashTransaction{}), tenantID)
		if branchID != "" && branchID != "all" && branchID != "tat_ca" {
			query = query.Where("branch_id = ?", branchID)
		}
		query.Order("created_at desc").Limit(50).Find(&transactions)
	}

	RespondSuccess(c, http.StatusOK, transactions)
}

func GetCashSummary(c *gin.Context) {
	tenantID := GetTenantID(c, "tenant-default")
	branchID := strings.TrimSpace(c.Query("branch_id"))
	db := GetDB(c)
	var totalIn float64
	var totalOut float64

	if db != nil {
		type cashSummaryResult struct {
			TotalIn  float64 `gorm:"column:total_in"`
			TotalOut float64 `gorm:"column:total_out"`
		}
		var res cashSummaryResult
		query := ScopeTenant(db.Model(&models.CashTransaction{}), tenantID).
			Where("status IS NULL OR status != 'voided'")

		if branchID != "" && branchID != "all" && branchID != "tat_ca" {
			query = query.Where("branch_id = ?", branchID)
		}

		query.Select(`
			COALESCE(SUM(CASE WHEN type = 'thu' THEN amount ELSE 0 END), 0) AS total_in,
			COALESCE(SUM(CASE WHEN type = 'chi' THEN amount ELSE 0 END), 0) AS total_out
		`).Scan(&res)

		totalIn = res.TotalIn
		totalOut = res.TotalOut
	}

	netBalance := totalIn - totalOut

	RespondSuccess(c, http.StatusOK, gin.H{
		"total_in":    totalIn,
		"total_out":   totalOut,
		"net_balance": netBalance,
	})
}
