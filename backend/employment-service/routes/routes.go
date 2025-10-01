package routes

import (
	"employment-service/controllers"
	"employment-service/middleware"

	"github.com/gin-gonic/gin"
)

func MainRoutes(routes *gin.Engine, ec controllers.EmploymentController) {
	routes.Use(middleware.Authentication())

	routes.POST("/applications", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.CreateApplication())
	routes.GET("/applications", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), ec.GetAllApplications())
	routes.GET("/applications/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER", "STUDENT", "CANDIDATE"}), ec.GetApplication())
	routes.PUT("/applications/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), ec.UpdateApplication())
	routes.DELETE("/applications/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), ec.DeleteApplication())

	routes.POST("/job-listings", ec.CreateJobListing())
	routes.GET("/job-listings", ec.GetAllJobListings())
	routes.GET("/job-listings/:id", ec.GetJobListing())
	routes.PUT("/job-listings/:id", ec.UpdateJobListing())
	routes.DELETE("/job-listings/:id", ec.DeleteJobListing())

	routes.GET("/job-listings/:jobId/applications", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), ec.GetApplicationsForJob())
}