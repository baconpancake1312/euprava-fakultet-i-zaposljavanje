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
		public.GET("/courses", ctrl.GetAllCourses)
		public.GET("/departments", ctrl.GetAllDepartments)
		public.GET("/universities", ctrl.GetAllUniversities)
		public.GET("/exams", ctrl.GetAllExams)
		public.GET("/administrators", ctrl.GetAllAdministrators)
		public.GET("/assistants", ctrl.GetAllAssistants)
	}

	protected := router.Group("/")
	protected.Use(middleware.Authentication())
	{
		protected.POST("/students/create", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateStudent)
		protected.GET("/students/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA", "STUDENT"}), ctrl.GetStudentByID)
		protected.PUT("/students/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.UpdateStudent)
		protected.DELETE("/students/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteStudent)

		protected.POST("/professors/create", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateProfessor)
		protected.GET("/professors/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA", "PROFESSOR"}), ctrl.GetProfessorByID)
		protected.PUT("/professors/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.UpdateProfessor)
		protected.DELETE("/professors/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteProfessor)

		protected.POST("/courses/create", middleware.AuthorizeRoles([]string{"PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.CreateCourse)
		protected.GET("/courses/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetCourseByID)
		protected.PUT("/courses/:id", middleware.AuthorizeRoles([]string{"PROFESSOR"}), ctrl.UpdateCourse)
		protected.DELETE("/courses/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteCourse)

		protected.POST("/departments/create", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateDepartment)
		protected.GET("/departments/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetDepartmentByID)
		protected.PUT("/departments/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.UpdateDepartment)
		protected.DELETE("/departments/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteDepartment)

		protected.POST("/universities/create", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateUniversity)
		protected.GET("/universities/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetUniversityByID)
		protected.PUT("/universities/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.UpdateUniversity)
		protected.DELETE("/universities/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteUniversity)

		protected.POST("/exams/create", middleware.AuthorizeRoles([]string{"PROFESSOR"}), ctrl.CreateExam)
		protected.GET("/exams/:id", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetExamByID)
		protected.PUT("/exams/:id", middleware.AuthorizeRoles([]string{"PROFESSOR"}), ctrl.UpdateExam)
		protected.DELETE("/exams/:id", middleware.AuthorizeRoles([]string{"PROFESSOR"}), ctrl.DeleteExam)
		protected.POST("/manage-exams", middleware.AuthorizeRoles([]string{"PROFESSOR"}), ctrl.ManageExams)
		protected.POST("/cancel-exam/:id", middleware.AuthorizeRoles([]string{"PROFESSOR"}), ctrl.CancelExam)

		protected.POST("/administrators/create", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateAdministrator)
		protected.GET("/administrators/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.GetAdministratorByID)
		protected.PUT("/administrators/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.UpdateAdministrator)
		protected.DELETE("/administrators/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteAdministrator)

		protected.POST("/assistants/create", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateAssistant)
		protected.GET("/assistants/:id", middleware.AuthorizeRoles([]string{"PROFESSOR", "STUDENTSKA_SLUZBA"}), ctrl.GetAssistantByID)
		protected.PUT("/assistants/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.UpdateAssistant)
		protected.DELETE("/assistants/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteAssistant)

		protected.POST("/exams/register", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.RegisterExam)
		protected.DELETE("/exams/deregister/:studentID/:courseID", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.DeregisterExam)
		protected.GET("/exams/calendar", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR"}), ctrl.GetExamCalendar)

		protected.GET("/lectures", middleware.AuthorizeRoles([]string{"STUDENT", "PROFESSOR"}), ctrl.GetLectures)
		protected.POST("/tuition/pay", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.PayTuition)

		protected.POST("/notificationsByHealthcare", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateNotificationByHealthcareHandler)
		protected.POST("/notifications", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.CreateNotificationHandler)
		protected.GET("/notifications/:id", middleware.AuthorizeRoles([]string{"STUDENT", "STUDENTSKA_SLUZBA"}), ctrl.GetNotificationByIDHandler)
		protected.GET("/notifications", middleware.AuthorizeRoles([]string{"STUDENT", "STUDENTSKA_SLUZBA"}), ctrl.GetAllNotificationsHandler)
		protected.DELETE("/notifications/:id", middleware.AuthorizeRoles([]string{"STUDENTSKA_SLUZBA"}), ctrl.DeleteNotificationHandler)

		protected.POST("/internship/apply/:id", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.CreateInternshipApplication)
		protected.GET("/internship_application/:id", middleware.AuthorizeRoles([]string{"STUDENT", "STUDENTSKA_SLUZBA"}), ctrl.GetInternshipApplicationById)
		protected.PUT("/internship_application/:id", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.UpdateInternshipApplication)
		protected.DELETE("/internship_application/:id", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.DeleteInternshipApplication)
		protected.GET("/internship_applications/:studentId", middleware.AuthorizeRoles([]string{"STUDENT", "STUDENTSKA_SLUZBA"}), ctrl.GetAllInternshipApplicationsForStudent)

		protected.GET("/internships/student/:studentId", middleware.AuthorizeRoles([]string{"STUDENT"}), ctrl.GetInternshipsForStudent)
	}
}
