package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/models"
)

func GetOwnerPnLSummary(c *gin.Context) {
	tenantID := GetTenantID(c, "tenant-default")
	branchID := strings.TrimSpace(c.Query("branch_id"))
	db := GetDB(c)

	// ponytail: dung FixedZone thay vi time.LoadLocation (tranh phu thuoc tz database).
	// Truncate theo UTC hien tai tao 07:00 VN - lech hom tinh P&L.
	today := time.Now().In(time.FixedZone("ICT", 7*3600)).Truncate(24 * time.Hour)

	var totalCashSales float64
	var totalVietQRSales float64
	var totalCashExpenses float64
	var totalCostOfGoods float64

	if db != nil {
		// 1. Gộp các chỉ số trên bảng orders (Doanh thu tiền mặt, VietQR, Giá vốn) vào 1 câu SELECT tổng hợp
		type orderAggResult struct {
			TotalCashSales   float64 `gorm:"column:total_cash_sales"`
			TotalVietQRSales float64 `gorm:"column:total_vietqr_sales"`
			TotalCostOfGoods float64 `gorm:"column:total_cost_of_goods"`
		}
		var oRes orderAggResult
		ordQuery := ScopeTenant(db.Model(&models.Order{}), tenantID).
			Where("status = 'da_thanh_toan' AND created_at >= ?", today)

		if branchID != "" && branchID != "all" && branchID != "tat_ca" {
			ordQuery = ordQuery.Where("branch_id = ?", branchID)
		}

		ordQuery.Select(`
			COALESCE(SUM(CASE WHEN payment_method = 'tien_mat' THEN total_amount ELSE 0 END), 0) AS total_cash_sales,
			COALESCE(SUM(CASE WHEN payment_method IN ('chuyen_khoan_vietqr', 'vietqr') THEN total_amount ELSE 0 END), 0) AS total_vietqr_sales,
			COALESCE(SUM(total_cost_price), 0) AS total_cost_of_goods
		`).Scan(&oRes)

		totalCashSales = oRes.TotalCashSales
		totalVietQRSales = oRes.TotalVietQRSales
		totalCostOfGoods = oRes.TotalCostOfGoods

		// 2. Tổng chi phí tiền mặt thực tế trên bảng cash_transactions
		cashQuery := ScopeTenant(db.Model(&models.CashTransaction{}), tenantID).
			Where("type = 'chi' AND created_at >= ?", today)

		if branchID != "" && branchID != "all" && branchID != "tat_ca" {
			cashQuery = cashQuery.Where("branch_id = ?", branchID)
		}

		cashQuery.Select("COALESCE(SUM(amount), 0)").Scan(&totalCashExpenses)
	}

	totalRevenue := totalCashSales + totalVietQRSales
	cashInDrawer := totalCashSales - totalCashExpenses
	if cashInDrawer < 0 {
		cashInDrawer = 0
	}

	// Lợi nhuận ròng thực tế = Tổng doanh thu - Giá vốn nguyên liệu - Chi phí chi chợ/vận hành
	realNetProfit := totalRevenue - totalCostOfGoods - totalCashExpenses

	var foodCostRatio float64
	if totalRevenue > 0 {
		foodCostRatio = (totalCostOfGoods / totalRevenue) * 100
	}

	RespondSuccess(c, http.StatusOK, gin.H{
		"date":              today.Format("02/01/2006"),
		"cash_in_drawer":    cashInDrawer,
		"vietqr_bank_total": totalVietQRSales,
		"real_net_profit":   realNetProfit,
		// 3 CON SỐ VÀNG CỦA CHỦ QUÁN:
		"three_golden_numbers": gin.H{
			"cash_in_drawer":    cashInDrawer,     // 1. Tiền mặt trong két thực tế
			"vietqr_bank_total": totalVietQRSales, // 2. Tiền chuyển khoản VietQR về tài khoản
			"real_net_profit":   realNetProfit,    // 3. Tiền Lời Đút Túi Thực Tế hôm nay
		},
		"breakdown": gin.H{
			"total_revenue":       totalRevenue,
			"total_cash_sales":    totalCashSales,
			"total_vietqr_sales":  totalVietQRSales,
			"total_cash_expenses": totalCashExpenses,
			"total_cost_of_goods": totalCostOfGoods,
			"food_cost_ratio":     foodCostRatio,
		},
	})
}
