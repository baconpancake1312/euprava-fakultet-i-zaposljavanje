package routes

import (
	controller "backend/controllers"

	"github.com/gin-gonic/gin"
)

func AuthRoutes(routes *gin.Engine) {
	routes.POST("/users/register", controller.Register())
	routes.POST("/users/login", controller.Login())
	routes.POST("/users/logout", controller.Logout())
	routes.GET("/user/me", controller.GetLoggedInUser())
	routes.GET("/user-types", controller.GetValidUserTypes())
	
	// Service account routes
	routes.POST("/service-accounts", controller.CreateServiceAccount())
	routes.POST("/service-token", controller.GenerateServiceToken())
}
