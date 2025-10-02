package routes

import (
	controller "backend/controllers"

	"github.com/gin-gonic/gin"
)

func AuthRoutes(routes *gin.Engine) {
	routes.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "auth-service",
			"cors":    "enabled",
		})
	})

	routes.POST("/users/register", controller.Register())
	routes.POST("/users/login", controller.Login())
	routes.POST("/users/logout", controller.Logout())
	routes.GET("/user/me", controller.GetLoggedInUser())
	routes.GET("/user-types", controller.GetValidUserTypes())

	routes.POST("/service-accounts", controller.CreateServiceAccount())
	routes.POST("/service-token", controller.GenerateServiceToken())
}
