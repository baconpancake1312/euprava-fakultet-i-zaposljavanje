package routes

import (
	"employment-service/internal/handlers"
	"employment-service/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, h *handlers.Handlers) {

	router.GET("/health", handlers.HealthCheck())

	// WebSocket endpoint – auth is handled inside the hub via query param
	router.GET("/ws/messages", h.Messaging.WebSocketHandler())

	setupPublicRoutes(router, h)

	setupProtectedRoutes(router, h)
}

func setupPublicRoutes(router *gin.Engine, h *handlers.Handlers) {
	public := router.Group("/")
	{

		public.GET("/job-listings", h.Job.GetAllJobListings())
		public.GET("/job-listings/:id", h.Job.GetJobListing())

		public.POST("/users", h.User.CreateUser())
		public.POST("/employers", h.Employer.CreateEmployer())
		public.POST("/candidates", h.Candidate.CreateCandidate())

		public.GET("/search/jobs/text", h.Job.SearchJobsByText())
		public.GET("/search/jobs/internship", h.Job.SearchJobsByInternship())
		public.GET("/search/jobs/active", h.Job.GetActiveJobs())
		public.GET("/search/jobs/trending", h.Job.GetTrendingJobs())
		public.GET("/search/users/text", h.Search.SearchUsersByText())
		public.GET("/search/employers/text", h.Search.SearchEmployersByText())
		public.GET("/search/candidates/text", h.Search.SearchCandidatesByText())
	}
}

func setupProtectedRoutes(router *gin.Engine, h *handlers.Handlers) {
	protected := router.Group("/")
	protected.Use(middleware.Authentication())
	{

		protected.GET("/users", h.User.GetAllUsers())
		protected.GET("/users/:id", h.User.GetUser())
		protected.PUT("/users/:id", h.User.UpdateUser())
		protected.DELETE("/users/:id", h.User.DeleteUser())

		protected.GET("/employers", h.Employer.GetAllEmployers())
		protected.GET("/employers/:id", h.Employer.GetEmployer())
		protected.GET("/employers/user/:user_id", h.Employer.GetEmployerByUserID())
		protected.PUT("/employers/:id", h.Employer.UpdateEmployer())
		protected.DELETE("/employers/:id", h.Employer.DeleteEmployer())

		protected.GET("/candidates", h.Candidate.GetAllCandidates())
		protected.GET("/candidates/:id", h.Candidate.GetCandidate())
		protected.GET("/candidates/user/:user_id", h.Candidate.GetCandidateByUserID())
		protected.PUT("/candidates/:id", h.Candidate.UpdateCandidate())
		protected.DELETE("/candidates/:id", h.Candidate.DeleteCandidate())

		protected.POST("/job-listings", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), h.Job.CreateJobListing())
		protected.PUT("/job-listings/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), h.Job.UpdateJobListing())
		protected.DELETE("/job-listings/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), h.Job.DeleteJobListing())
		protected.GET("/job-listings/:id/applications", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), h.Application.GetApplicationsForJob())

		protected.POST("/applications", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), h.Application.CreateApplication())
		protected.GET("/applications", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), h.Application.GetAllApplications())
		protected.GET("/applications/candidate/:id", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), h.Application.GetApplicationsByCandidate())
		protected.GET("/applications/candidate/:id/stats", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), h.Application.GetCandidateApplicationStats())
		protected.GET("/applications/employer/:id", middleware.AuthorizeRoles([]string{"EMPLOYER"}), h.Application.GetApplicationsByEmployer())
		protected.GET("/applications/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER", "STUDENT", "CANDIDATE"}), h.Application.GetApplication())
		protected.PUT("/applications/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), h.Application.UpdateApplication())
		protected.PUT("/applications/:id/accept", middleware.AuthorizeRoles([]string{"EMPLOYER", "ADMIN"}), h.Application.AcceptApplication())
		protected.PUT("/applications/:id/reject", middleware.AuthorizeRoles([]string{"EMPLOYER", "ADMIN"}), h.Application.RejectApplication())
		protected.DELETE("/applications/:id", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), h.Application.DeleteApplication())

		protected.POST("/saved-jobs", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), h.Job.SaveJob())
		protected.GET("/saved-jobs/candidate/:candidate_id", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), h.Job.GetSavedJobs())
		protected.DELETE("/saved-jobs/candidate/:candidate_id/job/:job_id", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), h.Job.UnsaveJob())

		protected.GET("/search/jobs/recommendations", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), h.Job.GetJobRecommendations())

		protected.GET("/companies", h.Company.GetAllCompanies())
		protected.GET("/companies/:id", h.Company.GetCompanyById())
		protected.GET("/companies/employer/:id", middleware.AuthorizeRoles([]string{"EMPLOYER"}), h.Company.GetCompanyProfile())
		protected.PUT("/companies/:id", middleware.AuthorizeRoles([]string{"EMPLOYER"}), h.Company.UpdateCompanyProfile())

		protected.POST("/interviews", middleware.AuthorizeRoles([]string{"EMPLOYER"}), h.Interview.CreateInterview())
		protected.GET("/interviews/candidate/:id", middleware.AuthorizeRoles([]string{"CANDIDATE", "STUDENT"}), h.Interview.GetInterviewsByCandidate())
		protected.GET("/interviews/employer/:id", middleware.AuthorizeRoles([]string{"EMPLOYER"}), h.Interview.GetInterviewsByEmployer())
		protected.PUT("/interviews/:id/status", middleware.AuthorizeRoles([]string{"EMPLOYER", "CANDIDATE"}), h.Interview.UpdateInterviewStatus())

		protected.POST("/messages", middleware.AuthorizeRoles([]string{"EMPLOYER", "CANDIDATE", "ADMIN"}), h.Messaging.SendMessage())
		protected.GET("/messages/inbox/:userId", middleware.AuthorizeRoles([]string{"EMPLOYER", "CANDIDATE", "ADMIN"}), h.Messaging.GetInboxMessages())
		protected.GET("/messages/sent/:userId", middleware.AuthorizeRoles([]string{"EMPLOYER", "CANDIDATE", "ADMIN"}), h.Messaging.GetSentMessages())
		protected.GET("/messages/:userAId/:userBId", middleware.AuthorizeRoles([]string{"EMPLOYER", "CANDIDATE", "ADMIN"}), h.Messaging.GetMessagesBetweenUsers())
		protected.PUT("/messages/:senderId/:receiverId/read", middleware.AuthorizeRoles([]string{"EMPLOYER", "CANDIDATE", "ADMIN"}), h.Messaging.MarkMessagesAsRead())

		protected.GET("/search/applications/status", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), h.Application.SearchApplicationsByStatus())

		protected.GET("/internships", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), h.Job.GetTrendingJobs()) 
		protected.GET("/internships/student/:studentId", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), h.Job.GetTrendingJobs())

		setupAdminRoutes(protected, h)
	}
}

func setupAdminRoutes(router *gin.RouterGroup, h *handlers.Handlers) {
	admin := router.Group("/admin")
	admin.Use(middleware.AuthorizeRoles([]string{"ADMIN"}))
	{

		admin.PUT("/employers/:id/approve", h.Admin.ApproveEmployer())
		admin.PUT("/employers/:id/reject", h.Admin.RejectEmployer())
		admin.GET("/employers/pending", h.Admin.GetPendingEmployers())
		admin.GET("/employers/stats", h.Admin.GetEmployerStats())

		admin.PUT("/jobs/:id/approve", h.Admin.ApproveJobListing())
		admin.PUT("/jobs/:id/reject", h.Admin.RejectJobListing())
		admin.GET("/jobs/pending", h.Admin.GetPendingJobListings())
	}
}
