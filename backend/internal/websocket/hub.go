package websocket

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/ongchu/pos-backend/internal/auth"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10 // 54s ping interval
	maxMessageSize = 512 * 1024          // 512KB
)

var lanOriginRe = regexp.MustCompile(`^https?://([0-9.]+)(?::\d+)?$`)

var upgrader = websocket.Upgrader{
	ReadBufferSize:    1024,
	WriteBufferSize:   1024,
	EnableCompression: true,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true // Native mobile apps, desktop clients, local CLI
		}
		if strings.HasPrefix(origin, "http://localhost") || strings.HasPrefix(origin, "http://127.0.0.1") {
			return true
		}
		if strings.Contains(origin, "ongchu.cloud") || strings.Contains(origin, "116.118.3.48") {
			return true
		}
		for _, allowed := range strings.Split(os.Getenv("ALLOWED_CORS_ORIGINS"), ",") {
			if allowed != "" && origin == strings.TrimSpace(allowed) {
				return true
			}
		}
		if m := lanOriginRe.FindStringSubmatch(origin); m != nil {
			ip := net.ParseIP(m[1])
			if ip != nil && (ip.IsPrivate() || ip.IsLoopback()) {
				return true
			}
		}
		// If in release mode, reject unauthorized external origins
		if os.Getenv("GIN_MODE") == "release" {
			log.Printf("🚨 [WS REJECT] Unauthorized WebSocket Origin: %s", origin)
			return false
		}
		return true
	},
}

type Client struct {
	ID        string
	TenantID  string
	BranchID  string
	UserID    string
	Role      string
	Conn      *websocket.Conn
	Send      chan []byte
	closeOnce sync.Once
}

// CloseSend safely closes the Send channel strictly once to prevent double-close panic
func (c *Client) CloseSend() {
	c.closeOnce.Do(func() {
		close(c.Send)
	})
}

type Hub struct {
	Clients    map[*Client]bool
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	mu         sync.RWMutex
}

var GlobalHub = &Hub{
	Clients:    make(map[*Client]bool),
	Broadcast:  make(chan []byte, 256),
	Register:   make(chan *Client, 64),
	Unregister: make(chan *Client, 64),
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client] = true
			total := len(h.Clients)
			h.mu.Unlock()
			log.Printf("🔌 WebSocket Client connected (Tenant: %s, Total: %d)", client.TenantID, total)

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				client.CloseSend()
			}
			total := len(h.Clients)
			h.mu.Unlock()
			log.Printf("🔌 WebSocket Client disconnected (Tenant: %s, Remaining: %d)", client.TenantID, total)

		case message := <-h.Broadcast:
			// BroadcastToTenant / BroadcastToBranch handles tenant-scoped routing
			h.mu.RLock()
			for client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					client.CloseSend()
					delete(h.Clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastJSON sends a typed payload (Deprecated for tenant data, only for system-wide health)
func (h *Hub) BroadcastJSON(v interface{}) {
	payload, err := json.Marshal(v)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.Clients {
		select {
		case client.Send <- payload:
		default:
		}
	}
}

// CanonicalTenantID chuẩn hóa mã tenant để định tuyến broadcast chuẩn xác
func CanonicalTenantID(raw string) string {
	clean := strings.ToLower(strings.TrimSpace(raw))
	if clean == "" || clean == "default" {
		return "tenant_ongchu"
	}
	if !strings.HasPrefix(clean, "tenant_") {
		return "tenant_" + clean
	}
	return clean
}

// BroadcastToTenant phát thông điệp CHỈ tới các thiết bị thuộc TenantID tương ứng
func (h *Hub) BroadcastToTenant(tenantID string, eventType string, data interface{}) {
	normTenant := CanonicalTenantID(tenantID)
	msg := gin.H{
		"type":      eventType,
		"tenant_id": normTenant,
		"data":      data,
		"timestamp": time.Now().Unix(),
	}

	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling tenant websocket message: %v", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.Clients {
		if CanonicalTenantID(client.TenantID) == normTenant {
			select {
			case client.Send <- payload:
			default:
				log.Printf("⚠️ WebSocket client queue full for tenant %s", normTenant)
			}
		}
	}
}

// BroadcastToBranch phát thông điệp CHỈ tới các thiết bị thuộc Chi Nhánh cụ thể
func (h *Hub) BroadcastToBranch(tenantID string, branchID string, eventType string, data interface{}) {
	normTenant := CanonicalTenantID(tenantID)
	normBranch := strings.TrimSpace(branchID)

	msg := gin.H{
		"type":      eventType,
		"tenant_id": normTenant,
		"branch_id": normBranch,
		"data":      data,
		"timestamp": time.Now().Unix(),
	}

	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling branch websocket message: %v", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.Clients {
		if CanonicalTenantID(client.TenantID) == normTenant {
			if normBranch != "" && client.BranchID != "" && client.BranchID != normBranch {
				continue
			}
			select {
			case client.Send <- payload:
			default:
				log.Printf("⚠️ WebSocket client queue full for tenant %s branch %s", tenantID, branchID)
			}
		}
	}
}

// BroadcastToTenantBranch alias cho BroadcastToBranch
func (h *Hub) BroadcastToTenantBranch(tenantID string, branchID string, eventType string, data interface{}) {
	h.BroadcastToBranch(tenantID, branchID, eventType, data)
}

// BroadcastFromClient phát thông điệp từ 1 client CHỈ tới các clients khác thuộc cùng TenantID
func (h *Hub) BroadcastFromClient(sender *Client, message []byte) {
	senderTenant := CanonicalTenantID(sender.TenantID)

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.Clients {
		if client == sender {
			continue // Không echo ngược lại chính máy gửi
		}
		cTenant := CanonicalTenantID(client.TenantID)
		if cTenant == senderTenant {
			select {
			case client.Send <- message:
			default:
				log.Printf("⚠️ WebSocket client queue full for tenant %s", senderTenant)
			}
		}
	}
}

func HandleWebSocket(c *gin.Context) {
	tokenStr := c.Query("token")
	if tokenStr == "" {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 {
				tokenStr = parts[1]
			} else {
				tokenStr = authHeader
			}
		}
	}

	var authenticatedTenant string
	var authenticatedBranch string
	var authenticatedUser string
	var authenticatedRole string

	if tokenStr != "" {
		claims, err := auth.VerifyAccessToken(tokenStr)
		if err == nil && claims != nil {
			authenticatedTenant = claims.TenantID
			authenticatedBranch = claims.BranchID
			authenticatedUser = claims.UserID
			authenticatedRole = claims.Role
		}
	}

	// Fallback cho Public CFD, KDS hoặc Client chuyển giao Token mà không làm đứt kết nối WebSocket
	if authenticatedTenant == "" {
		authenticatedTenant = CanonicalTenantID(c.DefaultQuery("tenant_id", "default"))
		authenticatedBranch = c.DefaultQuery("branch_id", "default")
		authenticatedRole = "guest_display"
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade websocket: %v", err)
		return
	}

	client := &Client{
		ID:       c.Query("client_id"),
		TenantID: authenticatedTenant,
		BranchID: authenticatedBranch,
		UserID:   authenticatedUser,
		Role:     authenticatedRole,
		Conn:     conn,
		Send:     make(chan []byte, 256),
	}

	GlobalHub.Register <- client

	// Reader pump: processes incoming messages and handles pong heartbeat
	go func() {
		defer func() {
			GlobalHub.Unregister <- client
			client.Conn.Close()
		}()

		client.Conn.SetReadLimit(maxMessageSize)
		_ = client.Conn.SetReadDeadline(time.Now().Add(pongWait))
		client.Conn.SetPongHandler(func(string) error {
			_ = client.Conn.SetReadDeadline(time.Now().Add(pongWait))
			return nil
		})

		for {
			_, message, err := client.Conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("WebSocket read error: %v", err)
				}
				break
			}
			_ = client.Conn.SetReadDeadline(time.Now().Add(pongWait))

			// Xử lý Ping từ Client
			var rawMsg struct {
				Type string `json:"type"`
			}
			if err := json.Unmarshal(message, &rawMsg); err == nil && rawMsg.Type == "ping" {
				select {
				case client.Send <- []byte(`{"type":"pong"}`):
				default:
				}
				continue
			}

			// Broadcast message CHỈ tới clients cùng TenantID
			GlobalHub.BroadcastFromClient(client, message)
		}
	}()

	// Writer pump: sends messages and periodic ping heartbeat
	go func() {
		ticker := time.NewTicker(pingPeriod)
		defer func() {
			ticker.Stop()
			client.Conn.Close()
		}()

		for {
			select {
			case message, ok := <-client.Send:
				_ = client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
				if !ok {
					_ = client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}

				w, err := client.Conn.NextWriter(websocket.TextMessage)
				if err != nil {
					return
				}
				if _, err := w.Write(message); err != nil {
					return
				}
				if err := w.Close(); err != nil {
					return
				}

			case <-ticker.C:
				_ = client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
				if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}
	}()
}
