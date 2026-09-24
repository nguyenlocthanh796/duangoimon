package handler

import (
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/websocket"
	"gorm.io/gorm"
)

type CreateStaffRequest struct {
	TenantID               string  `json:"tenant_id"`
	BranchID               string  `json:"branch_id"`
	Name                   string  `json:"name" binding:"required"`
	Phone                  string  `json:"phone" binding:"required"`
	Role                   string  `json:"role"`
	WageType               string  `json:"wage_type"` // hourly, monthly, per_shift
	WageRate               float64 `json:"wage_rate" binding:"required"`
	Allowance              float64 `json:"allowance"`
	OvertimeRateMultiplier float64 `json:"overtime_rate_multiplier"`
}

type ClockInRequest struct {
	ShiftType string `json:"shift_type"` // ca_sang, ca_chieu, ca_toi, ca_gay
	TimeStr   string `json:"time_str"`   // HH:mm (optional)
}

type ClockOutRequest struct {
	TimeStr string `json:"time_str"` // HH:mm (optional)
	Note    string `json:"note"`
}

type ManualShiftRequest struct {
	ShiftType     string  `json:"shift_type" binding:"required"`
	WorkDate      string  `json:"work_date" binding:"required"`
	RegularHours  float64 `json:"regular_hours"`
	OvertimeHours float64 `json:"overtime_hours"`
	Note          string  `json:"note"`
}

type StaffAdvanceRequest struct {
	Amount     float64 `json:"amount" binding:"required"`
	Reason     string  `json:"reason"`
	CreateCash bool    `json:"create_cash_tx"` // Tự động tạo phiếu chi Sổ Quỹ
	ShiftID    *string `json:"shift_id"`
}

type PaySalaryRequest struct {
	PeriodMonth int     `json:"period_month"`
	PeriodYear  int     `json:"period_year"`
	Bonus       float64 `json:"bonus"`
	Deductions  float64 `json:"deductions"`
	PaidBy      string  `json:"paid_by"`
	ShiftID     *string `json:"shift_id"`
}

// GetStaff lấy danh sách nhân viên
func GetStaff(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"data": []models.Staff{}})
		return
	}

	tenantID := GetTenantID(c)

	var staffList []models.Staff
	query := ScopeTenant(database.DB.Where("is_active = ?", true), tenantID)

	if err := query.Preload("Shifts").Preload("Advances").Order("created_at desc").Find(&staffList).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  staffList,
		"count": len(staffList),
	})
}

// CreateStaff thêm nhân viên mới
func CreateStaff(c *gin.Context) {
	var req CreateStaffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := GetTenantID(c)
	if tenantID == "" {
		tenantID = req.TenantID
	}
	if tenantID == "" {
		tenantID = "tenant-default"
	}

	if req.BranchID == "" {
		req.BranchID = c.GetHeader("X-Branch-ID")
	}
	if req.BranchID == "" {
		req.BranchID = "branch-default"
	}
	if req.Role == "" {
		req.Role = "phuc_vu"
	}
	if req.WageType == "" {
		req.WageType = "hourly"
	}
	if req.OvertimeRateMultiplier <= 0 {
		req.OvertimeRateMultiplier = 1.5
	}

	staff := models.Staff{
		ID:                     uuid.New().String(),
		TenantID:               tenantID,
		BranchID:               req.BranchID,
		Name:                   req.Name,
		Phone:                  req.Phone,
		Role:                   req.Role,
		WageType:               req.WageType,
		WageRate:               req.WageRate,
		Allowance:              req.Allowance,
		OvertimeRateMultiplier: req.OvertimeRateMultiplier,
		IsActive:               true,
		CreatedAt:              time.Now(),
		UpdatedAt:              time.Now(),
	}

	if database.DB != nil {
		if err := database.DB.Create(&staff).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	websocket.GlobalHub.BroadcastToTenant(staff.TenantID, "staff_updated", staff)
	c.JSON(http.StatusCreated, gin.H{"data": staff, "message": "Thêm nhân viên thành công"})
}

// UpdateStaff cập nhật thông tin nhân sự
func UpdateStaff(c *gin.Context) {
	id := c.Param("id")
	var req CreateStaffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã cập nhật nhân viên"})
		return
	}

	tenantID := GetTenantID(c)
	var staff models.Staff
	query := database.DB.Where("id = ?", id)
	if tenantID != "" {
		query = query.Where("tenant_id = ?", tenantID)
	}
	if err := query.First(&staff).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhân viên thuộc quán này"})
		return
	}

	staff.Name = req.Name
	staff.Phone = req.Phone
	staff.Role = req.Role
	staff.WageType = req.WageType
	staff.WageRate = req.WageRate
	staff.Allowance = req.Allowance
	if req.OvertimeRateMultiplier > 0 {
		staff.OvertimeRateMultiplier = req.OvertimeRateMultiplier
	}
	staff.UpdatedAt = time.Now()

	if err := database.DB.Save(&staff).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(staff.TenantID, "staff_updated", staff)
	c.JSON(http.StatusOK, gin.H{"data": staff, "message": "Cập nhật nhân viên thành công"})
}

// DeleteStaff vô hiệu hóa nhân viên
func DeleteStaff(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã xóa nhân viên"})
		return
	}

	tenantID := GetTenantID(c)
	var staff models.Staff
	query := database.DB.Where("id = ?", id)
	if tenantID != "" {
		query = query.Where("tenant_id = ?", tenantID)
	}
	if err := query.First(&staff).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhân viên thuộc quán này"})
		return
	}

	if err := database.DB.Model(&models.Staff{}).Where("id = ? AND tenant_id = ?", id, staff.TenantID).Update("is_active", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(staff.TenantID, "staff_deleted", gin.H{"id": id})
	c.JSON(http.StatusOK, gin.H{"message": "Đã vô hiệu hóa nhân viên thành công"})
}

// ClockInStaff chấm công vào ca
func ClockInStaff(c *gin.Context) {
	staffID := c.Param("id")
	var req ClockInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req.ShiftType = "ca_sang"
	}
	if req.ShiftType == "" {
		req.ShiftType = "ca_sang"
	}

	tenantID := GetTenantID(c)
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã chấm công"})
		return
	}

	var staff models.Staff
	query := database.DB.Where("id = ?", staffID)
	if tenantID != "" {
		query = query.Where("tenant_id = ?", tenantID)
	}
	if err := query.First(&staff).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhân viên thuộc quán này"})
		return
	}

	now := time.Now()
	workDate := now.Format("2006-01-02")

	shift := models.StaffShift{
		ID:        uuid.New().String(),
		StaffID:   staffID,
		ShiftType: req.ShiftType,
		WorkDate:  workDate,
		ClockIn:   now,
		Status:    "active",
		CreatedAt: now,
	}

	if err := database.DB.Create(&shift).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(tenantID, "staff_clocked_in", gin.H{"staff_id": staffID, "shift": shift})
	c.JSON(http.StatusOK, gin.H{"data": shift, "message": "Đã chấm công vào ca"})
}

// ClockOutStaff chấm công ra ca và tính toán giờ công tự động
func ClockOutStaff(c *gin.Context) {
	staffID := c.Param("id")
	var req ClockOutRequest
	_ = c.ShouldBindJSON(&req)

	now := time.Now()

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã chấm công ra ca"})
		return
	}

	// Tìm ca làm việc đang mở gần nhất của nhân viên
	var shift models.StaffShift
	if err := database.DB.Where("staff_id = ? AND status = ?", staffID, "active").Order("created_at desc").First(&shift).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Không có ca làm việc nào đang mở cho nhân viên này"})
		return
	}

	shift.ClockOut = &now
	shift.Status = "completed"
	shift.Note = req.Note

	// Tính tổng số giờ làm việc
	duration := now.Sub(shift.ClockIn).Hours()
	if duration < 0 {
		duration = 0
	}
	// Làm tròn 2 chữ số thập phân
	duration = math.Round(duration*100) / 100

	standardShiftHours := 8.0
	if duration <= standardShiftHours {
		shift.RegularHours = duration
		shift.OvertimeHours = 0
	} else {
		shift.RegularHours = standardShiftHours
		shift.OvertimeHours = math.Round((duration-standardShiftHours)*100) / 100
	}

	if err := database.DB.Save(&shift).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var tenantID string = "tenant_ongchu"
	var staff models.Staff
	if err := database.DB.First(&staff, "id = ?", staffID).Error; err == nil && staff.TenantID != "" {
		tenantID = staff.TenantID
	}

	websocket.GlobalHub.BroadcastToTenant(tenantID, "staff_clocked_out", gin.H{"staff_id": staffID, "shift": shift})
	c.JSON(http.StatusOK, gin.H{"data": shift, "message": "Đã chấm công ra ca thành công"})
}

// ManualLogStaffShift ghi nhận công ca thủ công
func ManualLogStaffShift(c *gin.Context) {
	staffID := c.Param("id")
	var req ManualShiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	shift := models.StaffShift{
		ID:            uuid.New().String(),
		StaffID:       staffID,
		ShiftType:     req.ShiftType,
		WorkDate:      req.WorkDate,
		ClockIn:       now,
		ClockOut:      &now,
		RegularHours:  req.RegularHours,
		OvertimeHours: req.OvertimeHours,
		Note:          req.Note,
		Status:        "completed",
		CreatedAt:     now,
	}

	if database.DB != nil {
		if err := database.DB.Create(&shift).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{"data": shift, "message": "Đã ghi nhận công ca thành công"})
}

// RecordStaffAdvance ghi nhận tạm ứng lương (tự động tạo phiếu chi Sổ Quỹ nếu chọn)
func RecordStaffAdvance(c *gin.Context) {
	staffID := c.Param("id")
	var req StaffAdvanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã tạm ứng lương"})
		return
	}

	var staff models.Staff
	if err := database.DB.First(&staff, "id = ?", staffID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhân viên"})
		return
	}

	advance := models.StaffAdvance{
		ID:        uuid.New().String(),
		StaffID:   staffID,
		Amount:    req.Amount,
		Reason:    req.Reason,
		CreatedAt: time.Now(),
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Tạo bản ghi tạm ứng
		if err := tx.Create(&advance).Error; err != nil {
			return err
		}

		// 2. Tự động sinh phiếu chi Sổ Quỹ Tiền Mặt
		if req.CreateCash {
			cashTx := models.CashTransaction{
				ID:          uuid.New().String(),
				TenantID:    staff.TenantID,
				BranchID:    staff.BranchID,
				ShiftID:     req.ShiftID,
				Type:        "chi",
				Category:    "chi_ung_luong",
				Amount:      req.Amount,
				Description: fmt.Sprintf("Tạm ứng lương: %s - %s", staff.Name, req.Reason),
				PerformedBy: "Chủ Quán / Thu Ngân",
				CreatedAt:   time.Now(),
			}
			if err := tx.Create(&cashTx).Error; err != nil {
				return err
			}
			advance.CashTransactionID = &cashTx.ID
			tx.Save(&advance)
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(staff.TenantID, "staff_advance_created", advance)
	c.JSON(http.StatusCreated, gin.H{"data": advance, "message": "Ghi nhận tạm ứng lương thành công"})
}

// CalculateStaffSalary tính toán bảng lương thực lĩnh cho nhân viên
func CalculateStaffSalary(c *gin.Context) {
	staffID := c.Param("id")

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"data": gin.H{"net_salary": 0}})
		return
	}

	var staff models.Staff
	if err := database.DB.Preload("Shifts").Preload("Advances").First(&staff, "id = ?", staffID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhân viên"})
		return
	}

	var totalRegularHours float64
	var totalOvertimeHours float64
	var totalCompletedShifts int

	for _, s := range staff.Shifts {
		if s.Status == "completed" {
			totalRegularHours += s.RegularHours
			totalOvertimeHours += s.OvertimeHours
			totalCompletedShifts++
		}
	}

	var baseSalary float64
	switch staff.WageType {
	case "hourly":
		baseSalary = totalRegularHours * staff.WageRate
	case "monthly":
		baseSalary = staff.WageRate
	case "per_shift":
		baseSalary = float64(totalCompletedShifts) * staff.WageRate
	}

	// Tiền tăng ca OT
	overtimeHourlyRate := staff.WageRate
	if staff.WageType == "monthly" {
		overtimeHourlyRate = staff.WageRate / (26 * 8) // Chuẩn 26 ngày công 8h
	} else if staff.WageType == "per_shift" {
		overtimeHourlyRate = staff.WageRate / 8
	}
	overtimePay := totalOvertimeHours * overtimeHourlyRate * staff.OvertimeRateMultiplier

	// Tổng tạm ứng
	var totalAdvances float64
	for _, a := range staff.Advances {
		totalAdvances += a.Amount
	}

	netSalary := baseSalary + staff.Allowance + overtimePay - totalAdvances
	if netSalary < 0 {
		netSalary = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"staff_id":               staff.ID,
			"staff_name":             staff.Name,
			"wage_type":              staff.WageType,
			"wage_rate":              staff.WageRate,
			"total_regular_hours":    totalRegularHours,
			"total_overtime_hours":   totalOvertimeHours,
			"total_completed_shifts": totalCompletedShifts,
			"base_salary":            baseSalary,
			"allowance":              staff.Allowance,
			"overtime_pay":           overtimePay,
			"advances":               totalAdvances,
			"net_salary":             netSalary,
		},
	})
}

// PayStaffSalary thực hiện chi lương và ghi sổ quỹ
func PayStaffSalary(c *gin.Context) {
	staffID := c.Param("id")
	var req PaySalaryRequest
	_ = c.ShouldBindJSON(&req)

	if req.PeriodMonth == 0 {
		req.PeriodMonth = int(time.Now().Month())
	}
	if req.PeriodYear == 0 {
		req.PeriodYear = time.Now().Year()
	}
	if req.PaidBy == "" {
		req.PaidBy = "Chủ Quán"
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã chi lương"})
		return
	}

	var staff models.Staff
	if err := database.DB.Preload("Shifts").Preload("Advances").First(&staff, "id = ?", staffID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhân viên"})
		return
	}

	// Tính lương
	var totalRegularHours float64
	var totalOvertimeHours float64
	var totalCompletedShifts int
	for _, s := range staff.Shifts {
		if s.Status == "completed" {
			totalRegularHours += s.RegularHours
			totalOvertimeHours += s.OvertimeHours
			totalCompletedShifts++
		}
	}

	var baseSalary float64
	switch staff.WageType {
	case "hourly":
		baseSalary = totalRegularHours * staff.WageRate
	case "monthly":
		baseSalary = staff.WageRate
	case "per_shift":
		baseSalary = float64(totalCompletedShifts) * staff.WageRate
	}

	overtimeHourlyRate := staff.WageRate
	if staff.WageType == "monthly" {
		overtimeHourlyRate = staff.WageRate / (26 * 8)
	} else if staff.WageType == "per_shift" {
		overtimeHourlyRate = staff.WageRate / 8
	}
	overtimePay := totalOvertimeHours * overtimeHourlyRate * staff.OvertimeRateMultiplier

	var totalAdvances float64
	for _, a := range staff.Advances {
		totalAdvances += a.Amount
	}

	netSalary := baseSalary + staff.Allowance + overtimePay + req.Bonus - req.Deductions - totalAdvances
	if netSalary < 0 {
		netSalary = 0
	}

	now := time.Now()
	payroll := models.StaffPayroll{
		ID:          uuid.New().String(),
		StaffID:     staffID,
		PeriodMonth: req.PeriodMonth,
		PeriodYear:  req.PeriodYear,
		BaseSalary:  baseSalary,
		Allowance:   staff.Allowance,
		OvertimePay: overtimePay,
		Bonus:       req.Bonus,
		Deductions:  req.Deductions,
		Advances:    totalAdvances,
		NetSalary:   netSalary,
		Status:      "paid",
		PaidAt:      &now,
		CreatedAt:   now,
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Tạo phiếu chi Sổ Quỹ Tiền Mặt
		cashTx := models.CashTransaction{
			ID:          uuid.New().String(),
			TenantID:    staff.TenantID,
			BranchID:    staff.BranchID,
			ShiftID:     req.ShiftID,
			Type:        "chi",
			Category:    "chi_luong",
			Amount:      netSalary,
			Description: fmt.Sprintf("Chi trả lương T%d/%d cho NV %s (Thực lĩnh)", req.PeriodMonth, req.PeriodYear, staff.Name),
			PerformedBy: req.PaidBy,
			CreatedAt:   now,
		}
		if err := tx.Create(&cashTx).Error; err != nil {
			return err
		}

		payroll.CashTransactionID = &cashTx.ID
		if err := tx.Create(&payroll).Error; err != nil {
			return err
		}

		// 2. Reset các tạm ứng đã đối trừ xong
		if err := tx.Where("staff_id = ?", staffID).Delete(&models.StaffAdvance{}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(staff.TenantID, "staff_payroll_paid", payroll)
	c.JSON(http.StatusOK, gin.H{
		"data":    payroll,
		"message": fmt.Sprintf("Đã chi lương %s thành công", staff.Name),
	})
}
