package handler

import (
	"fmt"
	"html"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
)

// PublicBillResponse đại diện cho dữ liệu hóa đơn công khai trả về cho client/web
type PublicBillResponse struct {
	OrderCode      string               `json:"order_code"`
	StoreName      string               `json:"store_name"`
	StoreAddress   string               `json:"store_address"`
	StorePhone     string               `json:"store_phone"`
	WifiName       string               `json:"wifi_name"`
	WifiPassword   string               `json:"wifi_password"`
	Slogan         string               `json:"slogan"`
	TableName      string               `json:"table_name"`
	CashierName    string               `json:"cashier_name"`
	CustomerName   string               `json:"customer_name"`
	OrderType      string               `json:"order_type"`
	Status         string               `json:"status"`
	StatusText     string               `json:"status_text"`
	Subtotal       float64              `json:"subtotal"`
	DiscountAmount float64              `json:"discount_amount"`
	TotalAmount    float64              `json:"total_amount"`
	PaymentMethod  string               `json:"payment_method"`
	PaidAmount     float64              `json:"paid_amount"`
	ChangeAmount   float64              `json:"change_amount"`
	CreatedAt      string               `json:"created_at"`
	PaidAt         *string              `json:"paid_at,omitempty"`
	Items          []PublicBillItemJSON `json:"items"`
}

type PublicBillItemJSON struct {
	ProductName   string  `json:"product_name"`
	UnitPrice     float64 `json:"unit_price"`
	Quantity      float64 `json:"quantity"`
	TotalPrice    float64 `json:"total_price"`
	SelectedSize  string  `json:"selected_size,omitempty"`
	ModifierNames string  `json:"modifier_names,omitempty"`
	Note          string  `json:"note,omitempty"`
}

func formatVND(amount float64) string {
	n := int64(amount)
	if n < 0 {
		return fmt.Sprintf("-%s", formatVND(-amount))
	}
	s := fmt.Sprintf("%d", n)
	if len(s) <= 3 {
		return s + " đ"
	}
	var res []string
	for len(s) > 3 {
		res = append([]string{s[len(s)-3:]}, res...)
		s = s[:len(s)-3]
	}
	if len(s) > 0 {
		res = append([]string{s}, res...)
	}
	return strings.Join(res, ".") + " đ"
}

// fetchOrderAndSettings helper tìm kiếm hóa đơn và cài đặt quán
func fetchOrderAndSettings(codeOrID string) (*models.Order, *models.POSSettings, string, error) {
	cleanCode := strings.TrimSpace(codeOrID)
	if cleanCode == "" {
		return nil, nil, "", fmt.Errorf("mã hóa đơn không hợp lệ")
	}

	var order models.Order
	db := database.DB

	// Tìm theo OrderCode (ví dụ HD-0012) hoặc ID UUID
	err := db.Preload("Items").Where("order_code = ? OR id = ?", cleanCode, cleanCode).First(&order).Error
	if err != nil {
		// Thử tìm case-insensitive nếu mã gõ thường
		err = db.Preload("Items").Where("LOWER(order_code) = ?", strings.ToLower(cleanCode)).First(&order).Error
		if err != nil {
			return nil, nil, "", err
		}
	}

	// Lấy thông tin bàn
	tableName := "Tại quầy / Mang về"
	if order.TableID != nil && *order.TableID != "" {
		var table models.DiningTable
		if db.Where("id = ?", *order.TableID).First(&table).Error == nil {
			tableName = table.Name
		}
	} else if order.OrderType == "takeaway" {
		tableName = "Mang về"
	} else if order.OrderType == "delivery" {
		tableName = "Giao hàng"
	}

	// Đảm bảo tên món luôn hiển thị chuẩn (tự động tra cứu từ bảng Product nếu trống)
	for i := range order.Items {
		if strings.TrimSpace(order.Items[i].ProductName) == "" {
			if order.Items[i].ProductID != nil && *order.Items[i].ProductID != "" {
				var prod models.Product
				if db.Where("id = ?", *order.Items[i].ProductID).First(&prod).Error == nil && prod.Name != "" {
					order.Items[i].ProductName = prod.Name
				}
			}
		}
		if strings.TrimSpace(order.Items[i].ProductName) == "" {
			order.Items[i].ProductName = "Món ăn / Đồ uống"
		}
	}

	// Đảm bảo thông tin thu ngân luôn rõ ràng
	if strings.TrimSpace(order.CashierName) == "" {
		order.CashierName = "Thu ngân quầy"
	}

	// Lấy cài đặt cửa hàng
	var settings models.POSSettings
	if db.Where("tenant_id = ? AND branch_id = ?", order.TenantID, order.BranchID).First(&settings).Error != nil {
		if db.Where("tenant_id = ?", order.TenantID).First(&settings).Error != nil {
			// Cài đặt mặc định nếu chưa lưu
			settings = models.POSSettings{
				StoreName:     "OngChu POS F&B",
				StoreAddress:  "Việt Nam",
				StorePhone:    "1900 6868",
				Slogan:        "Hân hạnh phục vụ Quý khách!",
				ReceiptTitle:  "HÓA ĐƠN THANH TOÁN",
				ReceiptFooter: "Cảm ơn Quý khách & Hẹn gặp lại!",
			}
		}
	}

	return &order, &settings, tableName, nil
}

// GetPublicBillJSON trả về dữ liệu hóa đơn dạng JSON
func GetPublicBillJSON(c *gin.Context) {
	code := c.Param("code")
	order, settings, tableName, err := fetchOrderAndSettings(code)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Không tìm thấy hóa đơn hoặc mã hóa đơn không tồn tại",
		})
		return
	}

	statusText := "Chờ thanh toán"
	if order.Status == "da_thanh_toan" || order.Status == "paid" {
		statusText = "Đã thanh toán"
	} else if order.Status == "da_huy" || order.Status == "voided" {
		statusText = "Đã hủy"
	}

	var paidAtStr *string
	if order.PaidAt != nil {
		t := order.PaidAt.Format("15:04:05 02/01/2006")
		paidAtStr = &t
	}

	var itemsJSON []PublicBillItemJSON
	for _, item := range order.Items {
		itemsJSON = append(itemsJSON, PublicBillItemJSON{
			ProductName:   item.ProductName,
			UnitPrice:     item.UnitPrice,
			Quantity:      item.Quantity,
			TotalPrice:    item.TotalPrice,
			SelectedSize:  item.SelectedSize,
			ModifierNames: item.ModifierNames,
			Note:          item.Note,
		})
	}

	resp := PublicBillResponse{
		OrderCode:      order.OrderCode,
		StoreName:      settings.StoreName,
		StoreAddress:   settings.StoreAddress,
		StorePhone:     settings.StorePhone,
		WifiName:       settings.WifiName,
		WifiPassword:   settings.WifiPassword,
		Slogan:         settings.Slogan,
		TableName:      tableName,
		CashierName:    order.CashierName,
		CustomerName:   order.CustomerName,
		OrderType:      order.OrderType,
		Status:         order.Status,
		StatusText:     statusText,
		Subtotal:       order.Subtotal,
		DiscountAmount: order.DiscountAmount,
		TotalAmount:    order.TotalAmount,
		PaymentMethod:  order.PaymentMethod,
		PaidAmount:     order.PaidAmount,
		ChangeAmount:   order.ChangeAmount,
		CreatedAt:      order.CreatedAt.Format("15:04:05 02/01/2006"),
		PaidAt:         paidAtStr,
		Items:          itemsJSON,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    resp,
	})
}

// RenderPublicBill render trang HTML hóa đơn điện tử độc lập siêu nhẹ
func RenderPublicBill(c *gin.Context) {
	code := c.Param("code")
	order, settings, tableName, err := fetchOrderAndSettings(code)

	if err != nil {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusNotFound, `<!DOCTYPE html>
<html lang="vi">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Hóa Đơn Không Tồn Tại - OngChu Cloud</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F9F6F0; color: #1C1917; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
		.card { background: #FFFFFF; border-radius: 16px; padding: 32px 24px; max-width: 400px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E7E0D3; }
		.icon { font-size: 48px; margin-bottom: 12px; }
		h1 { font-size: 20px; margin: 0 0 8px 0; color: #DC2626; font-weight: 600; }
		p { font-size: 15px; color: #78716C; margin: 0 0 20px 0; line-height: 1.5; }
		.btn { display: inline-block; background: #B45309; color: #FFFFFF; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; }
	</style>
</head>
<body>
	<div class="card">
		<div class="icon">🧾</div>
		<h1>Không tìm thấy hóa đơn</h1>
		<p>Mã hóa đơn tra cứu không tồn tại hoặc đã hết hạn lưu trữ trên hệ thống.</p>
		<a href="/tra-cuu" class="btn">🔍 Tra cứu mã khác</a>
	</div>
</body>
</html>`)
		return
	}

	isPaid := order.Status == "da_thanh_toan" || order.Status == "paid"
	isVoided := order.Status == "da_huy" || order.Status == "voided"

	statusStampClass := "stamp-paid"
	statusStampText := "★ ĐÃ THANH TOÁN ★"
	if isVoided {
		statusStampClass = "stamp-voided"
		statusStampText = "✕ ĐÃ HỦY ĐƠN ✕"
	} else if !isPaid {
		statusStampClass = "stamp-pending"
		statusStampText = "⏳ CHỜ THANH TOÁN"
	}

	payMethodText := "Tiền mặt"
	if order.PaymentMethod == "chuyen_khoan_vietqr" || order.PaymentMethod == "vietqr" {
		payMethodText = "Chuyển khoản VietQR"
	} else if order.PaymentMethod == "the" {
		payMethodText = "Thẻ ngân hàng"
	} else if order.PaymentMethod == "ghi_no" {
		payMethodText = "Ghi nợ"
	}

	// Xây dựng danh sách món dạng K80 Dot Leader
	var itemsHTML strings.Builder
	for _, item := range order.Items {
		var subDetails []string
		if item.SelectedSize != "" {
			subDetails = append(subDetails, "Size "+html.EscapeString(item.SelectedSize))
		}
		if item.ModifierNames != "" {
			subDetails = append(subDetails, html.EscapeString(item.ModifierNames))
		}
		if item.Note != "" {
			subDetails = append(subDetails, "Ghi chú: "+html.EscapeString(item.Note))
		}

		qtyStr := fmt.Sprintf("%.0f", item.Quantity)
		if item.Quantity != float64(int(item.Quantity)) {
			qtyStr = fmt.Sprintf("%.2f", item.Quantity)
		}

		if item.Quantity > 1 {
			subDetails = append([]string{fmt.Sprintf("Đơn giá: %s", formatVND(item.UnitPrice))}, subDetails...)
		}

		subHTML := ""
		if len(subDetails) > 0 {
			subHTML = fmt.Sprintf(`<div class="item-meta">%s</div>`, strings.Join(subDetails, " · "))
		}

		itemsHTML.WriteString(fmt.Sprintf(`
		<div class="item-block">
			<div class="item-line">
				<div class="item-name-wrap">
					<span class="item-name">%s</span>
					<span class="item-qty">×%s</span>
				</div>
				<div class="item-dots"></div>
				<div class="item-price">%s</div>
			</div>
			%s
		</div>`,
			html.EscapeString(item.ProductName),
			qtyStr,
			formatVND(item.TotalPrice),
			subHTML,
		))
	}

	// Giảm giá
	discountHTML := ""
	if order.DiscountAmount > 0 {
		discountHTML = fmt.Sprintf(`
		<div class="summary-line discount">
			<span>Chiết khấu / Giảm giá</span>
			<span>-%s</span>
		</div>`, formatVND(order.DiscountAmount))
	}

	// Hotline / Địa chỉ
	storeMetaHTML := ""
	if settings.StoreAddress != "" {
		storeMetaHTML += fmt.Sprintf(`<div class="store-address">%s</div>`, html.EscapeString(settings.StoreAddress))
	}
	if settings.StorePhone != "" {
		storeMetaHTML += fmt.Sprintf(`<div class="store-phone">Hotline: <a href="tel:%s">%s</a></div>`, html.EscapeString(settings.StorePhone), html.EscapeString(settings.StorePhone))
	}

	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html lang="vi">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
	<title>Hóa Đơn %s - %s</title>
	<meta name="theme-color" content="#F5F2EB" media="(prefers-color-scheme: light)">
	<meta name="theme-color" content="#12100E" media="(prefers-color-scheme: dark)">

	<!-- OpenGraph & Zalo Rich Card Preview -->
	<meta property="og:type" content="website">
	<meta property="og:url" content="https://ongchu.cloud/b/%s">
	<meta property="og:title" content="🧾 Hóa Đơn %s · %s">
	<meta property="og:description" content="%s · %s · %s">
	<meta property="og:image" content="https://ongchu.cloud/assets/icon.png">
	<meta property="og:site_name" content="OngChu Lean POS">

	<style>
		:root {
			--bg-body: #ECE6DC;
			--bg-canvas: #FCFBF8;
			--bg-subtle: #F4EFE6;
			--text-main: #1C1917;
			--text-muted: #57534E;
			--text-sub: #8C857E;
			--brand-accent: #B45309;
			--brand-accent-subtle: #FEF3C7;
			--brand-success: #15803D;
			--brand-danger: #B91C1C;
			--border-subtle: #E8E2D5;
			--border-dashed: #D4CBBA;
		}
		@media (prefers-color-scheme: dark) {
			:root {
				--bg-body: #0C0A09;
				--bg-canvas: #1A1512;
				--bg-subtle: #241D17;
				--text-main: #F4EFEA;
				--text-muted: #A8A29E;
				--text-sub: #78716C;
				--brand-accent: #D97706;
				--brand-accent-subtle: #452405;
				--brand-success: #22C55E;
				--brand-danger: #EF4444;
				--border-subtle: #332A22;
				--border-dashed: #453A30;
			}
		}
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			background-color: var(--bg-body);
			color: var(--text-main);
			line-height: 1.45;
			min-height: 100vh;
			-webkit-font-smoothing: antialiased;
			display: flex;
			flex-direction: column;
			align-items: center;
		}
		
		/* Khung bao cuộn giấy in nhiệt K80 */
		.k80-scroll-container {
			width: 100%%;
			max-width: 440px;
			min-height: 100vh;
			display: flex;
			flex-direction: column;
			position: relative;
			background: var(--bg-canvas);
			box-shadow: 0 4px 25px rgba(0, 0, 0, 0.07);
		}
		@media (min-width: 641px) {
			body {
				padding: 24px 16px 48px;
			}
			.k80-scroll-container {
				min-height: auto;
				border-radius: 4px;
				overflow: hidden;
			}
		}

		/* Mép cắt răng cưa K80 (Tear Edge) */
		.tear-edge {
			width: 100%%;
			height: 10px;
			display: block;
			color: var(--bg-canvas);
		}
		.top-tear {
			background: var(--bg-body);
			color: var(--bg-canvas);
		}
		.bottom-tear {
			background: var(--bg-body);
			color: var(--bg-canvas);
			transform: rotate(180deg);
		}

		/* Top Navigation Bar */
		.top-bar {
			position: sticky;
			top: 0;
			z-index: 30;
			background: rgba(252, 251, 248, 0.94);
			backdrop-filter: blur(16px);
			-webkit-backdrop-filter: blur(16px);
			border-bottom: 1px dashed var(--border-dashed);
			padding: max(10px, env(safe-area-inset-top)) 18px 10px;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		@media (prefers-color-scheme: dark) {
			.top-bar {
				background: rgba(26, 21, 18, 0.94);
			}
		}
		.top-brand {
			font-size: 13px;
			font-weight: 700;
			color: var(--brand-accent);
			letter-spacing: 0.5px;
		}
		.nav-link {
			font-size: 13px;
			color: var(--text-muted);
			text-decoration: none;
			font-weight: 600;
		}
		.nav-link:hover { color: var(--brand-accent); }

		/* Thân Hóa Đơn Trải Rộng Phẳng Liền Mạch */
		.k80-receipt-body {
			padding: 24px 20px 32px;
			flex: 1;
			position: relative;
		}

		/* Con dấu mộc đóng nổi ngang thân bill như mộc thật */
		.watermark-stamp {
			position: absolute;
			top: 38%%;
			left: 50%%;
			transform: translate(-50%%, -50%%) rotate(-14deg);
			z-index: 10;
			pointer-events: none;
			user-select: none;
			opacity: 0.82;
			mix-blend-mode: multiply;
			width: 250px;
			text-align: center;
		}
		@media (prefers-color-scheme: dark) {
			.watermark-stamp {
				mix-blend-mode: screen;
				opacity: 0.72;
			}
		}
		.stamp-border-outer {
			border: 3.5px dashed var(--brand-danger);
			border-radius: 12px;
			padding: 4px;
			box-shadow: 0 0 0 1.5px var(--brand-danger);
		}
		.stamp-border-inner {
			border: 1.5px solid var(--brand-danger);
			border-radius: 8px;
			padding: 6px 10px;
			background: rgba(185, 28, 28, 0.04);
		}
		.stamp-text-main {
			font-size: 20px;
			font-weight: 800;
			color: var(--brand-danger);
			letter-spacing: 2px;
			text-transform: uppercase;
			line-height: 1.2;
			text-shadow: 0 0 1px rgba(185, 28, 28, 0.3);
		}
		.stamp-text-sub {
			font-size: 10.5px;
			font-weight: 700;
			color: var(--brand-danger);
			letter-spacing: 1px;
			text-transform: uppercase;
			margin-top: 3px;
			opacity: 0.9;
		}
		.stamp-paid .stamp-border-outer { border-color: var(--brand-danger); box-shadow: 0 0 0 1.5px var(--brand-danger); }
		.stamp-paid .stamp-border-inner { border-color: var(--brand-danger); }
		.stamp-paid .stamp-text-main, .stamp-paid .stamp-text-sub { color: var(--brand-danger); }
		.stamp-pending .stamp-border-outer { border-color: var(--brand-accent); box-shadow: 0 0 0 1.5px var(--brand-accent); }
		.stamp-pending .stamp-border-inner { border-color: var(--brand-accent); }
		.stamp-pending .stamp-text-main, .stamp-pending .stamp-text-sub { color: var(--brand-accent); }

		/* Header Hóa Đơn */
		.receipt-header {
			text-align: center;
			padding-bottom: 16px;
			border-bottom: 1px dashed var(--border-dashed);
			margin-bottom: 16px;
		}
		.store-name {
			font-size: 20px;
			font-weight: 700;
			color: var(--text-main);
			text-transform: uppercase;
			letter-spacing: 0.5px;
			margin-bottom: 4px;
		}
		.store-address, .store-phone {
			font-size: 13px;
			color: var(--text-muted);
			margin-top: 2px;
		}
		.store-phone a {
			color: var(--brand-accent);
			text-decoration: none;
			font-weight: 600;
		}
		.receipt-title {
			display: inline-block;
			font-size: 14px;
			font-weight: 700;
			color: var(--brand-accent);
			letter-spacing: 1.5px;
			text-transform: uppercase;
			margin-top: 10px;
			padding: 2px 10px;
			background: var(--brand-accent-subtle);
			border-radius: 4px;
		}

		/* Meta thông tin đơn hàng */
		.meta-list {
			display: flex;
			flex-direction: column;
			gap: 6px;
			padding-bottom: 14px;
			border-bottom: 1px dashed var(--border-dashed);
			font-size: 13px;
		}
		.meta-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.meta-label {
			color: var(--text-muted);
		}
		.meta-val {
			color: var(--text-main);
			font-weight: 600;
			font-variant-numeric: tabular-nums;
		}

		/* Bảng món K80 đường chấm nối (Leader Dots) */
		.items-section {
			padding: 14px 0;
			border-bottom: 1px dashed var(--border-dashed);
		}
		.items-header {
			display: flex;
			justify-content: space-between;
			font-size: 11px;
			font-weight: 700;
			color: var(--text-muted);
			letter-spacing: 0.8px;
			text-transform: uppercase;
			margin-bottom: 10px;
		}
		.item-row {
			margin-bottom: 10px;
		}
		.item-row:last-child {
			margin-bottom: 0;
		}
		.item-main-line {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			width: 100%%;
			font-size: 14px;
			font-weight: 600;
			color: var(--text-main);
		}
		.item-name-group {
			display: flex;
			align-items: baseline;
			flex-shrink: 0;
			max-width: 72%%;
		}
		.item-name {
			white-space: normal;
			word-break: break-word;
		}
		.item-qty {
			font-size: 13px;
			color: var(--brand-accent);
			font-weight: 700;
			margin-left: 6px;
			font-variant-numeric: tabular-nums;
		}
		.leader-dots {
			flex: 1;
			margin: 0 6px;
			border-bottom: 1px dotted var(--border-dashed);
			min-width: 12px;
			height: 1px;
		}
		.item-price {
			font-weight: 700;
			font-variant-numeric: tabular-nums;
			white-space: nowrap;
		}
		.item-mods {
			font-size: 12px;
			color: var(--text-muted);
			margin-top: 2px;
			padding-left: 8px;
			border-left: 2px solid var(--border-subtle);
		}

		/* Tóm tắt thanh toán & Tổng cộng K80 */
		.summary-box {
			padding: 14px 0;
			border-bottom: 1px dashed var(--border-dashed);
			display: flex;
			flex-direction: column;
			gap: 6px;
			font-size: 13.5px;
		}
		.summary-line {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.total-hero-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-top: 6px;
			padding-top: 8px;
			border-top: 1px dashed var(--border-dashed);
		}
		.total-hero-label {
			font-size: 14px;
			font-weight: 700;
			color: var(--text-main);
			letter-spacing: 0.5px;
		}
		.total-hero-val {
			font-size: 24px;
			font-weight: 700;
			color: var(--brand-accent);
			font-variant-numeric: tabular-nums;
		}
		.pay-method-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-size: 12px;
			color: var(--text-muted);
			margin-top: 4px;
		}

		/* Barcode K80 & QR Tra cứu */
		.k80-codes-section {
			padding: 18px 0 10px;
			text-align: center;
			border-bottom: 1px dashed var(--border-dashed);
		}
		.barcode-wrapper {
			margin-bottom: 14px;
		}
		.receipt-barcode {
			width: 220px;
			height: 38px;
			color: var(--text-main);
		}
		.barcode-code {
			font-size: 11px;
			letter-spacing: 2px;
			color: var(--text-muted);
			font-family: monospace;
			margin-top: 3px;
		}
		.qr-wrapper {
			display: inline-block;
			padding: 8px;
			background: #FFFFFF;
			border-radius: 8px;
			border: 1px solid var(--border-subtle);
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
		}
		.receipt-qr {
			width: 100px;
			height: 100px;
			display: block;
		}
		.qr-caption {
			font-size: 11px;
			color: var(--text-sub);
			margin-top: 6px;
		}

		/* Lời cảm ơn chân bill */
		.footer-text {
			font-size: 12px;
			color: var(--text-muted);
			text-align: center;
			line-height: 1.5;
			margin-top: 14px;
			font-style: italic;
		}
		.footer-powered {
			font-size: 11px;
			color: var(--text-sub);
			text-align: center;
			margin-top: 8px;
		}

		/* Sticky Bottom Action Dock */
		.bottom-actions-dock {
			position: sticky;
			bottom: 0;
			z-index: 40;
			background: rgba(252, 251, 248, 0.94);
			backdrop-filter: blur(16px);
			-webkit-backdrop-filter: blur(16px);
			border-top: 1px dashed var(--border-dashed);
			padding: 10px 14px max(10px, env(safe-area-inset-bottom));
			display: grid;
			grid-template-columns: 1fr 1fr 1fr;
			gap: 8px;
		}
		@media (prefers-color-scheme: dark) {
			.bottom-actions-dock {
				background: rgba(26, 21, 18, 0.94);
			}
		}
		.btn-action {
			height: 44px;
			border-radius: 8px;
			font-size: 13px;
			font-weight: 700;
			cursor: pointer;
			text-align: center;
			text-decoration: none;
			border: none;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 4px;
			transition: all 0.15s;
		}
		.btn-action:active {
			transform: scale(0.97);
		}
		.btn-primary {
			background: var(--brand-accent);
			color: #FFFFFF;
		}
		.btn-secondary {
			background: var(--bg-subtle);
			border: 1px solid var(--border-subtle);
			color: var(--text-main);
		}
		.btn-zalo {
			background: #0068FF;
			color: #FFFFFF;
		}
		.btn-zalo:hover {
			background: #0056D2;
		}

		@media print {
			body { background: #FFF !important; padding: 0 !important; }
			.top-bar, .bottom-actions-dock, .top-tear, .bottom-tear { display: none !important; }
			.k80-scroll-container { box-shadow: none !important; border: none !important; max-width: 100%% !important; }
		}
	</style>
</head>
<body>
	<div class="k80-scroll-container">
		<!-- Mép răng cưa K80 trên -->
		<svg class="tear-edge top-tear" viewBox="0 0 480 12" preserveAspectRatio="none">
			<path d="M0,12 L8,0 L16,12 L24,0 L32,12 L40,0 L48,12 L56,0 L64,12 L72,0 L80,12 L88,0 L96,12 L104,0 L112,12 L120,0 L128,12 L136,0 L144,12 L152,0 L160,12 L168,0 L176,12 L184,0 L192,12 L200,0 L208,12 L216,0 L224,12 L232,0 L240,12 L248,0 L256,12 L264,0 L272,12 L280,0 L288,12 L296,0 L304,12 L312,0 L320,12 L328,0 L336,12 L344,0 L352,12 L360,0 L368,12 L376,0 L384,12 L392,0 L400,12 L408,0 L416,12 L424,0 L432,12 L440,0 L448,12 L456,0 L464,12 L472,0 L480,12 Z" fill="currentColor"/>
		</svg>

		<!-- Top Bar -->
		<div class="top-bar">
			<a href="/tra-cuu" class="nav-link">← Tra cứu đơn khác</a>
			<span class="top-brand">OngChu e-Receipt K80</span>
		</div>

		<!-- Thân Hóa Đơn Trải Rộng Phẳng Liền Mạch -->
		<div class="k80-receipt-body">
			<!-- Con dấu mộc đóng nổi ngang thân bill như bill thật -->
			<div class="watermark-stamp %s">
				<div class="stamp-border-outer">
					<div class="stamp-border-inner">
						<div class="stamp-text-main">%s</div>
						<div class="stamp-text-sub">%s · THU NGÂN: %s</div>
					</div>
				</div>
			</div>

			<div class="receipt-header">
				<div class="store-name">%s</div>
				%s
				<div class="receipt-title">%s</div>
			</div>

			<!-- Thông tin đơn hàng -->
			<div class="meta-list">
				<div class="meta-row">
					<span class="meta-label">Mã Hóa Đơn:</span>
					<span class="meta-val">%s</span>
				</div>
				<div class="meta-row">
					<span class="meta-label">Thời Gian:</span>
					<span class="meta-val">%s</span>
				</div>
				<div class="meta-row">
					<span class="meta-label">Khu vực / Bàn:</span>
					<span class="meta-val">%s</span>
				</div>
				<div class="meta-row">
					<span class="meta-label">Thu Ngân:</span>
					<span class="meta-val">%s</span>
				</div>
			</div>

			<!-- Danh sách món K80 Leader Dots -->
			<div class="items-section">
				<div class="items-header">
					<span>TÊN MÓN</span>
					<span>THÀNH TIỀN</span>
				</div>
				%s
			</div>

			<!-- Tóm tắt chi phí & Tổng cộng -->
			<div class="summary-box">
				<div class="summary-line">
					<span class="meta-label">Tổng tiền hàng:</span>
					<span class="meta-val">%s</span>
				</div>
				%s
				<div class="total-hero-row">
					<span class="total-hero-label">TỔNG THANH TOÁN</span>
					<span class="total-hero-val">%s</span>
				</div>
				<div class="pay-method-row">
					<span>Phương thức thanh toán:</span>
					<span class="meta-val">%s</span>
				</div>
			</div>

			<!-- Mã Barcode K80 & QR Tra cứu -->
			<div class="k80-codes-section">
				<div class="barcode-wrapper">
					<svg class="receipt-barcode" viewBox="0 0 260 42" preserveAspectRatio="none">
						<rect x="0" y="0" width="3" height="42" fill="currentColor"/>
						<rect x="5" y="0" width="1.5" height="42" fill="currentColor"/>
						<rect x="9" y="0" width="4" height="42" fill="currentColor"/>
						<rect x="16" y="0" width="2" height="42" fill="currentColor"/>
						<rect x="21" y="0" width="4" height="42" fill="currentColor"/>
						<rect x="28" y="0" width="1.5" height="42" fill="currentColor"/>
						<rect x="32" y="0" width="3" height="42" fill="currentColor"/>
						<rect x="38" y="0" width="6" height="42" fill="currentColor"/>
						<rect x="47" y="0" width="2" height="42" fill="currentColor"/>
						<rect x="52" y="0" width="4" height="42" fill="currentColor"/>
						<rect x="59" y="0" width="1.5" height="42" fill="currentColor"/>
						<rect x="63" y="0" width="5" height="42" fill="currentColor"/>
						<rect x="71" y="0" width="3" height="42" fill="currentColor"/>
						<rect x="77" y="0" width="2" height="42" fill="currentColor"/>
						<rect x="82" y="0" width="4" height="42" fill="currentColor"/>
						<rect x="89" y="0" width="6" height="42" fill="currentColor"/>
						<rect x="98" y="0" width="2" height="42" fill="currentColor"/>
						<rect x="103" y="0" width="3" height="42" fill="currentColor"/>
						<rect x="109" y="0" width="5" height="42" fill="currentColor"/>
						<rect x="117" y="0" width="1.5" height="42" fill="currentColor"/>
						<rect x="121" y="0" width="4" height="42" fill="currentColor"/>
						<rect x="128" y="0" width="2" height="42" fill="currentColor"/>
						<rect x="133" y="0" width="6" height="42" fill="currentColor"/>
						<rect x="142" y="0" width="3" height="42" fill="currentColor"/>
						<rect x="148" y="0" width="1.5" height="42" fill="currentColor"/>
						<rect x="152" y="0" width="5" height="42" fill="currentColor"/>
						<rect x="160" y="0" width="2" height="42" fill="currentColor"/>
						<rect x="165" y="0" width="4" height="42" fill="currentColor"/>
						<rect x="172" y="0" width="3" height="42" fill="currentColor"/>
						<rect x="178" y="0" width="5" height="42" fill="currentColor"/>
						<rect x="186" y="0" width="2" height="42" fill="currentColor"/>
						<rect x="191" y="0" width="4" height="42" fill="currentColor"/>
						<rect x="198" y="0" width="1.5" height="42" fill="currentColor"/>
						<rect x="202" y="0" width="6" height="42" fill="currentColor"/>
						<rect x="211" y="0" width="3" height="42" fill="currentColor"/>
						<rect x="217" y="0" width="2" height="42" fill="currentColor"/>
						<rect x="222" y="0" width="5" height="42" fill="currentColor"/>
						<rect x="230" y="0" width="1.5" height="42" fill="currentColor"/>
						<rect x="234" y="0" width="4" height="42" fill="currentColor"/>
						<rect x="241" y="0" width="2" height="42" fill="currentColor"/>
						<rect x="246" y="0" width="6" height="42" fill="currentColor"/>
						<rect x="255" y="0" width="3" height="42" fill="currentColor"/>
					</svg>
					<div class="barcode-code">* %s *</div>
				</div>

				<div class="qr-wrapper">
					<img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=2&data=https%%3A%%2F%%2Fongchu.cloud%%2Fb%%2F%s" alt="QR Tra cứu" class="receipt-qr" loading="lazy" />
				</div>
				<div class="qr-caption">Quét mã QR để mở lại hóa đơn này</div>
			</div>

			<!-- Lời cảm ơn -->
			<div class="footer-text">
				%s
			</div>
			<div class="footer-powered">
				Hóa đơn điện tử K80 từ <strong>OngChu Lean POS</strong>
			</div>
		</div>

		<!-- Mép răng cưa K80 dưới -->
		<svg class="tear-edge bottom-tear" viewBox="0 0 480 12" preserveAspectRatio="none">
			<path d="M0,12 L8,0 L16,12 L24,0 L32,12 L40,0 L48,12 L56,0 L64,12 L72,0 L80,12 L88,0 L96,12 L104,0 L112,12 L120,0 L128,12 L136,0 L144,12 L152,0 L160,12 L168,0 L176,12 L184,0 L192,12 L200,0 L208,12 L216,0 L224,12 L232,0 L240,12 L248,0 L256,12 L264,0 L272,12 L280,0 L288,12 L296,0 L304,12 L312,0 L320,12 L328,0 L336,12 L344,0 L352,12 L360,0 L368,12 L376,0 L384,12 L392,0 L400,12 L408,0 L416,12 L424,0 L432,12 L440,0 L448,12 L456,0 L464,12 L472,0 L480,12 Z" fill="currentColor"/>
		</svg>

		<!-- Sticky Bottom Action Dock -->
		<div class="bottom-actions-dock">
			<button class="btn-action btn-secondary" onclick="window.print()">🖨️ In / PDF</button>
			<button class="btn-action btn-zalo" onclick="sendZalo()">💬 Gửi Zalo</button>
			<button class="btn-action btn-primary" onclick="shareReceipt()">🔗 Chia sẻ</button>
		</div>
	</div>

	<script>
		// Lưu lịch sử hóa đơn vừa xem vào localStorage
		(function() {
			try {
				var code = '%s';
				var store = '%s';
				var total = '%s';
				if (code) {
					var raw = localStorage.getItem('ongchu_bill_history');
					var hist = raw ? JSON.parse(raw) : [];
					hist = hist.filter(function(x) { return x.code !== code; });
					hist.unshift({ code: code, store: store, total: total, time: new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) });
					if (hist.length > 5) hist = hist.slice(0, 5);
					localStorage.setItem('ongchu_bill_history', JSON.stringify(hist));
				}
			} catch(e) {}
		})();

		function sendZalo() {
			var code = '%s';
			var store = '%s';
			var total = '%s';
			var billUrl = window.location.href;
			var text = encodeURIComponent('Cảm ơn bạn đã ghé ' + store + '!\nHóa đơn điện tử ' + code + ' (' + total + '): ' + billUrl);
			
			var phone = prompt('Nhập SĐT Zalo người nhận (hoặc để trống để chọn bạn bè/nhóm Zalo):', '');
			if (phone === null) return; // Người dùng bấm Hủy
			
			phone = phone.trim().replace(/[^0-9]/g, '');
			if (phone.length >= 9) {
				window.open('https://zalo.me/' + phone + '?text=' + text, '_blank');
			} else {
				// Mở Zalo Share Intent / Dialog
				window.open('https://sp.zalo.me/share_inline?link=' + encodeURIComponent(billUrl) + '&title=' + encodeURIComponent('Hóa đơn ' + code + ' · ' + total), '_blank');
			}
		}

		function shareReceipt() {
			if (navigator.share) {
				navigator.share({
					title: 'Hóa đơn %s - %s',
					url: window.location.href
				}).catch(function(){});
			} else {
				navigator.clipboard.writeText(window.location.href).then(function() {
					alert('Đã sao chép liên kết hóa đơn!');
				});
			}
		}
	</script>
</body>
</html>`,
		html.EscapeString(order.OrderCode),
		html.EscapeString(settings.StoreName),
		html.EscapeString(order.OrderCode),
		html.EscapeString(order.OrderCode),
		formatVND(order.TotalAmount),
		html.EscapeString(settings.StoreName),
		html.EscapeString(tableName),
		html.EscapeString(statusStampText),
		statusStampClass,
		statusStampText,
		order.CreatedAt.Format("02/01/2006 15:04"),
		html.EscapeString(order.CashierName),
		html.EscapeString(settings.StoreName),
		storeMetaHTML,
		html.EscapeString(settings.ReceiptTitle),
		html.EscapeString(order.OrderCode),
		order.CreatedAt.Format("15:04 02/01/2006"),
		html.EscapeString(tableName),
		html.EscapeString(order.CashierName),
		itemsHTML.String(),
		formatVND(order.Subtotal),
		discountHTML,
		formatVND(order.TotalAmount),
		payMethodText,
		html.EscapeString(order.OrderCode),
		html.EscapeString(order.OrderCode),
		html.EscapeString(settings.ReceiptFooter),
		html.EscapeString(order.OrderCode),
		html.EscapeString(settings.StoreName),
		formatVND(order.TotalAmount),
		html.EscapeString(order.OrderCode),
		html.EscapeString(settings.StoreName),
		formatVND(order.TotalAmount),
		html.EscapeString(order.OrderCode),
		html.EscapeString(settings.StoreName),
	)

	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, htmlContent)
}

// RenderCheckBillPortal render trang cổng tìm kiếm tra cứu hóa đơn điện tử
func RenderCheckBillPortal(c *gin.Context) {
	htmlPortal := `<!DOCTYPE html>
<html lang="vi">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
	<title>Tra Cứu Hóa Đơn Điện Tử - OngChu Lean POS</title>
	<meta name="theme-color" content="#F5F2EB" media="(prefers-color-scheme: light)">
	<meta name="theme-color" content="#12100E" media="(prefers-color-scheme: dark)">
	<style>
		:root {
			--bg-body: #ECE6DC;
			--bg-canvas: #FCFBF8;
			--bg-subtle: #F4EFE6;
			--text-main: #1C1917;
			--text-muted: #57534E;
			--text-sub: #8C857E;
			--brand-accent: #B45309;
			--brand-accent-subtle: #FEF3C7;
			--brand-success: #15803D;
			--brand-danger: #B91C1C;
			--border-subtle: #E8E2D5;
			--border-dashed: #D4CBBA;
		}
		@media (prefers-color-scheme: dark) {
			:root {
				--bg-body: #0C0A09;
				--bg-canvas: #1A1512;
				--bg-subtle: #241D17;
				--text-main: #F4EFEA;
				--text-muted: #A8A29E;
				--text-sub: #78716C;
				--brand-accent: #D97706;
				--brand-accent-subtle: #452405;
				--brand-success: #22C55E;
				--brand-danger: #EF4444;
				--border-subtle: #332A22;
				--border-dashed: #453A30;
			}
		}
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			background-color: var(--bg-body);
			color: var(--text-main);
			line-height: 1.45;
			min-height: 100vh;
			-webkit-font-smoothing: antialiased;
			display: flex;
			flex-direction: column;
			align-items: center;
		}
		
		/* Khung bao cuộn giấy in nhiệt K80 */
		.k80-scroll-container {
			width: 100%;
			max-width: 440px;
			min-height: 100vh;
			display: flex;
			flex-direction: column;
			position: relative;
			background: var(--bg-canvas);
			box-shadow: 0 4px 25px rgba(0, 0, 0, 0.07);
		}
		@media (min-width: 641px) {
			body {
				padding: 24px 16px 48px;
			}
			.k80-scroll-container {
				min-height: auto;
				border-radius: 4px;
				overflow: hidden;
			}
		}

		/* Mép cắt răng cưa K80 (Tear Edge) */
		.tear-edge {
			width: 100%;
			height: 10px;
			display: block;
			color: var(--bg-canvas);
		}
		.top-tear {
			background: var(--bg-body);
			color: var(--bg-canvas);
		}
		.bottom-tear {
			background: var(--bg-body);
			color: var(--bg-canvas);
			transform: rotate(180deg);
		}

		/* Top Navigation Bar */
		.top-bar {
			position: sticky;
			top: 0;
			z-index: 30;
			background: rgba(252, 251, 248, 0.94);
			backdrop-filter: blur(16px);
			-webkit-backdrop-filter: blur(16px);
			border-bottom: 1px dashed var(--border-dashed);
			padding: max(10px, env(safe-area-inset-top)) 18px 10px;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		@media (prefers-color-scheme: dark) {
			.top-bar {
				background: rgba(26, 21, 18, 0.94);
			}
		}
		.top-brand {
			font-size: 13px;
			font-weight: 700;
			color: var(--brand-accent);
			letter-spacing: 0.5px;
		}
		.top-sub {
			font-size: 12px;
			font-weight: 600;
			color: var(--text-muted);
		}

		/* Thân trang tra cứu K80 */
		.k80-portal-body {
			padding: 24px 20px 28px;
			flex: 1;
		}

		/* Header tra cứu */
		.portal-header {
			text-align: center;
			padding-bottom: 18px;
			border-bottom: 1px dashed var(--border-dashed);
			margin-bottom: 20px;
		}
		.portal-stamp {
			display: inline-block;
			border: 1.5px dashed var(--brand-accent);
			border-radius: 4px;
			padding: 3px 12px;
			font-size: 11px;
			font-weight: 700;
			color: var(--brand-accent);
			letter-spacing: 1.5px;
			text-transform: uppercase;
			margin-bottom: 8px;
		}
		.portal-title {
			font-size: 20px;
			font-weight: 700;
			color: var(--text-main);
			letter-spacing: 0.8px;
			text-transform: uppercase;
			margin-bottom: 6px;
		}
		.portal-subtitle {
			font-size: 13px;
			color: var(--text-muted);
			line-height: 1.5;
		}

		/* Form nhập mã thông minh */
		.search-form {
			display: flex;
			flex-direction: column;
			gap: 14px;
		}
		.input-label-row {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
		}
		.input-label {
			font-size: 12px;
			font-weight: 700;
			color: var(--text-main);
			letter-spacing: 0.8px;
			text-transform: uppercase;
		}
		.input-hint {
			font-size: 11px;
			color: var(--text-muted);
		}

		/* Input Wrapper kèm nút dán Clipboard */
		.input-wrapper {
			position: relative;
			display: flex;
			align-items: center;
		}
		.search-input {
			width: 100%;
			height: 52px;
			padding: 0 74px 0 16px;
			font-size: 17px;
			font-weight: 700;
			border-radius: 8px;
			border: 1.5px solid var(--border-subtle);
			background: var(--bg-subtle);
			color: var(--text-main);
			text-transform: uppercase;
			letter-spacing: 1px;
			font-variant-numeric: tabular-nums;
			outline: none;
			transition: all 0.2s;
		}
		.search-input:focus {
			border-color: var(--brand-accent);
			background: var(--bg-canvas);
			box-shadow: 0 0 0 3px rgba(180, 83, 9, 0.12);
		}
		.btn-paste {
			position: absolute;
			right: 8px;
			top: 50%;
			transform: translateY(-50%);
			background: var(--bg-canvas);
			border: 1px solid var(--border-subtle);
			color: var(--brand-accent);
			padding: 6px 10px;
			border-radius: 6px;
			font-size: 12px;
			font-weight: 700;
			cursor: pointer;
			display: flex;
			align-items: center;
			gap: 4px;
		}
		.btn-paste:hover {
			background: var(--brand-accent-subtle);
		}

		/* Nút Tra cứu chính */
		.btn-submit {
			background: var(--brand-accent);
			color: #FFFFFF;
			height: 50px;
			border-radius: 8px;
			font-size: 15px;
			font-weight: 700;
			border: none;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			letter-spacing: 0.5px;
			box-shadow: 0 3px 12px rgba(180, 83, 9, 0.25);
			transition: all 0.15s;
		}
		.btn-submit:active {
			transform: scale(0.98);
		}

		/* Lịch sử hóa đơn dạng thẻ K80 mini */
		.history-section {
			margin-top: 24px;
			padding-top: 18px;
			border-top: 1px dashed var(--border-dashed);
			display: none;
		}
		.history-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 12px;
		}
		.history-title {
			font-size: 11px;
			font-weight: 700;
			color: var(--text-muted);
			letter-spacing: 1px;
			text-transform: uppercase;
		}
		.history-clear {
			font-size: 11px;
			color: var(--brand-accent);
			cursor: pointer;
			text-decoration: none;
			font-weight: 600;
		}

		/* Thẻ K80 Mini Receipt */
		.history-list {
			display: flex;
			flex-direction: column;
			gap: 8px;
		}
		.mini-k80-card {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 12px 14px;
			background: var(--bg-subtle);
			border: 1px dashed var(--border-dashed);
			border-radius: 8px;
			text-decoration: none;
			color: var(--text-main);
			transition: all 0.15s;
		}
		.mini-k80-card:hover {
			border-color: var(--brand-accent);
			background: var(--bg-canvas);
		}
		.mini-card-left {
			display: flex;
			flex-direction: column;
			gap: 3px;
		}
		.mini-code {
			font-size: 14px;
			font-weight: 700;
			color: var(--text-main);
			letter-spacing: 0.5px;
			font-variant-numeric: tabular-nums;
		}
		.mini-meta {
			font-size: 12px;
			color: var(--text-muted);
		}
		.mini-card-right {
			display: flex;
			align-items: center;
			gap: 8px;
		}
		.mini-total {
			font-size: 15px;
			font-weight: 700;
			color: var(--brand-accent);
			font-variant-numeric: tabular-nums;
		}
		.mini-arrow {
			font-size: 14px;
			color: var(--text-sub);
		}

		/* Chân trang */
		.footer-note {
			margin-top: 28px;
			font-size: 12px;
			color: var(--text-muted);
			text-align: center;
			line-height: 1.5;
			border-top: 1px dashed var(--border-dashed);
			padding-top: 16px;
		}
		.footer-powered {
			font-size: 11px;
			color: var(--text-sub);
			text-align: center;
			margin-top: 6px;
			padding-bottom: 8px;
		}
	</style>
</head>
<body>
	<div class="k80-scroll-container">
		<!-- Mép răng cưa K80 trên -->
		<svg class="tear-edge top-tear" viewBox="0 0 480 12" preserveAspectRatio="none">
			<path d="M0,12 L8,0 L16,12 L24,0 L32,12 L40,0 L48,12 L56,0 L64,12 L72,0 L80,12 L88,0 L96,12 L104,0 L112,12 L120,0 L128,12 L136,0 L144,12 L152,0 L160,12 L168,0 L176,12 L184,0 L192,12 L200,0 L208,12 L216,0 L224,12 L232,0 L240,12 L248,0 L256,12 L264,0 L272,12 L280,0 L288,12 L296,0 L304,12 L312,0 L320,12 L328,0 L336,12 L344,0 L352,12 L360,0 L368,12 L376,0 L384,12 L392,0 L400,12 L408,0 L416,12 L424,0 L432,12 L440,0 L448,12 L456,0 L464,12 L472,0 L480,12 Z" fill="currentColor"/>
		</svg>

		<!-- Top Bar -->
		<div class="top-bar">
			<span class="top-brand">⚡ ONGCHU POS</span>
			<span class="top-sub">Cổng e-Receipt K80</span>
		</div>

		<div class="k80-portal-body">
			<div class="portal-header">
				<div class="portal-stamp">★ TRA CỨU HÓA ĐƠN ★</div>
				<h1 class="portal-title">TRA CỨU HÓA ĐƠN ĐIỆN TỬ</h1>
				<p class="portal-subtitle">Nhập mã hóa đơn in trên phiếu thanh toán để xem chi tiết món, giá tiền và xuất bill.</p>
			</div>

			<form class="search-form" onsubmit="handleLookup(event)">
				<div class="input-label-row">
					<label class="input-label" for="orderCode">MÃ HÓA ĐƠN</label>
					<span class="input-hint">Ví dụ: HD-260920-069</span>
				</div>

				<div class="input-wrapper">
					<input
						type="text"
						id="orderCode"
						class="search-input"
						placeholder="HD-XXXX..."
						autocapitalize="characters"
						autofocus
						required
					/>
					<button type="button" class="btn-paste" onclick="pasteFromClipboard()">
						📋 Dán
					</button>
				</div>

				<button type="submit" class="btn-submit">
					🔍 Tra Cứu Hóa Đơn
				</button>
			</form>

			<!-- Danh sách Hóa đơn gần đây (K80 Mini Receipts) -->
			<div class="history-section" id="historySection">
				<div class="history-header">
					<span class="history-title">HÓA ĐƠN VỪA XEM</span>
					<span class="history-clear" onclick="clearHistory()">Xóa lịch sử</span>
				</div>
				<div class="history-list" id="historyList"></div>
			</div>

			<div class="footer-note">
				Tra cứu trực tiếp không cần đăng nhập · Bảo vệ môi trường với e-Receipt K80
			</div>
			<div class="footer-powered">
				Hệ sinh thái <strong>OngChu Lean POS</strong>
			</div>
		</div>

		<!-- Mép răng cưa K80 dưới -->
		<svg class="tear-edge bottom-tear" viewBox="0 0 480 12" preserveAspectRatio="none">
			<path d="M0,12 L8,0 L16,12 L24,0 L32,12 L40,0 L48,12 L56,0 L64,12 L72,0 L80,12 L88,0 L96,12 L104,0 L112,12 L120,0 L128,12 L136,0 L144,12 L152,0 L160,12 L168,0 L176,12 L184,0 L192,12 L200,0 L208,12 L216,0 L224,12 L232,0 L240,12 L248,0 L256,12 L264,0 L272,12 L280,0 L288,12 L296,0 L304,12 L312,0 L320,12 L328,0 L336,12 L344,0 L352,12 L360,0 L368,12 L376,0 L384,12 L392,0 L400,12 L408,0 L416,12 L424,0 L432,12 L440,0 L448,12 L456,0 L464,12 L472,0 L480,12 Z" fill="currentColor"/>
		</svg>
	</div>

	<script>
		// Tải lịch sử tra cứu gần đây từ localStorage
		(function() {
			try {
				var raw = localStorage.getItem('ongchu_bill_history');
				if (raw) {
					var list = JSON.parse(raw);
					if (Array.isArray(list) && list.length > 0) {
						var sec = document.getElementById('historySection');
						var container = document.getElementById('historyList');
						sec.style.display = 'block';
						container.innerHTML = list.map(function(item) {
							var storeText = item.store ? item.store + ' · ' : '';
							var timeText = item.time || '';
							return '<a class="mini-k80-card" href="/b/' + encodeURIComponent(item.code) + '">' +
								'<div class="mini-card-left">' +
									'<div class="mini-code">' + item.code + '</div>' +
									'<div class="mini-meta">' + storeText + timeText + '</div>' +
								'</div>' +
								'<div class="mini-card-right">' +
									'<div class="mini-total">' + (item.total || '') + '</div>' +
									'<div class="mini-arrow">→</div>' +
								'</div>' +
							'</a>';
						}).join('');
					}
				}
			} catch(e) {}
		})();

		function clearHistory() {
			localStorage.removeItem('ongchu_bill_history');
			var sec = document.getElementById('historySection');
			if (sec) sec.style.display = 'none';
		}

		function pasteFromClipboard() {
			if (navigator.clipboard && navigator.clipboard.readText) {
				navigator.clipboard.readText().then(function(text) {
					if (text) {
						var val = text.trim().toUpperCase();
						// Nếu clipboard là URL (vd https://ongchu.cloud/b/HD-260920-069) -> trích xuất mã đơn
						var match = val.match(/\/b\/([A-Z0-9_-]+)/i);
						if (match && match[1]) {
							val = match[1];
						}
						var el = document.getElementById('orderCode');
						if (el) {
							el.value = val;
							el.focus();
						}
					}
				}).catch(function() {
					alert('Vui lòng cấp quyền truy cập bộ nhớ tạm hoặc dán thủ công!');
				});
			} else {
				alert('Trình duyệt không hỗ trợ dán tự động, vui lòng dán thủ công vào ô nhập!');
			}
		}

		function handleLookup(e) {
			e.preventDefault();
			var raw = (document.getElementById('orderCode').value || '').trim().toUpperCase();
			if (!raw) return;

			// Tự động thêm tiền tố HD- nếu người dùng chỉ gõ số/chuỗi không có tiền tố
			var code = raw;
			if (!code.startsWith('HD-') && !code.startsWith('ORD-')) {
				code = 'HD-' + code;
			}
			window.location.href = '/b/' + encodeURIComponent(code);
		}
	</script>
</body>
</html>`

	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, htmlPortal)
}

