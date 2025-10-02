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

	// User routes
	routes.POST("/users", ec.CreateUser())
	routes.GET("/users", ec.GetAllUsers())
	routes.GET("/users/:id", ec.GetUser())
	routes.PUT("/users/:id", ec.UpdateUser())
	routes.DELETE("/users/:id", ec.DeleteUser())

	// Student routes
	routes.POST("/students", ec.CreateStudent())
	routes.GET("/students", ec.GetAllStudents())
	routes.GET("/students/:id", ec.GetStudent())
	routes.PUT("/students/:id", ec.UpdateStudent())
	routes.DELETE("/students/:id", ec.DeleteStudent())

	// Notification routes
	routes.POST("/notifications", ec.CreateNotification())
	routes.GET("/notifications", ec.GetAllNotifications())
	routes.GET("/notifications/:id", ec.GetNotification())
	routes.PUT("/notifications/:id", ec.UpdateNotification())
	routes.DELETE("/notifications/:id", ec.DeleteNotification())

	// Benefit routes
	routes.POST("/benefits", ec.CreateBenefit())
	routes.GET("/benefits", ec.GetAllBenefits())
	routes.GET("/benefits/:id", ec.GetBenefit())
	routes.PUT("/benefits/:id", ec.UpdateBenefit())
	routes.DELETE("/benefits/:id", ec.DeleteBenefit())

	// Request routes
	routes.POST("/requests", ec.CreateRequest())
	routes.GET("/requests", ec.GetAllRequests())
	routes.GET("/requests/:id", ec.GetRequest())
	routes.PUT("/requests/:id", ec.UpdateRequest())
	routes.DELETE("/requests/:id", ec.DeleteRequest())

	// Document routes
	routes.POST("/documents", ec.CreateDocument())
	routes.GET("/documents", ec.GetAllDocuments())
	routes.GET("/documents/:id", ec.GetDocument())
	routes.PUT("/documents/:id", ec.UpdateDocument())
	routes.DELETE("/documents/:id", ec.DeleteDocument())
}