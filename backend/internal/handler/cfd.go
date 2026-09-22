package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/websocket"
)

var latestCFDState interface{}

func GetLatestActiveOrder(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"items": []interface{}{}})
		return
	}

	var order models.Order
	err := database.DB.Preload("Items").Where("status != ?", "da_thanh_toan").Order("created_at desc").First(&order).Error
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"items": []interface{}{}})
		return
	}

	c.JSON(http.StatusOK, order)
}

func SyncCFDState(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	latestCFDState = payload

	// Broadcast to all active CFD screens
	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type": "cfd_cart_sync",
		"data": payload,
	})

	c.JSON(http.StatusOK, gin.H{"status": "synchronized"})
}

func GetCFDActiveState(c *gin.Context) {
	if latestCFDState != nil {
		c.JSON(http.StatusOK, latestCFDState)
		return
	}
	c.JSON(http.StatusOK, gin.H{"cart": []interface{}{}, "total": 0})
}
