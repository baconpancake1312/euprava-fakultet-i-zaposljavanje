package routes

import (
	"university-service/controllers"
	"university-service/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(router *gin.Engine, ctrl *controllers.Controllers) {

	public := router.Group("/")
	{
		public.GET("/students", ctrl.GetAllStudents)
		public.GET("/professors", ctrl.GetAllProfessors)
		public.GET("/subjects", ctrl.GetAllSubjects)
		public.GET("/departments", ctrl.GetAllDepartments)
		public.GET("/universities", ctrl.GetAllUniversities)
		public.GET("/exam-sessions", ctrl.GetAllExamSessions)
		public.GET("/administrators", ctrl.GetAllAdministrators)
		public.GET("/assistants", ctrl.GetAllAssistants)
		public.GET("/majors", ctrl.GetAllMajors)

	}

	protected := router.Group("/")
	protected.Use(middleware.Authentication())
	{
		//Students
		protected.POST("/students/create", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateStudent)
		protected.GET("/students/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA", "STUDENT"}), ctrl.GetStudentByID)
		protected.PUT("/students/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA", "STUDENT"}), ctrl.UpdateStudent)
		protected.PUT("/students/:id/major?:major_id", middleware.AuthorizeRoles([]string{"PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.RegisterStudentForMajor)
		protected.DELETE("/students/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteStudent)

		// Professors
		protected.POST("/professors/create", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateProfessor)
		protected.GET("/professors/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA", "PROFESSOR", "STUDENT"}), ctrl.GetProfessorByID)
		protected.PUT("/professors/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.UpdateProfessor)
		protected.DELETE("/professors/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteProfessor)

		// Subjects
		protected.POST("/subject/create", middleware.AuthorizeRoles([]string{"PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.CreateCourse)
		protected.GET("/subject/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetCourseByID)
		protected.GET("/subjects/professor/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetSubjectsByProfessorId)
		protected.GET("/subjects/passed/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetPassedSubjectsForStudent)
		protected.PUT("/subject/:id", middleware.AuthorizeRoles([]string{"PROFESSOR"}), ctrl.UpdateSubject)
		protected.DELETE("/subject/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteSubject)

		// Departments
		protected.POST("/departments/create", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateDepartment)
		protected.GET("/departments/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetDepartmentByID)
		protected.PUT("/departments/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.UpdateDepartment)
		protected.DELETE("/departments/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteDepartment)

		// Majors
		protected.GET("/majors/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetMajorByID)
		protected.GET("/majors/:id/subjects", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetSubjectsFromMajor)
		protected.POST("/majors", middleware.AuthorizeRoles([]string{"PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.CreateMajor)
		protected.PUT("/majors/:id", middleware.AuthorizeRoles([]string{"PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.UpdateMajor)
		protected.DELETE("/majors/:id", middleware.AuthorizeRoles([]string{"PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.DeleteMajor)

		// University
		protected.POST("/universities/create", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateUniversity)
		protected.GET("/universities/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetUniversityByID)
		protected.PUT("/universities/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.UpdateUniversity)
		protected.DELETE("/universities/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteUniversity)

		// New exam system routes
		// ExamSession routes
		protected.POST("/exam-sessions/create", middleware.AuthorizeRoles([]string{"PROFESSOR"}), ctrl.CreateExamSession)
		protected.GET("/exam-sessions/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetExamSessionByID)
		protected.PUT("/exam-sessions/:id", middleware.AuthorizeRoles([]string{"PROFESSOR"}), ctrl.UpdateExamSession)
		protected.DELETE("/exam-sessions/:id", middleware.AuthorizeRoles([]string{"PROFESSOR"}), ctrl.DeleteExamSession)
		protected.GET("/exam-sessions/professor/:professorId", middleware.AuthorizeRoles([]string{"PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetExamSessionsByProfessor)
		protected.GET("/exam-sessions/student/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetExamSessionsByMajor)

		// ExamRegistration routes
		protected.POST("/exam-registrations/register", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.RegisterForExam)
		protected.DELETE("/exam-registrations/deregister/:studentId/:examSessionId", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.DeregisterFromExam)
		protected.GET("/exam-registrations/student/:studentId", middleware.AuthorizeRoles([]string{"STUDENT", "STUDENTSKA_SLUZBA"}), ctrl.GetExamRegistrationsByStudent)
		protected.GET("/exam-registrations/exam-session/:examSessionId", middleware.AuthorizeRoles([]string{"PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetExamRegistrationsByExamSession)

		// ExamGrade routes
		protected.POST("/exam-grades/create", middleware.AuthorizeRoles([]string{"PROFESSOR"}), ctrl.CreateExamGrade)
		protected.PUT("/exam-grades/:id", middleware.AuthorizeRoles([]string{"PROFESSOR"}), ctrl.UpdateExamGrade)
		protected.GET("/exam-grades/student/:studentId", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetExamGradesByStudent)
		protected.GET("/exam-grades/exam-session/:examSessionId", middleware.AuthorizeRoles([]string{"PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetExamGradesByExamSession)
		protected.GET("/exam-grades/student/:studentId/exam-session/:examSessionId", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetExamGradeByStudentAndExam)
		protected.DELETE("/exam-grades/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteExamGrade)

		// Admins
		protected.POST("/administrators/create", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateAdministrator)
		protected.GET("/administrators/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.GetAdministratorByID)
		protected.PUT("/administrators/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.UpdateAdministrator)
		protected.DELETE("/administrators/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteAdministrator)

		//Assistants
		protected.POST("/assistants/create", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateAssistant)
		protected.GET("/assistants/:id", middleware.AuthorizeRoles([]string{"PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetAssistantByID)
		protected.PUT("/assistants/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.UpdateAssistant)
		protected.DELETE("/assistants/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteAssistant)

		// Notifications
		protected.POST("/notifications", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateNotificationByRecipientHandler)
		protected.GET("/notifications/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetNotificationByIDHandler)
		protected.PUT("/notifications/:id/seen", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.UpdateNotificationSeen)
		protected.GET("/notifications/user/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetNotificationByUserIDHandler)
		protected.GET("/notifications", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetAllNotificationsHandler)
		protected.DELETE("/notifications/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.DeleteNotificationHandler)

		// Internship
		protected.POST("/internship/apply/:id", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.CreateInternshipApplication)
		protected.GET("/internship_application/:id", middleware.AuthorizeRoles([]string{"STUDENT", "STUDENTSKA_SLUZBA"}), ctrl.GetInternshipApplicationById)
		protected.PUT("/internship_application/:id", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.UpdateInternshipApplication)
		protected.DELETE("/internship_application/:id", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.DeleteInternshipApplication)
		protected.GET("/internship_applications/:studentId", middleware.AuthorizeRoles([]string{"STUDENT", "STUDENTSKA_SLUZBA"}), ctrl.GetAllInternshipApplicationsForStudent)

		protected.GET("/internships/student/:studentId", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.GetInternshipsForStudent)

		// Misc

		protected.GET("/lectures", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR"}), ctrl.GetLectures)
		protected.POST("/tuition/pay", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.PayTuition)
	}
}
