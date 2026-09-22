package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type clientBucket struct {
	tokens     int
	lastRefill time.Time
}

type RateLimiterStore struct {
	mu      sync.Mutex
	buckets map[string]*clientBucket
	rate    int           // tokens per interval
	window  time.Duration // interval
}

func NewRateLimiterStore(rate int, window time.Duration) *RateLimiterStore {
	store := &RateLimiterStore{
		buckets: make(map[string]*clientBucket),
		rate:    rate,
		window:  window,
	}

	// Dọn dẹp bucket định kỳ chống rò rỉ bộ nhớ
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			store.mu.Lock()
			now := time.Now()
			for ip, b := range store.buckets {
				if now.Sub(b.lastRefill) > 10*time.Minute {
					delete(store.buckets, ip)
				}
			}
			store.mu.Unlock()
		}
	}()

	return store
}

// RateLimiterMiddleware giới hạn tốc độ gọi API chung (Token Bucket)
func RateLimiterMiddleware(rate int, window time.Duration) gin.HandlerFunc {
	store := NewRateLimiterStore(rate, window)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		store.mu.Lock()
		b, exists := store.buckets[ip]
		now := time.Now()

		if !exists {
			store.buckets[ip] = &clientBucket{
				tokens:     store.rate - 1,
				lastRefill: now,
			}
			store.mu.Unlock()
			c.Next()
			return
		}

		// Nạp lại token theo thời gian trôi qua
		elapsed := now.Sub(b.lastRefill)
		if elapsed >= store.window {
			b.tokens = store.rate
			b.lastRefill = now
		}

		if b.tokens <= 0 {
			store.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error":   "Tần suất gọi API vượt quá giới hạn cho phép. Vui lòng thử lại sau.",
			})
			return
		}

		b.tokens--
		store.mu.Unlock()
		c.Next()
	}
}

type pinAttempt struct {
	count       int
	firstFailed time.Time
	blockedUntil time.Time
}

var (
	pinMu       sync.Mutex
	pinAttempts = make(map[string]*pinAttempt)
)

// PinBruteForceMiddleware bảo vệ endpoint nhập PIN: Tối đa 5 lần thử trong 1 phút
func PinBruteForceMiddleware(maxAttempts int, lockDuration time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		pinMu.Lock()
		attempt, exists := pinAttempts[ip]
		if exists {
			// Đang trong thời gian bị khóa
			if now.Before(attempt.blockedUntil) {
				remaining := int(attempt.blockedUntil.Sub(now).Seconds())
				pinMu.Unlock()
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
					"success": false,
					"error":   "Tài khoản bị tạm khóa do nhập sai PIN quá nhiều lần",
					"retry_after_seconds": remaining,
				})
				return
			}

			// Quá thời gian 1 phút -> reset bộ đếm
			if now.Sub(attempt.firstFailed) > time.Minute {
				delete(pinAttempts, ip)
			}
		}
		pinMu.Unlock()

		c.Next()

		// Sau khi xử lý request: Nếu response trả về 200, reset bộ đếm
		status := c.Writer.Status()
		if status == http.StatusOK {
			pinMu.Lock()
			delete(pinAttempts, ip)
			pinMu.Unlock()
		} else if status == http.StatusForbidden || status == http.StatusUnauthorized || status == http.StatusBadRequest {
			pinMu.Lock()
			att, ok := pinAttempts[ip]
			if !ok {
				pinAttempts[ip] = &pinAttempt{
					count:       1,
					firstFailed: now,
				}
			} else {
				att.count++
				if att.count >= maxAttempts {
					att.blockedUntil = now.Add(lockDuration)
				}
			}
			pinMu.Unlock()
		}
	}
}
