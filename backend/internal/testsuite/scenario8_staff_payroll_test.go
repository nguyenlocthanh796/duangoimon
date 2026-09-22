package testsuite

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ongchu/pos-backend/internal/models"
)

func TestScenario8_Staff_Timekeeping_And_Payroll(t *testing.T) {
	db, router := SetupTestEnv(t)

	// 1. Tạo nhân viên theo giờ (hourly)
	wCreate1 := httptest.NewRecorder()
	bodyStaff1 := `{
		"name": "Nguyễn Văn Phục Vụ Test",
		"phone": "0911222333",
		"role": "phuc_vu",
		"wage_type": "hourly",
		"wage_rate": 25000,
		"allowance": 150000,
		"overtime_rate_multiplier": 1.5
	}`
	req1, _ := http.NewRequest("POST", "/api/v1/staff", bytes.NewBufferString(bodyStaff1))
	req1.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wCreate1, req1)
	if wCreate1.Code != http.StatusCreated {
		t.Fatalf("Expected status 201 for creating staff, got %d: %s", wCreate1.Code, wCreate1.Body.String())
	}

	var resStaff1 struct {
		Data models.Staff `json:"data"`
	}
	_ = json.Unmarshal(wCreate1.Body.Bytes(), &resStaff1)
	staffID := resStaff1.Data.ID
	if staffID == "" {
		t.Fatalf("Expected non-empty staff ID")
	}

	// 2. Chấm công vào ca (clock-in)
	wClockIn := httptest.NewRecorder()
	bodyClockIn := `{"shift_type": "ca_sang"}`
	reqIn, _ := http.NewRequest("POST", "/api/v1/staff/"+staffID+"/clock-in", bytes.NewBufferString(bodyClockIn))
	reqIn.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wClockIn, reqIn)
	if wClockIn.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for clock-in, got %d", wClockIn.Code)
	}

	// 3. Chấm công ra ca (clock-out)
	wClockOut := httptest.NewRecorder()
	bodyClockOut := `{"note": "Hoàn thành ca sáng tốt"}`
	reqOut, _ := http.NewRequest("POST", "/api/v1/staff/"+staffID+"/clock-out", bytes.NewBufferString(bodyClockOut))
	reqOut.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wClockOut, reqOut)
	if wClockOut.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for clock-out, got %d", wClockOut.Code)
	}

	// 4. Ghi nhận công ca bổ sung thủ công (8h thường + 2h OT)
	wManual := httptest.NewRecorder()
	bodyManual := `{
		"shift_type": "ca_chieu",
		"work_date": "2026-09-06",
		"regular_hours": 8,
		"overtime_hours": 2,
		"note": "Tăng ca dọn dẹp cuối tuần"
	}`
	reqManual, _ := http.NewRequest("POST", "/api/v1/staff/"+staffID+"/shifts/manual", bytes.NewBufferString(bodyManual))
	reqManual.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wManual, reqManual)
	if wManual.Code != http.StatusCreated {
		t.Fatalf("Expected status 201 for manual shift, got %d", wManual.Code)
	}

	// 5. Tạm ứng lương (500.000 đ) liên kết Sổ Quỹ Tiền Mặt
	wAdvance := httptest.NewRecorder()
	bodyAdvance := `{
		"amount": 500000,
		"reason": "Ứng tiền gia đình có việc",
		"create_cash_tx": true
	}`
	reqAdv, _ := http.NewRequest("POST", "/api/v1/staff/"+staffID+"/advances", bytes.NewBufferString(bodyAdvance))
	reqAdv.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wAdvance, reqAdv)
	if wAdvance.Code != http.StatusCreated {
		t.Fatalf("Expected status 201 for staff advance, got %d", wAdvance.Code)
	}

	// Kiểm tra xem phiếu chi Sổ Quỹ đã được tạo chưa
	var cashTx models.CashTransaction
	if err := db.Where("category = ? AND amount = ?", "chi_ung_luong", 500000).First(&cashTx).Error; err != nil {
		t.Fatalf("Expected CashTransaction for advance to be created: %v", err)
	}

	// 6. Tính toán thực lĩnh (Calculate Salary)
	wCalc := httptest.NewRecorder()
	reqCalc, _ := http.NewRequest("GET", "/api/v1/staff/"+staffID+"/calculate-salary", nil)
	router.ServeHTTP(wCalc, reqCalc)
	if wCalc.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for calculate salary, got %d", wCalc.Code)
	}

	var resCalc struct {
		Data struct {
			RegularHours float64 `json:"total_regular_hours"`
			OvertimeHours float64 `json:"total_overtime_hours"`
			BaseSalary   float64 `json:"base_salary"`
			Allowance    float64 `json:"allowance"`
			OvertimePay  float64 `json:"overtime_pay"`
			Advances     float64 `json:"advances"`
			NetSalary    float64 `json:"net_salary"`
		} `json:"data"`
	}
	_ = json.Unmarshal(wCalc.Body.Bytes(), &resCalc)

	if resCalc.Data.RegularHours < 8 {
		t.Errorf("Expected at least 8 regular hours, got %v", resCalc.Data.RegularHours)
	}
	if resCalc.Data.Advances != 500000 {
		t.Errorf("Expected 500000 advance deduction, got %v", resCalc.Data.Advances)
	}

	// 7. Thực hiện chi lương (Pay Salary)
	wPay := httptest.NewRecorder()
	bodyPay := `{
		"period_month": 9,
		"period_year": 2026,
		"bonus": 100000,
		"deductions": 0,
		"paid_by": "Chủ Quán"
	}`
	reqPay, _ := http.NewRequest("POST", "/api/v1/staff/"+staffID+"/pay-salary", bytes.NewBufferString(bodyPay))
	reqPay.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wPay, reqPay)
	if wPay.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for paying salary, got %d: %s", wPay.Code, wPay.Body.String())
	}

	// Kiểm tra phiếu chi lương trong Sổ Quỹ
	var salaryCashTx models.CashTransaction
	if err := db.Where("category = ?", "chi_luong").First(&salaryCashTx).Error; err != nil {
		t.Fatalf("Expected CashTransaction for salary payment to be created: %v", err)
	}

	// Kiểm tra bảng lương StaffPayroll đã được lưu
	var payroll models.StaffPayroll
	if err := db.Where("staff_id = ? AND status = ?", staffID, "paid").First(&payroll).Error; err != nil {
		t.Fatalf("Expected StaffPayroll record created: %v", err)
	}

	// Kiểm tra các khoản tạm ứng đã được đối trừ
	var remainingAdvances []models.StaffAdvance
	db.Where("staff_id = ?", staffID).Find(&remainingAdvances)
	if len(remainingAdvances) != 0 {
		t.Errorf("Expected remaining advances to be 0 after payout, got %d", len(remainingAdvances))
	}
}
