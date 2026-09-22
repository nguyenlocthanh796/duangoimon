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
			return true // Mobile native app, desktop app, local CLI
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
		return true // Cho phép kết nối an toàn cho tất cả thiết bị POS/KDS
	},
}

type Client struct {
	ID        string
	TenantID  string
	BranchID  string
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
			log.Printf("🔌 WebSocket Client connected (Total: %d)", total)

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				client.CloseSend()
			}
			total := len(h.Clients)
			h.mu.Unlock()
			log.Printf("🔌 WebSocket Client disconnected (Total: %d)", total)

		case message := <-h.Broadcast:
			h.mu.Lock()
			for client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					client.CloseSend()
					delete(h.Clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) BroadcastJSON(v interface{}) {
	bytes, err := json.Marshal(v)
	if err == nil {
		select {
		case h.Broadcast <- bytes:
		default:
			log.Printf("⚠️ WebSocket broadcast channel full, dropping message")
		}
	}
}

// BroadcastToAll phát thông điệp kèm type, timestamp_ms và payload tới toàn bộ clients
func (h *Hub) BroadcastToAll(eventType string, data interface{}) {
	nowMs := time.Now().UnixMilli()
	h.BroadcastJSON(gin.H{
		"type":         eventType,
		"timestamp_ms": nowMs,
		"data":         data,
	})
}

// CanonicalTenantID chuẩn hóa mã định danh quán về dạng chuẩn (Canonical)
func CanonicalTenantID(t string) string {
	clean := strings.TrimSpace(strings.ToLower(t))
	if clean == "" || clean == "tenant-default" || clean == "default" || clean == "tenant_ongchu" || clean == "ongchu" {
		return "tenant_ongchu"
	}
	if clean == "quanquan" || clean == "tenant_quanquan" {
		return "tenant_quanquan"
	}
	if clean == "trabong" || clean == "tenant_tra_bong" {
		return "tenant_tra_bong"
	}
	if clean == "phoco" || clean == "tenant_cafe_pho_co" {
		return "tenant_cafe_pho_co"
	}
	if clean == "phothin" || clean == "tenant_pho_thin" {
		return "tenant_pho_thin"
	}
	if clean == "banhmihp" || clean == "tenant_banhmi_hp" {
		return "tenant_banhmi_hp"
	}
	return clean
}

// BroadcastToTenant phát thông điệp tới tất cả clients thuộc đúng TenantID
func (h *Hub) BroadcastToTenant(tenantID string, eventType string, data any) {
	h.BroadcastToTenantBranch(tenantID, "", eventType, data)
}

// BroadcastToTenantBranch phát thông điệp tới clients thuộc đúng TenantID và BranchID
func (h *Hub) BroadcastToTenantBranch(tenantID string, branchID string, eventType string, data any) {
	nowMs := time.Now().UnixMilli()
	payload, err := json.Marshal(map[string]any{
		"type":         eventType,
		"tenant_id":    tenantID,
		"branch_id":    branchID,
		"timestamp_ms": nowMs,
		"data":         data,
	})
	if err != nil {
		return
	}

	targetTenant := CanonicalTenantID(tenantID)

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.Clients {
		cTenant := CanonicalTenantID(client.TenantID)
		if cTenant == targetTenant {
			if branchID != "" && client.BranchID != "" && client.BranchID != "default" && client.BranchID != branchID {
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
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade websocket: %v", err)
		return
	}

	rawTenant := c.DefaultQuery("tenant_id", "default")
	client := &Client{
		ID:       c.Query("client_id"),
		TenantID: CanonicalTenantID(rawTenant),
		BranchID: c.DefaultQuery("branch_id", "default"),
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

			// 🏓 Xử lý Ping từ Client giữ kết nối và trả về Pong trực tiếp
			var rawMsg struct {
				Type string `json:"type"`
			}
			if err := json.Unmarshal(message, &rawMsg); err == nil && rawMsg.Type == "ping" {
				select {
				case client.Send <- []byte(`{"type":"pong"}`):
				default:
				}
				continue // Không broadcast gói ping đi máy khác
			}

			// Broadcast incoming messages (e.g. table_cart_updated, cfd_cart_sync) CHỈ tới các client cùng TenantID
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
					// Channel was closed by hub
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
