package routes

import (
	"employment-service/controllers"
	"employment-service/middleware"

	"github.com/gin-gonic/gin"
)

func MainRoutes(routes *gin.Engine, ec controllers.EmploymentController) {

	routes.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "employment-service"})
	})

	public := routes.Group("/")
	{

		public.GET("/job-listings", ec.GetAllJobListings())
		public.GET("/job-listings/:id", ec.GetJobListing())

		public.POST("/users", ec.CreateUser())
		public.POST("/employers", ec.CreateEmployer())
		public.POST("/candidates", ec.CreateCandidate())

		public.GET("/search/jobs/text", ec.SearchJobsByText())
		public.GET("/search/jobs/internship", ec.SearchJobsByInternship())
		public.GET("/search/jobs/active", ec.GetActiveJobs())
		public.GET("/search/jobs/trending", ec.GetTrendingJobs())
		public.GET("/search/users/text", ec.SearchUsersByText())
		public.GET("/search/employers/text", ec.SearchEmployersByText())
		public.GET("/search/candidates/text", ec.SearchCandidatesByText())
	}

	protected := routes.Group("/")
	protected.Use(middleware.Authentication())
	{

		protected.POST("/interviews", middleware.AuthorizeRoles([]string{"EMPLOYER"}), ec.CreateInterview())
		protected.GET("/interviews/candidate/:id", middleware.AuthorizeRoles([]string{"CANDIDATE", "STUDENT"}), ec.GetInterviewsByCandidate())
		protected.GET("/interviews/employer/:id", middleware.AuthorizeRoles([]string{"EMPLOYER"}), ec.GetInterviewsByEmployer())
		protected.PUT("/interviews/:id/status", middleware.AuthorizeRoles([]string{"EMPLOYER", "CANDIDATE"}), ec.UpdateInterviewStatus())

		protected.GET("/users", ec.GetAllUsers())
		protected.GET("/users/:id", ec.GetUser())
		protected.PUT("/users/:id", ec.UpdateUser())
		protected.DELETE("/users/:id", ec.DeleteUser())

		protected.GET("/employers", ec.GetAllEmployers())
		protected.GET("/employers/:id", ec.GetEmployer())
		protected.GET("/employers/user/:user_id", ec.GetEmployerByUserID())
		protected.PUT("/employers/:id", ec.UpdateEmployer())
		protected.DELETE("/employers/:id", ec.DeleteEmployer())

		protected.GET("/candidates", ec.GetAllCandidates())
		protected.GET("/candidates/:id", ec.GetCandidate())
		protected.GET("/candidates/user/:user_id", ec.GetCandidateByUserID())
		protected.PUT("/candidates/:id", ec.UpdateCandidate())
		protected.DELETE("/candidates/:id", ec.DeleteCandidate())

		protected.POST("/applications", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.CreateApplication())
		protected.GET("/applications", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR", "EMPLOYER"}), ec.GetAllApplications())
		protected.GET("/applications/candidate/:id", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.GetApplicationsByCandidate())
		protected.GET("/applications/candidate/:id/stats", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.GetCandidateApplicationStats())
		protected.GET("/applications/employer/:id", middleware.AuthorizeRoles([]string{"EMPLOYER"}), ec.GetApplicationsByEmployer())
		protected.GET("/applications/:id", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR", "EMPLOYER", "STUDENT", "CANDIDATE"}), ec.GetApplication())
		protected.PUT("/applications/:id", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR", "EMPLOYER"}), ec.UpdateApplication())
		protected.PUT("/applications/:id/accept", middleware.AuthorizeRoles([]string{"EMPLOYER", "ADMIN", "ADMINISTRATOR"}), ec.AcceptApplication())
		protected.PUT("/applications/:id/reject", middleware.AuthorizeRoles([]string{"EMPLOYER", "ADMIN", "ADMINISTRATOR"}), ec.RejectApplication())
		protected.DELETE("/applications/:id", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR", "EMPLOYER"}), ec.DeleteApplication())

		protected.POST("/job-listings", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR", "EMPLOYER"}), ec.CreateJobListing())
		protected.PUT("/job-listings/:id", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR", "EMPLOYER"}), ec.UpdateJobListing())
		protected.DELETE("/job-listings/:id", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR", "EMPLOYER"}), ec.DeleteJobListing())
		protected.PUT("/job-listings/:id/open", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR", "EMPLOYER"}), ec.OpenJobListing())
		protected.PUT("/job-listings/:id/close", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR", "EMPLOYER"}), ec.CloseJobListing())
		protected.GET("/job-listings/:id/applications", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR", "EMPLOYER"}), ec.GetApplicationsForJob())

		protected.POST("/documents", ec.CreateDocument())
		protected.GET("/documents", ec.GetAllDocuments())
		protected.GET("/documents/:id", ec.GetDocument())
		protected.PUT("/documents/:id", ec.UpdateDocument())
		protected.DELETE("/documents/:id", ec.DeleteDocument())

		protected.POST("/unemployed-records", ec.CreateUnemployedRecord())
		protected.GET("/unemployed-records", ec.GetAllUnemployedRecords())
		protected.GET("/unemployed-records/:id", ec.GetUnemployedRecord())
		protected.PUT("/unemployed-records/:id", ec.UpdateUnemployedRecord())
		protected.DELETE("/unemployed-records/:id", ec.DeleteUnemployedRecord())

		protected.POST("/messages", middleware.AuthorizeRoles([]string{"EMPLOYER", "CANDIDATE"}), ec.SendMessage())
		protected.GET("/messages/inbox/:userId", middleware.AuthorizeRoles([]string{"EMPLOYER", "CANDIDATE"}), ec.GetInboxMessages())
		protected.GET("/messages/sent/:userId", middleware.AuthorizeRoles([]string{"EMPLOYER", "CANDIDATE"}), ec.GetSentMessages())
		protected.GET("/messages/:userAId/:userBId", middleware.AuthorizeRoles([]string{"EMPLOYER", "CANDIDATE"}), ec.GetMessagesBetweenUsers())
		protected.PUT("/messages/:senderId/:receiverId/read", middleware.AuthorizeRoles([]string{"EMPLOYER", "CANDIDATE"}), ec.MarkMessagesAsRead())

		protected.GET("/search/applications/status", middleware.AuthorizeRoles([]string{"ADMIN", "EMPLOYER"}), ec.SearchApplicationsByStatus())

		protected.GET("/companies", ec.GetAllCompanies())
		protected.GET("/companies/:id", ec.GetCompanyById())
		protected.GET("/companies/employer/:id", middleware.AuthorizeRoles([]string{"EMPLOYER"}), ec.GetCompanyProfile())
		protected.PUT("/companies/:id", middleware.AuthorizeRoles([]string{"EMPLOYER"}), ec.UpdateCompanyProfile())

		protected.PUT("/admin/employers/:id/approve", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR"}), ec.ApproveEmployer())
		protected.PUT("/admin/employers/:id/reject", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR"}), ec.RejectEmployer())
		protected.GET("/admin/employers/pending", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR"}), ec.GetPendingEmployers())
		protected.GET("/admin/employers/stats", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR"}), ec.GetEmployerStats())

		protected.PUT("/admin/jobs/:id/approve", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR"}), ec.ApproveJobListing())
		protected.PUT("/admin/jobs/:id/reject", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR"}), ec.RejectJobListing())
		protected.GET("/admin/jobs/pending", middleware.AuthorizeRoles([]string{"ADMIN", "ADMINISTRATOR"}), ec.GetPendingJobListings())

		protected.GET("/internships", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.GetInternships())
		protected.GET("/internships/student/:studentId", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.GetInternshipsForStudent())

		protected.GET("/search/jobs/recommendations", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.GetJobRecommendations())

		protected.POST("/saved-jobs", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.SaveJob())
		protected.GET("/saved-jobs/candidate/:candidate_id", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.GetSavedJobs())
		protected.DELETE("/saved-jobs/candidate/:candidate_id/job/:job_id", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.UnsaveJob())

		protected.POST("/candidates/:candidateId/save-job/:jobId", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.SaveJob())
		protected.DELETE("/candidates/:candidateId/save-job/:jobId", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.UnsaveJob())
		protected.GET("/candidates/:candidateId/saved-jobs", middleware.AuthorizeRoles([]string{"STUDENT", "CANDIDATE"}), ec.GetSavedJobs())

	}
}
