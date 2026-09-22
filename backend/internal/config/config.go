package config

import (
	"os"
)

type Config struct {
	Port         string
	DatabaseURL  string
	RedisURL     string
	JWTSecret    string
	SaaSAdminKey string
	WebhookSecret string
	PublicBillURL string
	VietQRBank    string
	VietQRNumber  string
	VietQRName    string
}

func LoadConfig() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "host=localhost user=pos_user password=pos_password_2026 dbname=pos_ongchu_db port=5432 sslmode=disable TimeZone=Asia/Ho_Chi_Minh"
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "OngChu_Enterprise_POS_Secret_Key_2026"
	}

	saasAdminKey := os.Getenv("SAAS_ADMIN_KEY")
	if saasAdminKey == "" {
		saasAdminKey = "ongchu_dev_admin_key_2026"
	}

	webhookSecret := os.Getenv("WEBHOOK_SECRET")
	if webhookSecret == "" {
		webhookSecret = "ongchu_webhook_secret_2026"
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
	if vietQRNumber == "" {
		vietQRNumber = "0987654321"
	}

	vietQRName := os.Getenv("VIETQR_ACCOUNT_NAME")
	if vietQRName == "" {
		vietQRName = "NGUYEN LOC THANH"
	}

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
