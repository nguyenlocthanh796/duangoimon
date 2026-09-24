package config

import (
	"log"
	"os"
	"strings"
)

type Config struct {
	Port          string
	DatabaseURL   string
	RedisURL      string
	JWTSecret     string
	SaaSAdminKey  string
	WebhookSecret string
	PublicBillURL string
	VietQRBank    string
	VietQRNumber  string
	VietQRName    string
}

func LoadConfig() *Config {
	isProduction := os.Getenv("GIN_MODE") == "release" || strings.ToLower(os.Getenv("ENV")) == "production"

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" && isProduction {
		log.Println("⚠️ [SECURITY WARNING] DATABASE_URL chưa được cấu hình, fallback về SQLite cục bộ")
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		if isProduction {
			log.Fatal("🚨 [SECURITY PANIC] JWT_SECRET bắt buộc phải được cấu hình trên môi trường Production! Server dừng để bảo vệ an toàn hệ thống.")
		}
		jwtSecret = "ongchu_dev_jwt_secret_do_not_use_in_production_2026"
	}

	saasAdminKey := os.Getenv("SAAS_ADMIN_KEY")
	if saasAdminKey == "" {
		if isProduction {
			log.Fatal("🚨 [SECURITY PANIC] SAAS_ADMIN_KEY bắt buộc phải được cấu hình trên môi trường Production!")
		}
		saasAdminKey = "ongchu_dev_admin_key_2026"
	}

	webhookSecret := os.Getenv("WEBHOOK_SECRET")
	if webhookSecret == "" {
		if isProduction {
			log.Fatal("🚨 [SECURITY PANIC] WEBHOOK_SECRET bắt buộc phải được cấu hình trên môi trường Production!")
		}
		webhookSecret = "ongchu_dev_webhook_secret_2026"
	}

	publicBillURL := os.Getenv("PUBLIC_BILL_URL")
	if publicBillURL == "" {
		publicBillURL = "https://ongchu.cloud"
	}

	vietQRBank := os.Getenv("VIETQR_BANK")
	if vietQRBank == "" {
		vietQRBank = "MBBank"
	}

	vietQRNumber := os.Getenv("VIETQR_ACCOUNT_NO")
	vietQRName := os.Getenv("VIETQR_ACCOUNT_NAME")

	return &Config{
		Port:          port,
		DatabaseURL:   dbURL,
		RedisURL:      redisURL,
		JWTSecret:     jwtSecret,
		SaaSAdminKey:  saasAdminKey,
		WebhookSecret: webhookSecret,
		PublicBillURL: publicBillURL,
		VietQRBank:    vietQRBank,
		VietQRNumber:  vietQRNumber,
		VietQRName:    vietQRName,
	}
}
