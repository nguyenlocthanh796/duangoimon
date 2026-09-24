package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/websocket"
	"gorm.io/gorm"
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

var (
	orderCodeRegex          = regexp.MustCompile(`(?i)(HD-?\d+|CH[OỜ]-?\d+|BAN-?\d+)`)
	processedTxMu           sync.Mutex
	processedTxHistory      = make(map[string]time.Time) // referenceCode -> processedAt
)

// isDuplicateTransaction kiểm tra chống phát lại giao dịch chuyển khoản (Replay Protection)
func isDuplicateTransaction(ref string) bool {
	if ref == "" {
		return false
	}
	processedTxMu.Lock()
	defer processedTxMu.Unlock()

	now := time.Now()
	// Dọn dẹp cache cũ > 24h
	for k, t := range processedTxHistory {
		if now.Sub(t) > 24*time.Hour {
			delete(processedTxHistory, k)
		}
	}

	if _, exists := processedTxHistory[ref]; exists {
		return true
	}
	processedTxHistory[ref] = now
	return false
}

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

// HandleBankTransferWebhook tiếp nhận thông báo biến động số dư ngân hàng (SePay / Casso / HMAC Webhooks)
func HandleBankTransferWebhook(c *gin.Context) {
	expectedToken := strings.TrimSpace(os.Getenv("WEBHOOK_SECRET"))
	if expectedToken == "" {
		if gin.Mode() == gin.ReleaseMode {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Webhook secret chua duoc cau hinh tren may chu"})
			return
		}
		expectedToken = "ongchu_dev_webhook_secret_2026"
	}

	rawBody, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Không thể đọc nội dung webhook"})
		return
	}

	// 1. Kiểm tra Phương thức Xác thực (Fail-Closed: Thiếu hoặc sai bất kỳ yếu tố nào đều bị từ chối 401 ngay)
	sigHeader := strings.TrimSpace(c.GetHeader("X-Webhook-Signature"))
	tsHeader := strings.TrimSpace(c.GetHeader("X-Webhook-Timestamp"))
	webhookToken := strings.TrimSpace(c.GetHeader("X-Webhook-Token"))
	authHeader := strings.TrimSpace(c.GetHeader("Authorization"))

	authenticated := false

	if sigHeader != "" || tsHeader != "" {
		// Bắt buộc phải có cả Signature và Timestamp
		if sigHeader == "" || tsHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Thiếu X-Webhook-Signature hoặc X-Webhook-Timestamp"})
			return
		}

		ts, err := strconv.ParseInt(tsHeader, 10, 64)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Định dạng timestamp không hợp lệ"})
			return
		}

		now := time.Now().Unix()
		// Cửa sổ chống Replay: Bắt buộc chênh lệch trong khoảng ±300 giây
		if now-ts > 300 || ts-now > 300 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Webhook timestamp đã hết hạn hoặc trôi thời gian quá 300s"})
			return
		}

		mac := hmac.New(sha256.New, []byte(expectedToken))
		mac.Write([]byte(tsHeader + "." + string(rawBody)))
		expectedSig := hex.EncodeToString(mac.Sum(nil))

		if subtle.ConstantTimeCompare([]byte(sigHeader), []byte(expectedSig)) != 1 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Chữ ký webhook không chính xác"})
			return
		}
		authenticated = true
	} else if webhookToken != "" || authHeader != "" {
		// Fallback sang Token header tĩnh (Casso / SePay token)
		if webhookToken != "" && subtle.ConstantTimeCompare([]byte(webhookToken), []byte(expectedToken)) == 1 {
			authenticated = true
		}
		if !authenticated && authHeader != "" {
			expectedBearer := "Bearer " + expectedToken
			expectedApiKey := "Apikey " + expectedToken
			if subtle.ConstantTimeCompare([]byte(authHeader), []byte(expectedBearer)) == 1 ||
				subtle.ConstantTimeCompare([]byte(authHeader), []byte(expectedApiKey)) == 1 {
				authenticated = true
			}
		}
		if !authenticated {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Webhook token không chính xác"})
			return
		}
	} else {
		// Không có bất kỳ thông tin xác thực nào -> FAIL CLOSED
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Yêu cầu xác thực webhook (missing signature / token)"})
		return
	}

	var payload BankTransferWebhookPayload
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu webhook không hợp lệ: " + err.Error()})
		return
	}

	refCode := strings.TrimSpace(payload.ReferenceCode)
	if refCode == "" && payload.Code != "" {
		refCode = payload.Code
	}
	if refCode == "" && payload.ID != nil {
		refCode = fmt.Sprintf("%v", payload.ID)
	}
	if refCode == "" {
		h := sha256.Sum256(rawBody)
		refCode = "TX_" + hex.EncodeToString(h[:8])
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

	// Xác định tenant thẩm quyền từ đơn hàng thực tế trong CSDL
	targetTenant := "tenant_ongchu"
	var matchedOrder models.Order
	if database.DB != nil && matchedCode != "" {
		if err := database.DB.Where("order_code = ? OR id = ?", matchedCode, matchedCode).First(&matchedOrder).Error; err == nil {
			if matchedOrder.TenantID != "" {
				targetTenant = matchedOrder.TenantID
			}
		}
	}

	// Composite Idempotency Key chống xung đột mã giữa các bên tích hợp: provider:tenant:refCode
	compositeKey := fmt.Sprintf("%s:%s:%s", gateway, targetTenant, refCode)

	// Chống tấn công Replay webhook bằng Idempotency Key & Cập nhật trạng thái trong 1 DB Transaction nguyên tử
	if database.DB != nil {
		idempKey := models.PaymentIdempotencyKey{
			ID:            compositeKey,
			TenantID:      targetTenant,
			ReferenceCode: refCode,
			Amount:        amount,
			Status:        "PROCESSED",
			CreatedAt:     time.Now(),
		}

		// Khởi tạo Transaction nguyên tử: ghi nhận Idempotency Key + chuyển đổi trạng thái tài chính đơn hàng
		txErr := database.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&idempKey).Error; err != nil {
				return err // Duplicate key vi phạm Unique constraint -> Rollback & Return error
			}
			// Nếu tìm thấy đơn hàng tương ứng, cập nhật trạng thái thanh toán ngay trong transaction
			if matchedOrder.ID != "" && matchedOrder.Status != "da_thanh_toan" {
				now := time.Now()
				if err := tx.Model(&matchedOrder).Updates(map[string]interface{}{
					"status":         "da_thanh_toan",
					"payment_method": "chuyen_khoan_vietqr",
					"paid_amount":    amount,
					"paid_at":        &now,
				}).Error; err != nil {
					return err
				}
			}
			return nil
		})

		if txErr != nil {
			// Transaction thất bại do Duplicate Key -> Trả về Idempotent response mà không có side-effect dư thừa
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "Giao dịch đã được xử lý trước đó (DB Atomic Idempotent duplicate ignored)",
				"ref":     refCode,
			})
			return
		}
	} else {
		// Fallback in-memory deduplication khi không có DB
		if isDuplicateTransaction(refCode) {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "Giao dịch đã được xử lý trước đó (In-memory duplicate ignored)",
				"ref":     refCode,
			})
			return
		}
	}

	eventData := gin.H{
		"gateway":            gateway,
		"amount":             amount,
		"content":            content,
		"matched_order_code": matchedCode,
		"reference_code":     refCode,
		"account_number":     payload.AccountNumber,
		"time":               time.Now().Format("15:04:05"),
	}

	if targetTenant != "" && targetTenant != "tenant_ongchu" {
		websocket.GlobalHub.BroadcastToTenant(targetTenant, "BANK_TRANSFER_RECEIVED", eventData)
	} else {
		// Nếu không tìm thấy đơn, kiểm tra tenant theo số tài khoản ngân hàng cấu hình trong POSSettings
		if database.DB != nil && payload.AccountNumber != "" {
			var setting models.POSSettings
			if err := database.DB.Where("vietqr_account_number = ? OR bank_account = ?", payload.AccountNumber, payload.AccountNumber).First(&setting).Error; err == nil && setting.TenantID != "" {
				targetTenant = setting.TenantID
			}
		}
		if targetTenant == "" {
			targetTenant = "tenant_ongchu"
		}
		websocket.GlobalHub.BroadcastToTenant(targetTenant, "BANK_TRANSFER_RECEIVED", eventData)
	}

	c.JSON(http.StatusOK, gin.H{
		"success":            true,
		"message":            "Đã nhận và phân phối giao dịch chuyển khoản thành công",
		"matched_order_code": matchedCode,
		"amount":             amount,
		"tenant_id":          targetTenant,
	})
}

// SimulateBankTransfer cho phép giả lập bắn giao dịch chuyển khoản để kiểm thử loa báo (Dev / Test only)
func SimulateBankTransfer(c *gin.Context) {
	if gin.Mode() == gin.ReleaseMode || strings.ToLower(os.Getenv("ENV")) == "production" {
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
		TenantID  string  `json:"tenant_id"`
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
	tenantID := req.TenantID
	if tenantID == "" {
		tenantID = "tenant_ongchu"
	}

	eventData := gin.H{
		"gateway":            req.Gateway,
		"amount":             req.Amount,
		"content":            req.Content,
		"matched_order_code": req.OrderCode,
		"reference_code":     "SIM-" + time.Now().Format("150405"),
		"time":               time.Now().Format("15:04:05"),
	}

	websocket.GlobalHub.BroadcastToTenant(tenantID, "BANK_TRANSFER_RECEIVED", eventData)

	c.JSON(http.StatusOK, gin.H{
		"success":            true,
		"message":            "Đã giả lập giao dịch chuyển khoản thành công",
		"matched_order_code": req.OrderCode,
		"amount":             req.Amount,
	})
}
