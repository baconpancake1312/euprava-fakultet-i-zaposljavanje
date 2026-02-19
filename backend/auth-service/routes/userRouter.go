package routes

import (
	"backend/controllers"

	"github.com/gin-gonic/gin"
)

func UserRoutes(routes *gin.Engine) {
	//routes.Use(middleware.Authentication())
	routes.GET("/users/:user_id", controllers.GetUser())
	routes.PUT("/users/:user_id", controllers.UpdateUser())
	routes.DELETE("/users/:user_id", controllers.DeleteUser())
	routes.GET("/users/get", func(c *gin.Context) {
		controllers.GetUsers(c)
	})
}
