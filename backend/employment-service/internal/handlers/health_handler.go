package handlers

import (
	"github.com/gin-gonic/gin"
)

func HealthCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "employment-service",
		})
	}
}
