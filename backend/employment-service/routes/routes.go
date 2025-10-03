package routes

import (
	"employment-service/controllers"
	"employment-service/middleware"

	"github.com/gin-gonic/gin"
)

func MainRoutes(routes *gin.Engine, ec controllers.EmploymentController) {
	// Health check endpoint
	routes.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "employment-service"})
	})

	// Public routes (no authentication required)
	public := routes.Group("/")
	{
		// Job listings - public access
		public.GET("/job-listings", ec.GetAllJobListings())
		public.GET("/job-listings/:id", ec.GetJobListing())

		// Registration endpoints - public access (no auth required)
		public.POST("/users", ec.CreateUser())
		public.POST("/employers", ec.CreateEmployer())
		public.POST("/candidates", ec.CreateCandidate())

		// Search endpoints - public access
		public.GET("/search/jobs/text", ec.SearchJobsByText())
		public.GET("/search/jobs/internship", ec.SearchJobsByInternship())
		public.GET("/search/jobs/active", ec.GetActiveJobs())
		public.GET("/search/jobs/trending", ec.GetTrendingJobs())
		public.GET("/search/users/text", ec.SearchUsersByText())
		public.GET("/search/employers/text", ec.SearchEmployersByText())
		public.GET("/search/candidates/text", ec.SearchCandidatesByText())
	}

	// Protected routes (authentication required)
	protected := routes.Group("/")
	protected.Use(middleware.Authentication())
	{
		// User management (read, update, delete only - create is public)
		protected.GET("/users", ec.GetAllUsers())
		protected.GET("/users/:id", ec.GetUser())
		protected.PUT("/users/:id", ec.UpdateUser())
		protected.DELETE("/users/:id", ec.DeleteUser())

		// Employer management (read, update, delete only - create is public)
		protected.GET("/employers", ec.GetAllEmployers())
		protected.GET("/employers/:id", ec.GetEmployer())
		protected.PUT("/employers/:id", ec.UpdateEmployer())
		protected.DELETE("/employers/:id", ec.DeleteEmployer())

		// Candidate management (read, update, delete only - create is public)
		protected.GET("/candidates", ec.GetAllCandidates())
		protected.GET("/candidates/:id", ec.GetCandidate())
		protected.GET("/candidates/user/:user_id", ec.GetCandidateByUserID())
		protected.PUT("/candidates/:id", ec.UpdateCandidate())
		protected.DELETE("/candidates/:id", ec.DeleteCandidate())

		// Application management
		protected.POST("/applications", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.CreateApplication())
		protected.GET("/applications", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), ec.GetAllApplications())
		protected.GET("/applications/candidate/:id", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.GetApplicationsByCandidate())
		protected.GET("/applications/employer/:id", middleware.AuthorizeRoles([]string{"EMPLOYER"}), ec.GetApplicationsByEmployer())
		protected.GET("/applications/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER", "STUDENT", "CANDIDATE"}), ec.GetApplication())
		protected.PUT("/applications/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), ec.UpdateApplication())
		protected.PUT("/applications/:id/accept", middleware.AuthorizeRoles([]string{"EMPLOYER", "ADMIN"}), ec.AcceptApplication())
		protected.PUT("/applications/:id/reject", middleware.AuthorizeRoles([]string{"EMPLOYER", "ADMIN"}), ec.RejectApplication())
		protected.DELETE("/applications/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), ec.DeleteApplication())

		// Job listing management (protected)
		protected.POST("/job-listings", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), ec.CreateJobListing())
		protected.PUT("/job-listings/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), ec.UpdateJobListing())
		protected.DELETE("/job-listings/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), ec.DeleteJobListing())
		protected.GET("/job-listings/:id/applications", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), ec.GetApplicationsForJob())

		// Document management
		protected.POST("/documents", ec.CreateDocument())
		protected.GET("/documents", ec.GetAllDocuments())
		protected.GET("/documents/:id", ec.GetDocument())
		protected.PUT("/documents/:id", ec.UpdateDocument())
		protected.DELETE("/documents/:id", ec.DeleteDocument())

		// Unemployed records management
		protected.POST("/unemployed-records", ec.CreateUnemployedRecord())
		protected.GET("/unemployed-records", ec.GetAllUnemployedRecords())
		protected.GET("/unemployed-records/:id", ec.GetUnemployedRecord())
		protected.PUT("/unemployed-records/:id", ec.UpdateUnemployedRecord())
		protected.DELETE("/unemployed-records/:id", ec.DeleteUnemployedRecord())

		// Protected search endpoints
		protected.GET("/search/applications/status", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), ec.SearchApplicationsByStatus())

		// Company management
		protected.GET("/companies", ec.GetAllCompanies())
		protected.GET("/companies/:id", ec.GetCompanyById())
		protected.GET("/companies/employer/:id", middleware.AuthorizeRoles([]string{"EMPLOYER"}), ec.GetCompanyProfile())
		protected.PUT("/companies/:id", middleware.AuthorizeRoles([]string{"EMPLOYER"}), ec.UpdateCompanyProfile())

		// Admin endpoints
		protected.PUT("/admin/employers/:id/approve", middleware.AuthorizeRoles([]string{"ADMIN"}), ec.ApproveEmployer())
		protected.PUT("/admin/employers/:id/reject", middleware.AuthorizeRoles([]string{"ADMIN"}), ec.RejectEmployer())
		protected.GET("/admin/employers/pending", middleware.AuthorizeRoles([]string{"ADMIN"}), ec.GetPendingEmployers())
		protected.GET("/admin/employers/stats", middleware.AuthorizeRoles([]string{"ADMIN"}), ec.GetEmployerStats())

		protected.PUT("/admin/jobs/:id/approve", middleware.AuthorizeRoles([]string{"ADMIN"}), ec.ApproveJobListing())
		protected.PUT("/admin/jobs/:id/reject", middleware.AuthorizeRoles([]string{"ADMIN"}), ec.RejectJobListing())
		protected.GET("/admin/jobs/pending", middleware.AuthorizeRoles([]string{"ADMIN"}), ec.GetPendingJobListings())

		protected.GET("/internships", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.GetInternships())
		protected.GET("/internships/student/:studentId", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.GetInternshipsForStudent())

	}
}
