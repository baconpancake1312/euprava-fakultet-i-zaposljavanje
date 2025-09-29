package routes

import (
	"employment-service/controllers"
	"employment-service/middleware"

	"github.com/gin-gonic/gin"
)

func MainRoutes(routes *gin.Engine, dc controllers.DormController) {
	routes.Use(middleware.Authentication())

	routes.GET("/applications", middleware.AuthorizeRoles([]string{"ADMIN"}), dc.GetAllApplications())
	routes.GET("/applications/listingId", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), dc.GetAllApplications())
	routes.GET("/application", middleware.AuthorizeRoles([]string{"ADMIN", "STUDENT"}), dc.GetApplication())
	routes.DELETE("/application/:id", middleware.AuthorizeRoles([]string{"ADMIN"}), dc.DeleteApplication())

	routes.GET("/listings", middleware.AuthorizeRoles([]string{"ADMIN", "CANDIDATE"}), dc.GetAllApplications())
	routes.GET("/listing", middleware.AuthorizeRoles([]string{"ADMIN", "CANDIDATE"}), dc.GetApplication())
	routes.POST("/listing/create/", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), dc.InsertApplication())
	routes.POST("/listing/apply/:id", middleware.AuthorizeRoles([]string{"ADMIN", "CANDIDATE"}), dc.InsertApplication())
	routes.PUT("/listing/:id", middleware.AuthorizeRoles([]string{"ADMIN", "STUDENT"}), dc.UpdateSelection())
	routes.DELETE("/listing/:id", middleware.AuthorizeRoles([]string{"EMPLOYER", "ADMIN"}), dc.DeleteApplication())

	routes.GET("notifications/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER", "CANDIDATE"}), dc.GetSelection())
	routes.POST("notification/:id", middleware.AuthorizeRoles([]string{"ADMIN"}), dc.InsertSelection())
	routes.PUT("notification/:id", middleware.AuthorizeRoles([]string{"ADMIN"}), dc.UpdateSelection())
	routes.DELETE("notification/:id", middleware.AuthorizeRoles([]string{"ADMIN"}), dc.DeleteSelection())

	//funkcije su placeholder
}
