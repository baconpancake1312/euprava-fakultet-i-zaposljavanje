package controllers

import (
	"fmt"
	"net/http"
	"time"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Controllers struct {
	Repo *repositories.Repository
}

func NewControllers(repo *repositories.Repository) *Controllers {
	return &Controllers{Repo: repo}
}

func (ctrl *Controllers) CreateStudent(c *gin.Context) {
	var student repositories.Student
	if err := c.BindJSON(&student); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.Repo.CreateStudent(&student)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, student)
}

func (ctrl *Controllers) GetStudentByID(c *gin.Context) {
	id := c.Param("id")

	student, err := ctrl.Repo.GetStudentByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	c.JSON(http.StatusOK, student)
}

func (ctrl *Controllers) UpdateStudent(c *gin.Context) {
	id := c.Param("id")
	var student repositories.Student
	if err := c.BindJSON(&student); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	student.ID = objectID

	err = ctrl.Repo.UpdateStudent(&student)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, student)
}

func (ctrl *Controllers) DeleteStudent(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteStudent(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (ctrl *Controllers) CreateProfessor(c *gin.Context) {
	var professor repositories.Professor
	if err := c.BindJSON(&professor); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.Repo.CreateProfessor(&professor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, professor)
}

func (ctrl *Controllers) GetProfessorByID(c *gin.Context) {
	id := c.Param("id")

	professor, err := ctrl.Repo.GetProfessorByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Professor not found"})
		return
	}

	c.JSON(http.StatusOK, professor)
}

func (ctrl *Controllers) UpdateProfessor(c *gin.Context) {
	id := c.Param("id")
	var professor repositories.Professor
	if err := c.BindJSON(&professor); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	professor.ID = objectID

	err = ctrl.Repo.UpdateProfessor(&professor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, professor)
}

func (ctrl *Controllers) DeleteProfessor(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteProfessor(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (ctrl *Controllers) CreateCourse(c *gin.Context) {
	fmt.Println("Hello, World!")
	var course repositories.Course
	if err := c.BindJSON(&course); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.Repo.CreateCourse(&course)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, course)
}

func (ctrl *Controllers) GetCourseByID(c *gin.Context) {
	id := c.Param("id")

	course, err := ctrl.Repo.GetCourseByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	c.JSON(http.StatusOK, course)
}

func (ctrl *Controllers) UpdateCourse(c *gin.Context) {
	id := c.Param("id")
	var course repositories.Course
	if err := c.BindJSON(&course); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	course.ID = objectID

	err = ctrl.Repo.UpdateCourse(&course)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, course)
}

func (ctrl *Controllers) DeleteCourse(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteCourse(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (ctrl *Controllers) CreateDepartment(c *gin.Context) {
	var department repositories.Department
	if err := c.BindJSON(&department); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.Repo.CreateDepartment(&department)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, department)
}

func (ctrl *Controllers) GetDepartmentByID(c *gin.Context) {
	id := c.Param("id")

	department, err := ctrl.Repo.GetDepartmentByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Department not found"})
		return
	}

	c.JSON(http.StatusOK, department)
}

func (ctrl *Controllers) UpdateDepartment(c *gin.Context) {
	id := c.Param("id")
	var department repositories.Department
	if err := c.BindJSON(&department); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	department.ID = objectID

	err = ctrl.Repo.UpdateDepartment(&department)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, department)
}

func (ctrl *Controllers) DeleteDepartment(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteDepartment(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (ctrl *Controllers) CreateUniversity(c *gin.Context) {
	var university repositories.University
	if err := c.BindJSON(&university); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.Repo.CreateUniversity(&university)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, university)
}

func (ctrl *Controllers) GetUniversityByID(c *gin.Context) {
	id := c.Param("id")

	university, err := ctrl.Repo.GetUniversityByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "University not found"})
		return
	}

	c.JSON(http.StatusOK, university)
}

func (ctrl *Controllers) UpdateUniversity(c *gin.Context) {
	id := c.Param("id")
	var university repositories.University
	if err := c.BindJSON(&university); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	university.ID = objectID

	err = ctrl.Repo.UpdateUniversity(&university)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, university)
}

func (ctrl *Controllers) DeleteUniversity(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteUniversity(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (ctrl *Controllers) CreateExam(c *gin.Context) {
	var exam repositories.Exam
	if err := c.BindJSON(&exam); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.Repo.CreateExam(&exam)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, exam)
}

func (ctrl *Controllers) GetExamByID(c *gin.Context) {
	id := c.Param("id")

	exam, err := ctrl.Repo.GetExamByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam not found"})
		return
	}

	c.JSON(http.StatusOK, exam)
}

func (ctrl *Controllers) UpdateExam(c *gin.Context) {
	id := c.Param("id")
	var exam repositories.Exam
	if err := c.BindJSON(&exam); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	exam.ID = objectID

	err = ctrl.Repo.UpdateExam(&exam)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, exam)
}

func (ctrl *Controllers) DeleteExam(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteExam(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (ctrl *Controllers) ManageExams(c *gin.Context) {
	var exam repositories.Exam
	if err := c.BindJSON(&exam); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.Repo.CreateExam(&exam)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, exam)
}

func (ctrl *Controllers) CancelExam(c *gin.Context) {
	id := c.Param("id")

	exam, err := ctrl.Repo.GetExamByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam not found"})
		return
	}

	exam.Status = "canceled"

	err = ctrl.Repo.UpdateExam(exam)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Exam canceled successfully"})
}

func (ctrl *Controllers) CreateAdministrator(c *gin.Context) {
	var administrator repositories.Administrator
	if err := c.BindJSON(&administrator); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.Repo.CreateAdministrator(&administrator)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, administrator)
}

func (ctrl *Controllers) GetAdministratorByID(c *gin.Context) {
	id := c.Param("id")

	administrator, err := ctrl.Repo.GetAdministratorByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Administrator not found"})
		return
	}

	c.JSON(http.StatusOK, administrator)
}

func (ctrl *Controllers) UpdateAdministrator(c *gin.Context) {
	id := c.Param("id")
	var administrator repositories.Administrator
	if err := c.BindJSON(&administrator); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	administrator.ID = objectID

	err = ctrl.Repo.UpdateAdministrator(&administrator)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, administrator)
}

func (ctrl *Controllers) DeleteAdministrator(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteAdministrator(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (ctrl *Controllers) CreateAssistant(c *gin.Context) {
	var assistant repositories.Assistant
	if err := c.BindJSON(&assistant); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.Repo.CreateAssistant(&assistant)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, assistant)
}

func (ctrl *Controllers) GetAssistantByID(c *gin.Context) {
	id := c.Param("id")

	assistant, err := ctrl.Repo.GetAssistantByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assistant not found"})
		return
	}

	c.JSON(http.StatusOK, assistant)
}

func (ctrl *Controllers) UpdateAssistant(c *gin.Context) {
	id := c.Param("id")
	var assistant repositories.Assistant
	if err := c.BindJSON(&assistant); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	assistant.ID = objectID

	err = ctrl.Repo.UpdateAssistant(&assistant)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, assistant)
}

func (ctrl *Controllers) DeleteAssistant(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteAssistant(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (ctrl *Controllers) GetAllStudents(c *gin.Context) {
	students, err := ctrl.Repo.GetAllStudents()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, students)
}

func (ctrl *Controllers) GetAllProfessors(c *gin.Context) {
	professors, err := ctrl.Repo.GetAllProfessors()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, professors)
}

func (ctrl *Controllers) GetAllCourses(c *gin.Context) {
	courses, err := ctrl.Repo.GetAllCourses()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, courses)
}

func (ctrl *Controllers) GetAllDepartments(c *gin.Context) {
	departments, err := ctrl.Repo.GetAllDepartments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, departments)
}

func (ctrl *Controllers) GetAllUniversities(c *gin.Context) {
	universities, err := ctrl.Repo.GetAllUniversities()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, universities)
}

func (ctrl *Controllers) GetAllExams(c *gin.Context) {
	exams, err := ctrl.Repo.GetAllExams()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, exams)
}

func (ctrl *Controllers) GetAllAdministrators(c *gin.Context) {
	administrators, err := ctrl.Repo.GetAllAdministrators()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, administrators)
}

func (ctrl *Controllers) GetAllAssistants(c *gin.Context) {
	assistants, err := ctrl.Repo.GetAllAssistants()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, assistants)
}

func (ctrl *Controllers) RegisterExam(c *gin.Context) {
	var exam repositories.Exam
	if err := c.BindJSON(&exam); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.Repo.RegisterExam(&exam)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Exam registered successfully!"})
}

func (ctrl *Controllers) DeregisterExam(c *gin.Context) {
	studentID, err := primitive.ObjectIDFromHex(c.Param("studentID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	courseID, err := primitive.ObjectIDFromHex(c.Param("courseID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	err = ctrl.Repo.DeregisterExam(studentID, courseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Exam deregistered successfully!"})
}

func (ctrl *Controllers) GetExamCalendar(c *gin.Context) {
	exams, err := ctrl.Repo.GetExamCalendar()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, exams)
}

func (ctrl *Controllers) GetLectures(c *gin.Context) {
	lectures, err := ctrl.Repo.GetLectures()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, lectures)
}

func (ctrl *Controllers) PayTuition(c *gin.Context) {
	var payment repositories.TuitionPayment
	if err := c.BindJSON(&payment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.Repo.PayTuition(&payment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Tuition payment successful!"})
}
func (ctrl *Controllers) CreateNotificationHandler(c *gin.Context) {
	var newNotification repositories.Notification
	if err := c.ShouldBindJSON(&newNotification); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ctrl.Repo.CreateNotification(&newNotification); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusCreated)
}

func (ctrl *Controllers) CreateNotificationByHealthcareHandler(c *gin.Context) {
	var appointmentData map[string]interface{}

	if err := c.ShouldBindJSON(&appointmentData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	description := "Systematic check appointment details: "
	if date, ok := appointmentData["date"].(string); ok {
		description += "Date: " + date + ", "
	}
	var facultyName, fieldOfStudy string
	if facultyNameVal, ok := appointmentData["faculty_name"].(string); ok {
		facultyName = facultyNameVal
		description += "Faculty: " + facultyName + ", "
	}
	if fieldOfStudyVal, ok := appointmentData["field_of_study"].(string); ok {
		fieldOfStudy = fieldOfStudyVal
		description += "Field of Study: " + fieldOfStudy + ", "
	}
	if descriptionText, ok := appointmentData["description"].(string); ok {
		description += "Description: " + descriptionText
	}

	existingNotification, err := ctrl.Repo.GetNotificationByDescription(facultyName, fieldOfStudy)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	if existingNotification != nil {
		existingNotification.Content = description
		if err := ctrl.Repo.UpdateNotification(existingNotification); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusOK)
		return
	} else {
		notification := repositories.Notification{
			Title:     "New Appointment for Systematic Check Notification",
			Content:   description,
			CreatedAt: time.Now(),
		}

		if err := ctrl.Repo.CreateNotification(&notification); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

	}

	c.Status(http.StatusOK)
}

func (ctrl *Controllers) GetNotificationByIDHandler(c *gin.Context) {
	notificationID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}

	notification, err := ctrl.Repo.GetNotificationByID(notificationID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	c.JSON(http.StatusOK, notification)
}

func (ctrl *Controllers) GetAllNotificationsHandler(c *gin.Context) {
	notifications, err := ctrl.Repo.GetAllNotifications()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, notifications)
}

func (ctrl *Controllers) DeleteNotificationHandler(c *gin.Context) {
	notificationID := c.Param("id")

	err := ctrl.Repo.DeleteNotification(notificationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusOK)
}
