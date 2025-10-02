package routes

import (
	"backend/controllers"

	"github.com/gin-gonic/gin"
)

func UserRoutes(routes *gin.Engine) {
	//routes.Use(middleware.Authentication())
	routes.GET("/users/:user_id", controllers.GetUser())
	routes.GET("/users/get", func(c *gin.Context) {
		controllers.GetUsers(c)
	})
}
