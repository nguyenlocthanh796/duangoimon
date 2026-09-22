package handler

import (
	"crypto/subtle"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/websocket"
)

// BankTransferWebhookPayload hỗ trợ cả chuẩn SePay, Casso và chuẩn rút gọn
type BankTransferWebhookPayload struct {
	ID              interface{} `json:"id"`
	Gateway         string      `json:"gateway"`
	TransactionDate string      `json:"transactionDate"`
	AccountNumber   string      `json:"accountNumber"`
	Code            string      `json:"code"`
	Content         string      `json:"content"`
	TransferType    string      `json:"transferType"`
	TransferAmount  float64     `json:"transferAmount"`
	Accumulated     float64     `json:"accumulated"`
	ReferenceCode   string      `json:"referenceCode"`
	Description     string      `json:"description"`
	Amount          float64     `json:"amount"`
}

var orderCodeRegex = regexp.MustCompile(`(?i)(HD-?\d+|CH[OỜ]-?\d+|BAN-?\d+)`)

// ExtractOrderCode tìm kiếm mã đơn hàng hoặc bàn trong nội dung chuyển khoản
func ExtractOrderCode(content string) string {
	if content == "" {
		return ""
	}
	match := orderCodeRegex.FindString(content)
	if match != "" {
		return strings.ToUpper(match)
	}
	return ""
}

// HandleBankTransferWebhook tiếp nhận thông báo biến động số dư ngân hàng (SePay / Casso)
func HandleBankTransferWebhook(c *gin.Context) {
	// ponytail: Bảo mật webhook chống bắn giả lập số dư ngân hàng từ bên ngoài
	webhookToken := strings.TrimSpace(c.GetHeader("X-Webhook-Token"))
	authHeader := strings.TrimSpace(c.GetHeader("Authorization"))

	expectedToken := strings.TrimSpace(os.Getenv("WEBHOOK_SECRET"))
	if expectedToken == "" {
		if gin.Mode() == gin.ReleaseMode {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Webhook secret chua duoc cau hinh tren may chu"})
			return
		}
		expectedToken = "ongchu_webhook_secret_2026"
	}

	// Xác thực token an toàn chống timing attack
	tokenMatched := false
	if webhookToken != "" && subtle.ConstantTimeCompare([]byte(webhookToken), []byte(expectedToken)) == 1 {
		tokenMatched = true
	}
	if !tokenMatched && authHeader != "" {
		expectedBearer := "Bearer " + expectedToken
		expectedApiKey := "Apikey " + expectedToken
		if subtle.ConstantTimeCompare([]byte(authHeader), []byte(expectedBearer)) == 1 ||
			subtle.ConstantTimeCompare([]byte(authHeader), []byte(expectedApiKey)) == 1 {
			tokenMatched = true
		}
	}

	if !tokenMatched {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Webhook token khong chinh xac hoac khong duoc uy quyen"})
		return
	}

	var payload BankTransferWebhookPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu webhook không hợp lệ: " + err.Error()})
		return
	}

	amount := payload.TransferAmount
	if amount == 0 && payload.Amount > 0 {
		amount = payload.Amount
	}

	content := payload.Content
	if content == "" {
		content = payload.Description
	}

	matchedCode := ExtractOrderCode(content)
	gateway := payload.Gateway
	if gateway == "" {
		gateway = "VietQR Napas247"
	}

	eventData := gin.H{
		"gateway":            gateway,
		"amount":             amount,
		"content":            content,
		"matched_order_code": matchedCode,
		"reference_code":     payload.ReferenceCode,
		"account_number":     payload.AccountNumber,
		"time":               time.Now().Format("15:04:05"),
	}

	// Phát WebSocket realtime tới tất cả thiết bị (POS, Tablet, KDS, CFD)
	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type": "BANK_TRANSFER_RECEIVED",
		"data": eventData,
	})

	c.JSON(http.StatusOK, gin.H{
		"success":            true,
		"message":            "Đã nhận và phân phối giao dịch chuyển khoản thành công",
		"matched_order_code": matchedCode,
		"amount":             amount,
	})
}

// SimulateBankTransfer cho phép giả lập bắn giao dịch chuyển khoản để kiểm thử loa báo
func SimulateBankTransfer(c *gin.Context) {
	if gin.Mode() == gin.ReleaseMode {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Chức năng giả lập thanh toán bị vô hiệu hóa trên môi trường Production",
		})
		return
	}

	var req struct {
		Amount    float64 `json:"amount"`
		OrderCode string  `json:"order_code"`
		Gateway   string  `json:"gateway"`
		Content   string  `json:"content"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Amount <= 0 {
		req.Amount = 45000
	}
	if req.Gateway == "" {
		req.Gateway = "MBBank"
	}
	if req.OrderCode == "" {
		req.OrderCode = "HD-0012"
	}
	if req.Content == "" {
		req.Content = req.OrderCode + " chuyen khoan tien an"
	}

	eventData := gin.H{
		"gateway":            req.Gateway,
		"amount":             req.Amount,
		"content":            req.Content,
		"matched_order_code": req.OrderCode,
		"reference_code":     "SIM-" + time.Now().Format("150405"),
		"time":               time.Now().Format("15:04:05"),
	}

	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type": "BANK_TRANSFER_RECEIVED",
		"data": eventData,
	})

	c.JSON(http.StatusOK, gin.H{
		"success":            true,
		"message":            "Đã giả lập giao dịch chuyển khoản thành công",
		"matched_order_code": req.OrderCode,
		"amount":             req.Amount,
	})
}
