package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/websocket"
)

type CreateExpenseRequest struct {
	TenantID   string  `json:"tenant_id"`
	BranchID   string  `json:"branch_id"`
	Title      string  `json:"title" binding:"required"`
	Category   string  `json:"category" binding:"required"`
	Amount     float64 `json:"amount" binding:"required"`
	Frequency  string  `json:"frequency"` // monthly, weekly, daily, yearly
	DueDay     int     `json:"due_day"`
	AutoRecord bool    `json:"auto_record"`
}

type RecordExpenseRequest struct {
	ShiftID     *string `json:"shift_id"`
	PerformedBy string  `json:"performed_by"`
	Note        string  `json:"note"`
}

// GetRecurringExpenses danh sách các khoản chi phí định kỳ của quán
func GetRecurringExpenses(c *gin.Context) {
	if database.DB == nil {
		RespondSuccess(c, http.StatusOK, gin.H{"data": []models.RecurringExpense{}})
		return
	}

	tenantID := GetTenantID(c)
	var expenses []models.RecurringExpense
	query := ScopeTenant(database.DB.Where("is_active = ?", true), tenantID)
	if err := query.Order("due_day asc, created_at desc").Find(&expenses).Error; err != nil {
		RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	RespondSuccess(c, http.StatusOK, gin.H{
		"data":  expenses,
		"count": len(expenses),
	})
}

// CreateRecurringExpense thêm chi phí định kỳ mới
func CreateRecurringExpense(c *gin.Context) {
	var req CreateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondError(c, http.StatusBadRequest, err.Error())
		return
	}

	if req.TenantID == "" {
		req.TenantID = GetTenantID(c, "tenant-default")
	}
	if req.BranchID == "" {
		req.BranchID = "branch-default"
	}
	if req.Frequency == "" {
		req.Frequency = "monthly"
	}
	if req.DueDay <= 0 {
		req.DueDay = 1
	}

	expense := models.RecurringExpense{
		ID:         uuid.New().String(),
		TenantID:   req.TenantID,
		BranchID:   req.BranchID,
		Title:      req.Title,
		Category:   req.Category,
		Amount:     req.Amount,
		Frequency:  req.Frequency,
		DueDay:     req.DueDay,
		AutoRecord: req.AutoRecord,
		IsActive:   true,
		CreatedAt:  time.Now(),
	}

	if database.DB != nil {
		if err := database.DB.Create(&expense).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	websocket.GlobalHub.BroadcastToTenant(expense.TenantID, "expense_created", expense)
	c.JSON(http.StatusCreated, gin.H{"data": expense, "message": "Thêm chi phí định kỳ thành công"})
}

// UpdateRecurringExpense cập nhật chi phí định kỳ
func UpdateRecurringExpense(c *gin.Context) {
	id := c.Param("id")
	var req CreateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã cập nhật chi phí"})
		return
	}

	var expense models.RecurringExpense
	if err := database.DB.First(&expense, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy chi phí định kỳ"})
		return
	}

	expense.Title = req.Title
	expense.Category = req.Category
	expense.Amount = req.Amount
	expense.Frequency = req.Frequency
	expense.DueDay = req.DueDay
	expense.AutoRecord = req.AutoRecord

	if err := database.DB.Save(&expense).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(expense.TenantID, "expense_updated", expense)
	c.JSON(http.StatusOK, gin.H{"data": expense, "message": "Cập nhật chi phí thành công"})
}

// DeleteRecurringExpense xóa chi phí định kỳ
func DeleteRecurringExpense(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã xóa chi phí"})
		return
	}

	var expense models.RecurringExpense
	if err := database.DB.First(&expense, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy chi phí"})
		return
	}

	if err := database.DB.Model(&models.RecurringExpense{}).Where("id = ?", id).Update("is_active", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(expense.TenantID, "expense_deleted", gin.H{"id": id})
	c.JSON(http.StatusOK, gin.H{"message": "Đã xóa chi phí định kỳ"})
}

// RecordRecurringExpenseToCash ghi nhận chi phí vào Sổ Quỹ Tiền Mặt 1-chạm
func RecordRecurringExpenseToCash(c *gin.Context) {
	id := c.Param("id")
	var req RecordExpenseRequest
	_ = c.ShouldBindJSON(&req)

	if req.PerformedBy == "" {
		req.PerformedBy = "Chủ Quán"
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã ghi sổ quỹ"})
		return
	}

	var expense models.RecurringExpense
	if err := database.DB.First(&expense, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy khoản chi phí"})
		return
	}

	desc := fmt.Sprintf("Chi phí định kỳ: %s", expense.Title)
	if req.Note != "" {
		desc += fmt.Sprintf(" (%s)", req.Note)
	}

	tx := models.CashTransaction{
		ID:          uuid.New().String(),
		TenantID:    expense.TenantID,
		BranchID:    expense.BranchID,
		ShiftID:     req.ShiftID,
		Type:        "chi",
		Category:    expense.Category,
		Amount:      expense.Amount,
		Description: desc,
		PerformedBy: req.PerformedBy,
		CreatedAt:   time.Now(),
	}

	if err := database.DB.Create(&tx).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(tx.TenantID, "cash_transaction_created", tx)
	c.JSON(http.StatusCreated, gin.H{
		"data":    tx,
		"message": fmt.Sprintf("Đã ghi nhận %s vào Sổ Quỹ thành công", expense.Title),
	})
}
