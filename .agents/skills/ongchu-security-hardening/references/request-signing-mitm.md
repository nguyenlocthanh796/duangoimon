# 🔒 VÀNH ĐAI 2: CHỐNG ĐỌC TRỘM REQUEST & CAN THIỆP GIAO DỊCH (ANTI-MITM & SIGNATURE)

Tài liệu quy định giải pháp kỹ thuật bảo vệ đường truyền dữ liệu giữa POS Frontend (Mobile / Web / Desktop) và Golang Backend, triệt tiêu tấn công Man-In-The-Middle (MITM), nghe lén gói tin (Sniffing), và tấn công gửi lại (Replay Attack).

---

## 🌐 1. CẤU HÌNH TLS 1.3 & HSTS PRELOAD (REVERSE PROXY)

Mọi giao tiếp mạng ngoài LAN đều bắt buộc đi qua Reverse Proxy (Caddy hoặc Nginx) với cấu hình TLS nghiêm ngặt nhất.

### 1.1. Cấu Hình Nginx Chuẩn A+ SSL Labs
```nginx
server {
    listen 443 ssl http2;
    server_name api.pos.ongchu.vn;

    ssl_certificate /etc/letsencrypt/live/api.pos.ongchu.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.pos.ongchu.vn/privkey.pem;

    # Chỉ hỗ trợ TLS 1.2 và TLS 1.3
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS Preload (Ép buộc dùng HTTPS trong 1 năm)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Hub /ws/pos
    location /ws/pos {
        proxy_pass http://127.0.0.1:8080/ws/pos;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 3600s;
    }
}
```

---

## 📱 2. SSL PINNING (PUBLIC KEY SPKI PINNING) TRÊN MOBILE

Để ngăn chặn hacker cài Root Certificate giả trên điện thoại thu ngân và dùng các công cụ như Charles Proxy / Burp Suite / Fiddler để soi request API:

### 2.1. Cấu Hình Network Security Config (Android)
Trong file cấu hình Android `res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.pos.ongchu.vn</domain>
        <pin-set expiration="2027-01-01">
            <!-- SHA-256 Public Key SPKI của SSL Certificate Server -->
            <pin digest="SHA-256">BASE64_PRIMARY_PIN_HERE=</pin>
            <!-- Backup Pin phòng khi đổi Certificate -->
            <pin digest="SHA-256">BASE64_BACKUP_PIN_HERE=</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

---

## ✍️ 3. CƠ CHẾ KÝ SỐ YÊU CẦU (HMAC-SHA256 REQUEST SIGNING)

Đối với các API tài chính nhạy cảm (`/api/v1/orders/pay`, `/api/v1/cash-flow/expense`, `/api/v1/shifts/close`), client bắt buộc ký số payload trước khi gửi.

### 3.1. Cấu Trúc Header Yêu Cầu
Client đính kèm 3 headers bắt buộc:
1. `X-Timestamp`: Epoch timestamp tính bằng mili-giây (ví dụ: `1726700000000`).
2. `X-Nonce`: Chuỗi ngẫu nhiên duy nhất (UUID v4) cho mỗi request.
3. `X-Signature`: Chuỗi mã băm Hex HMAC-SHA256.

### 3.2. Công Thức Sinh Chữ Ký (Client & Backend)
$$\text{Signature} = \text{HMAC\_SHA256}\left(\text{DeviceSecretKey}, \text{HTTP\_METHOD} + \text{PATH} + \text{Timestamp} + \text{Nonce} + \text{RequestBody}\right)$$

### 3.3. Gin Middleware Kiểm Tra Chữ Ký & Chống Replay (Backend)
```go
func HMACVerificationMiddleware(secretKey []byte, redisClient *redis.Client) gin.HandlerFunc {
    return func(c *gin.Context) {
        timestampStr := c.GetHeader("X-Timestamp")
        nonce := c.GetHeader("X-Nonce")
        signature := c.GetHeader("X-Signature")

        if timestampStr == "" || nonce == "" || signature == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing signature headers"})
            return
        }

        // 1. Chống Replay Attack: Kiểm tra thời gian lệch không quá 30 giây
        ts, err := strconv.ParseInt(timestampStr, 10, 64)
        if err != nil || math.Abs(float64(time.Now().UnixMilli()-ts)) > 30000 {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Request timestamp expired"})
            return
        }

        // 2. Chống Replay Attack: Kiểm tra Nonce chưa từng xuất hiện (Redis TTL 60s)
        nonceKey := "nonce:" + nonce
        if redisClient != nil {
            set, _ := redisClient.SetNX(c.Request.Context(), nonceKey, "1", 60*time.Second).Result()
            if !set {
                c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Duplicate nonce replay detected"})
                return
            }
        }

        // 3. Đọc Body và xác thực HMAC
        bodyBytes, _ := io.ReadAll(c.Request.Body)
        c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes)) // Restore body for handler

        payload := c.Request.Method + c.Request.URL.Path + timestampStr + nonce + string(bodyBytes)
        mac := hmac.New(sha256.New, secretKey)
        mac.Write([]byte(payload))
        expectedSig := hex.EncodeToString(mac.Sum(nil))

        if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid HMAC signature"})
            return
        }

        c.Next()
    }
}
```
