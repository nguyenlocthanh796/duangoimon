package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

const (
	DefaultIssuer         = "ongchu.cloud"
	DefaultAudience       = "ongchu-pos"
	AccessTokenDuration   = 15 * time.Minute  // Short-lived access token
	RefreshTokenDuration  = 7 * 24 * time.Hour // 7 days refresh token
)

var (
	ErrInvalidToken       = errors.New("token không hợp lệ")
	ErrExpiredToken       = errors.New("token đã hết hạn")
	ErrInvalidSignature   = errors.New("chữ ký token không chính xác")
	ErrInvalidIssuer      = errors.New("issuer token không hợp lệ")
	ErrInvalidAudience    = errors.New("audience token không hợp lệ")
	ErrRevokedToken       = errors.New("phiên đăng nhập đã bị thu hồi")
	ErrMissingSecret      = errors.New("chưa cấu hình JWT_SECRET trên máy chủ")
)

type TokenHeader struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}

type TokenClaims struct {
	TokenID     string   `json:"jti"`
	UserID      string   `json:"sub"`
	Username    string   `json:"username"`
	TenantID    string   `json:"tenant_id"`
	BranchID    string   `json:"branch_id"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
	Issuer      string   `json:"iss"`
	Audience    string   `json:"aud"`
	IssuedAt    int64    `json:"iat"`
	ExpiresAt   int64    `json:"exp"`
}

type AuthTokenPair struct {
	AccessToken      string       `json:"access_token"`
	RefreshToken     string       `json:"refresh_token"`
	ExpiresInSeconds int64        `json:"expires_in"`
	TokenType        string       `json:"token_type"`
	Claims           *TokenClaims `json:"claims"`
}

// In-memory revocation & refresh token rotation store (Thread-safe)
type SessionStore struct {
	mu            sync.RWMutex
	revokedJTIs   map[string]time.Time        // jti -> expiration time
	refreshTokens map[string]*RefreshTokenInfo // hashedToken -> Info
}

type RefreshTokenInfo struct {
	UserID       string
	TenantID     string
	BranchID     string
	Role         string
	FamilyID     string
	ExpiresAt    time.Time
	IsUsed       bool
}

var GlobalSessionStore = &SessionStore{
	revokedJTIs:   make(map[string]time.Time),
	refreshTokens: make(map[string]*RefreshTokenInfo),
}

func (s *SessionStore) RevokeToken(jti string, expiresAt int64) {
	if jti == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	exp := time.Unix(expiresAt, 0)
	s.revokedJTIs[jti] = exp
}

func (s *SessionStore) IsRevoked(jti string) bool {
	if jti == "" {
		return false
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	if exp, exists := s.revokedJTIs[jti]; exists {
		if time.Now().Before(exp) {
			return true
		}
	}
	return false
}

func (s *SessionStore) StoreRefreshToken(rawToken string, info *RefreshTokenInfo) {
	hashed := HashRefreshToken(rawToken)
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshTokens[hashed] = info
}

func (s *SessionStore) ConsumeRefreshToken(rawToken string) (*RefreshTokenInfo, error) {
	hashed := HashRefreshToken(rawToken)
	s.mu.Lock()
	defer s.mu.Unlock()

	info, exists := s.refreshTokens[hashed]
	if !exists {
		return nil, errors.New("refresh token không tồn tại")
	}

	if time.Now().After(info.ExpiresAt) {
		delete(s.refreshTokens, hashed)
		return nil, errors.New("refresh token đã hết hạn")
	}

	if info.IsUsed {
		// Reuse detected! Compromise pattern -> revoke all tokens in family
		for k, v := range s.refreshTokens {
			if v.FamilyID == info.FamilyID {
				delete(s.refreshTokens, k)
			}
		}
		return nil, errors.New("phát hiện tái sử dụng refresh token - toàn bộ phiên bị thu hồi vì lý do an ninh")
	}

	info.IsUsed = true
	return info, nil
}

func HashRefreshToken(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

// ValidateJWTSecretPolicy kiểm tra độ an toàn của khóa JWT_SECRET theo OWASP HS256:
// Khóa ký bắt buộc phải có độ dài tối thiểu 32 raw random bytes (256-bit key) sinh bằng CSPRNG,
// không phải là passphrase/password thông thường.
func ValidateJWTSecretPolicy(sec string, isRelease bool) error {
	trimmed := strings.TrimSpace(sec)
	if trimmed == "" {
		if isRelease {
			return ErrMissingSecret
		}
		return nil
	}

	var rawBytes []byte
	// Thử giải mã nếu secret ở dạng Base64 hoặc Hex
	if b, err := base64.StdEncoding.DecodeString(trimmed); err == nil && len(b) >= 32 {
		rawBytes = b
	} else if b, err := hex.DecodeString(trimmed); err == nil && len(b) >= 32 {
		rawBytes = b
	} else {
		rawBytes = []byte(trimmed)
	}

	// OWASP HS256: Khóa ký bắt buộc tối thiểu 32 raw bytes (256 bits)
	if len(rawBytes) < 32 {
		if isRelease {
			return errors.New("JWT_SECRET không đạt yêu cầu bảo mật: bắt buộc tối thiểu 32 raw random bytes (256-bit key)")
		}
	}

	// Cấm sử dụng password, passphrase hoặc chuỗi lặp lại dễ đoán
	weakSecrets := map[string]bool{
		"12345678901234567890123456789012": true,
		"secretsecretsecretsecretsecret32":  true,
		"passwordpasswordpasswordpassword":  true,
		"adminadminadminadminadminadmin32":  true,
	}
	if weakSecrets[strings.ToLower(trimmed)] {
		return errors.New("JWT_SECRET không được dùng passphrase/password thông thường - bắt buộc dùng khóa sinh ngẫu nhiên CSPRNG")
	}
	return nil
}

// GetJWTSecret lấy khóa ký token mật mã từ biến môi trường và kiểm tra chính sách bảo mật
func GetJWTSecret() ([]byte, error) {
	sec := os.Getenv("JWT_SECRET")
	isRelease := os.Getenv("GIN_MODE") == "release"
	
	if err := ValidateJWTSecretPolicy(sec, isRelease); err != nil {
		return nil, err
	}
	if strings.TrimSpace(sec) == "" {
		sec = "ongchu_dev_jwt_secret_do_not_use_in_production_2026_at_least_32_bytes"
	}
	return []byte(sec), nil
}

// GenerateAccessToken tạo JWT Access Token ký HMAC-SHA256
func GenerateAccessToken(claims *TokenClaims) (string, error) {
	secret, err := GetJWTSecret()
	if err != nil {
		return "", err
	}

	header := TokenHeader{
		Alg: "HS256",
		Typ: "JWT",
	}

	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", err
	}

	claims.Issuer = DefaultIssuer
	claims.Audience = DefaultAudience
	if claims.TokenID == "" {
		claims.TokenID = uuid.New().String()
	}
	now := time.Now()
	if claims.IssuedAt == 0 {
		claims.IssuedAt = now.Unix()
	}
	if claims.ExpiresAt == 0 {
		claims.ExpiresAt = now.Add(AccessTokenDuration).Unix()
	}

	claimsJSON, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	headerB64 := base64.RawURLEncoding.EncodeToString(headerJSON)
	claimsB64 := base64.RawURLEncoding.EncodeToString(claimsJSON)

	signingInput := headerB64 + "." + claimsB64

	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(signingInput))
	signature := mac.Sum(nil)
	sigB64 := base64.RawURLEncoding.EncodeToString(signature)

	return signingInput + "." + sigB64, nil
}

// VerifyAccessToken giải mã và kiểm tra tính toàn vẹn, issuer, audience, expiry và revocation
func VerifyAccessToken(tokenString string) (*TokenClaims, error) {
	secret, err := GetJWTSecret()
	if err != nil {
		return nil, err
	}

	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return nil, ErrInvalidToken
	}

	headerB64, claimsB64, sigB64 := parts[0], parts[1], parts[2]

	// 0. Xác thực Header & Thuật toán mã hóa (Chặn thuật toán giả mạo 'none' hoặc nhầm lẫn khóa)
	headerJSON, err := base64.RawURLEncoding.DecodeString(headerB64)
	if err != nil {
		return nil, ErrInvalidToken
	}
	var header TokenHeader
	if err := json.Unmarshal(headerJSON, &header); err != nil || header.Alg != "HS256" {
		return nil, errors.New("thuật toán token không được hỗ trợ hoặc bị cấm (bắt buộc HS256)")
	}

	expectedSigBytes, err := base64.RawURLEncoding.DecodeString(sigB64)
	if err != nil {
		return nil, ErrInvalidToken
	}

	signingInput := headerB64 + "." + claimsB64
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(signingInput))
	computedSig := mac.Sum(nil)

	if subtle.ConstantTimeCompare(expectedSigBytes, computedSig) != 1 {
		return nil, ErrInvalidSignature
	}

	claimsJSON, err := base64.RawURLEncoding.DecodeString(claimsB64)
	if err != nil {
		return nil, ErrInvalidToken
	}

	var claims TokenClaims
	if err := json.Unmarshal(claimsJSON, &claims); err != nil {
		return nil, ErrInvalidToken
	}

	// 1. Kiểm tra Bắt buộc các trường Claims trọng yếu
	if claims.TokenID == "" {
		return nil, errors.New("token thiếu mã nhận diện jti")
	}
	if claims.TenantID == "" {
		return nil, errors.New("token thiếu thông tin tenant_id")
	}
	if claims.UserID == "" {
		return nil, errors.New("token thiếu thông tin user_id/sub")
	}
	if claims.ExpiresAt == 0 {
		return nil, errors.New("token thiếu thời gian hết hạn exp")
	}

	// 2. Kiểm tra Expiry (exp) & Issued At (iat)
	now := time.Now().Unix()
	if now > claims.ExpiresAt {
		return nil, ErrExpiredToken
	}
	if claims.IssuedAt > now+60 { // Cho phép chênh lệch clock skew tối đa 60s
		return nil, errors.New("thời gian phát hành token không hợp lệ (iat in the future)")
	}

	// 3. Kiểm tra Issuer (iss) & Audience (aud)
	if claims.Issuer != DefaultIssuer {
		return nil, ErrInvalidIssuer
	}
	if claims.Audience != DefaultAudience {
		return nil, ErrInvalidAudience
	}

	// 4. Kiểm tra Revocation list
	if GlobalSessionStore.IsRevoked(claims.TokenID) {
		return nil, ErrRevokedToken
	}

	return &claims, nil
}

// GenerateRefreshToken sinh chuỗi ngẫu nhiên 32-byte có entropy cao
func GenerateRefreshToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// CreateAuthTokenPair tạo cặp Access Token và Refresh Token đầy đủ
func CreateAuthTokenPair(claims *TokenClaims) (*AuthTokenPair, error) {
	accessToken, err := GenerateAccessToken(claims)
	if err != nil {
		return nil, err
	}

	rawRefreshToken, err := GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	familyID := uuid.New().String()
	GlobalSessionStore.StoreRefreshToken(rawRefreshToken, &RefreshTokenInfo{
		UserID:    claims.UserID,
		TenantID:  claims.TenantID,
		BranchID:  claims.BranchID,
		Role:      claims.Role,
		FamilyID:  familyID,
		ExpiresAt: time.Now().Add(RefreshTokenDuration),
		IsUsed:    false,
	})

	return &AuthTokenPair{
		AccessToken:      accessToken,
		RefreshToken:     rawRefreshToken,
		ExpiresInSeconds: int64(AccessTokenDuration.Seconds()),
		TokenType:        "Bearer",
		Claims:           claims,
	}, nil
}

// DefaultPermissionsForRole gán danh sách quyền mặc định theo phân quyền RBAC
func DefaultPermissionsForRole(role string) []string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "owner", "superadmin", "admin":
		return []string{
			"orders.read", "orders.create", "orders.pay", "orders.void", "orders.discount",
			"products.read", "products.create", "products.update", "products.delete", "products.price.update",
			"categories.manage", "tables.manage", "areas.manage",
			"settings.read", "settings.update", "settings.bank.update",
			"reports.pnl.read", "cash.summary.read", "cash.transaction.create", "cash.transaction.void",
			"cash.drawer.open", "shifts.manage",
			"staff.manage", "staff.pay", "inventory.adjust", "backup.restore",
			"kds.manage", "cfd.manage",
		}
	case "manager":
		return []string{
			"orders.read", "orders.create", "orders.pay", "orders.void", "orders.discount",
			"products.read", "products.update", "products.price.update",
			"tables.manage", "areas.manage",
			"settings.read",
			"reports.pnl.read", "cash.summary.read", "cash.transaction.create", "cash.transaction.void",
			"cash.drawer.open", "shifts.manage",
			"staff.manage", "inventory.adjust",
			"kds.manage", "cfd.manage",
		}
	case "cashier":
		return []string{
			"orders.read", "orders.create", "orders.pay",
			"products.read",
			"tables.manage",
			"settings.read",
			"cash.summary.read", "cash.transaction.create",
			"cash.drawer.open", "shifts.manage",
			"kds.manage", "cfd.manage",
		}
	case "waiter", "staff", "phuc_vu", "pha_che":
		return []string{
			"orders.read", "orders.create",
			"products.read",
			"tables.manage",
			"kds.manage",
		}
	default:
		return []string{"orders.read", "products.read"}
	}
}

// HasPermission kiểm tra người dùng có quyền cụ thể hay không
func HasPermission(userPerms []string, required string) bool {
	for _, p := range userPerms {
		if p == "*" || p == required {
			return true
		}
		// Prefix match e.g. "orders.*"
		if strings.HasSuffix(p, ".*") {
			prefix := strings.TrimSuffix(p, ".*")
			if strings.HasPrefix(required, prefix+".") {
				return true
			}
		}
	}
	return false
}
