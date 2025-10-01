package routes

import (
	"employment-service/controllers"
	"employment-service/middleware"

	"github.com/gin-gonic/gin"
)

func MainRoutes(routes *gin.Engine, ec controllers.EmploymentController) {
	routes.Use(middleware.Authentication())

	routes.POST("/users", ec.CreateUser())
	routes.GET("/users", ec.GetAllUsers())
	routes.GET("/users/:id", ec.GetUser())
	routes.PUT("/users/:id", ec.UpdateUser())
	routes.DELETE("/users/:id", ec.DeleteUser())

	routes.POST("/employers", ec.CreateEmployer())
	routes.GET("/employers", ec.GetAllEmployers())
	routes.GET("/employers/:id", ec.GetEmployer())
	routes.PUT("/employers/:id", ec.UpdateEmployer())
	routes.DELETE("/employers/:id", ec.DeleteEmployer())

	routes.POST("/candidates", ec.CreateCandidate())
	routes.GET("/candidates", ec.GetAllCandidates())
	routes.GET("/candidates/:id", ec.GetCandidate())
	routes.PUT("/candidates/:id", ec.UpdateCandidate())
	routes.DELETE("/candidates/:id", ec.DeleteCandidate())

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