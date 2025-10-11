package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
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
func (ctrl *Controllers) GetStudentByIDLocal(id string) (*repositories.Student, error) {

	student, err := ctrl.Repo.GetStudentByID(id)
	if err != nil {

		return student, err
	}
	return student, nil
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
	var subject repositories.Subject
	if err := c.BindJSON(&subject); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.Repo.CreateSubject(&subject)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, subject)
}

func (ctrl *Controllers) GetCourseByID(c *gin.Context) {
	id := c.Param("id")

	subject, err := ctrl.Repo.GetSubjectByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	c.JSON(http.StatusOK, subject)
}

func (ctrl *Controllers) UpdateSubject(c *gin.Context) {
	id := c.Param("id")
	var subject repositories.Subject
	if err := c.BindJSON(&subject); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	subject.ID = objectID

	err = ctrl.Repo.UpdateSubject(&subject)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subject)
}

func (ctrl *Controllers) DeleteSubject(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteSubject(id)
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

	departments, err := ctrl.Repo.GetAllDepartments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, departmentElement := range departments {
		for _, oldProgram := range departmentElement.MajorIDs {
			for _, newProgram := range department.MajorIDs {
				if oldProgram == newProgram {
					major, err := ctrl.Repo.GetMajorByID(newProgram)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					if major != nil {
						c.JSON(http.StatusBadRequest, gin.H{
							"error": "Department " + departmentElement.Name + " already has this major: " + major.Name,
						})
						return
					}
				}
			}
		}
	}
	err = ctrl.Repo.CreateDepartment(&department)
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

func (ctrl *Controllers) GetAllSubjects(c *gin.Context) {
	subjects, err := ctrl.Repo.GetAllSubjects()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subjects)
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
func (ctrl *Controllers) CreateInternshipApplication(c *gin.Context) {
	var internApp repositories.InternshipApplication
	if err := c.BindJSON(&internApp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	internApp.CreatedAt = time.Now()
	internApp.Status = "Pending"

	err := ctrl.Repo.CreateInternshipApplication(&internApp)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, internApp)
}

func (ctrl *Controllers) GetInternshipApplicationById(c *gin.Context) {
	id := c.Param("id")

	internApp, err := ctrl.Repo.GetInternshipApplicationById(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Internship application not found"})
		return
	}

	c.JSON(http.StatusOK, internApp)
}

func (ctrl *Controllers) GetAllInternshipApplicationsForStudent(c *gin.Context) {
	id := c.Param("student_id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	internApps, err := ctrl.Repo.GetAllInternshipApplicationsForStudent(objectID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Internship applications not found"})
		return
	}

	c.JSON(http.StatusOK, internApps)
}

func (ctrl *Controllers) UpdateInternshipApplication(c *gin.Context) {
	id := c.Param("id")
	var internApp repositories.InternshipApplication
	if err := c.BindJSON(&internApp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	internApp.ID = objectID

	err = ctrl.Repo.UpdateInternshipApplication(&internApp)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, internApp)
}

func (ctrl *Controllers) DeleteInternshipApplication(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteInternshipApplication(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// GetInternshipsForStudent fetches internships from the employment service for a specific student
func (ctrl *Controllers) GetInternshipsForStudent(c *gin.Context) {
	studentId := c.Param("studentId")
	if studentId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Student ID is required"})
		return
	}

	// Get pagination parameters
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

	// Make HTTP request to employment service
	employmentServiceURL := fmt.Sprintf("http://employment-service:8080/internships/student/%s?page=%d&limit=%d", studentId, page, limit)

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Get(employmentServiceURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to employment service"})
		return
	}
	defer resp.Body.Close()

	// Check if the request was successful
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("Employment service error: %s", string(body))})
		return
	}

	// Parse the response
	var response map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse employment service response"})
		return
	}

	// Return the internships data
	c.JSON(http.StatusOK, response)
}

// GetAllAvailableInternships fetches all available internships from the employment service
func (ctrl *Controllers) GetAllAvailableInternships(c *gin.Context) {
	// Get pagination parameters
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

	// Make HTTP request to employment service to get internships (IsInternship = true)
	employmentServiceURL := fmt.Sprintf("http://employment-service:8089/search/jobs/internship?internship=true&page=%d&limit=%d", page, limit)

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Get(employmentServiceURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to employment service"})
		return
	}
	defer resp.Body.Close()

	// Check if the request was successful
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("Employment service error: %s", string(body))})
		return
	}

	// Parse the response
	var response map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse employment service response"})
		return
	}

	// Return the internships data
	c.JSON(http.StatusOK, response)
}
func (ctrl *Controllers) CreateExamSession(c *gin.Context) {
	var req repositories.CreateExamSessionRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch the full subject and professor objects
	subject, err := ctrl.Repo.GetSubjectByID(req.SubjectID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	professor, err := ctrl.Repo.GetProfessorByID(req.ProfessorID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Professor not found"})
		return
	}

	// Create the exam session with full objects
	examSession := repositories.ExamSession{
		Subject:     *subject,
		Professor:   *professor,
		ExamDate:    req.ExamDate,
		Location:    req.Location,
		MaxStudents: req.MaxStudents,
	}

	err = ctrl.Repo.CreateExamSession(&examSession)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, examSession)
}

func (ctrl *Controllers) GetExamSessionByID(c *gin.Context) {
	id := c.Param("id")

	examSession, err := ctrl.Repo.GetExamSessionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam session not found"})
		return
	}

	c.JSON(http.StatusOK, examSession)
}

func (ctrl *Controllers) GetExamSessionsByProfessor(c *gin.Context) {
	professorID := c.Param("professorId")
	objectID, err := primitive.ObjectIDFromHex(professorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid professor ID"})
		return
	}

	examSessions, err := ctrl.Repo.GetExamSessionsByProfessor(objectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, examSessions)
}

func (ctrl *Controllers) UpdateExamSession(c *gin.Context) {
	id := c.Param("id")
	var examSession repositories.ExamSession
	if err := c.BindJSON(&examSession); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	examSession.ID = objectID

	err = ctrl.Repo.UpdateExamSession(&examSession)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, examSession)
}

func (ctrl *Controllers) DeleteExamSession(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteExamSession(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (ctrl *Controllers) GetAllExamSessions(c *gin.Context) {
	examSessions, err := ctrl.Repo.GetAllExamSessions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, examSessions)
}

// ExamRegistration Controllers
func (ctrl *Controllers) RegisterForExam(c *gin.Context) {
	var req repositories.CreateExamRegistrationRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch the full student and exam session objects
	student, err := ctrl.Repo.GetStudentByID(req.StudentID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}
	student.ID = req.StudentID

	examSession, err := ctrl.Repo.GetExamSessionByID(req.ExamSessionID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam session not found"})
		return
	}

	// Check if student is already registered
	alreadyRegistered, err := ctrl.Repo.CheckExamRegistration(req.StudentID, req.ExamSessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if alreadyRegistered {
		c.JSON(http.StatusConflict, gin.H{"error": "Student is already registered for this exam"})
		return
	}

	// Create the registration with full objects
	registration := repositories.ExamRegistration{
		Student:       *student,
		ExamSessionID: *&examSession.ID,
	}

	err = ctrl.Repo.RegisterForExam(&registration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Successfully registered for exam"})
}

func (ctrl *Controllers) DeregisterFromExam(c *gin.Context) {
	studentID, err := primitive.ObjectIDFromHex(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	examSessionID, err := primitive.ObjectIDFromHex(c.Param("examSessionId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam session ID"})
		return
	}

	err = ctrl.Repo.DeregisterFromExam(studentID, examSessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully deregistered from exam"})
}

func (ctrl *Controllers) GetExamRegistrationsByStudent(c *gin.Context) {
	studentID, err := primitive.ObjectIDFromHex(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	registrations, err := ctrl.Repo.GetExamRegistrationsByStudent(studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, registrations)
}

func (ctrl *Controllers) GetExamRegistrationsByExamSession(c *gin.Context) {
	examSessionID, err := primitive.ObjectIDFromHex(c.Param("examSessionId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam session ID"})
		return
	}

	registrations, err := ctrl.Repo.GetExamRegistrationsByExamSession(examSessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, registrations)
}

// ExamGrade Controllers
func (ctrl *Controllers) CreateExamGrade(c *gin.Context) {
	var req repositories.CreateExamGradeRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate grade range (5-10)
	if req.Grade < 5 || req.Grade > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Grade must be between 5 and 10"})
		return
	}

	// Fetch the full student and exam session objects
	fetchedStudent, err := ctrl.Repo.GetStudentByID(req.StudentID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	examSession, err := ctrl.Repo.GetExamSessionByID(req.ExamSessionID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam session not found"})
		return
	}

	// Get professor from exam session for grading
	professor := examSession.Professor

	// Create the grade with full objects
	grade := repositories.ExamGrade{
		Student:     *fetchedStudent,
		ExamSession: *examSession,
		Grade:       req.Grade,
		Passed:      req.Grade >= 6,
		GradedBy:    professor,
		Comments:    req.Comments,
	}

	err = ctrl.Repo.CreateExamGrade(&grade)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, grade)
}

func (ctrl *Controllers) UpdateExamGrade(c *gin.Context) {
	id := c.Param("id")
	var grade repositories.ExamGrade
	if err := c.BindJSON(&grade); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate grade range (5-10)
	if grade.Grade < 5 || grade.Grade > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Grade must be between 5 and 10"})
		return
	}

	// Set passed status based on grade
	grade.Passed = grade.Grade >= 6

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	grade.ID = objectID

	err = ctrl.Repo.UpdateExamGrade(&grade)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, grade)
}

func (ctrl *Controllers) GetExamGradesByStudent(c *gin.Context) {
	studentID, err := primitive.ObjectIDFromHex(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	grades, err := ctrl.Repo.GetExamGradesByStudent(studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, grades)
}

func (ctrl *Controllers) GetExamGradesByExamSession(c *gin.Context) {
	examSessionID, err := primitive.ObjectIDFromHex(c.Param("examSessionId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam session ID"})
		return
	}

	grades, err := ctrl.Repo.GetExamGradesByExamSession(examSessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, grades)
}

func (ctrl *Controllers) GetExamGradeByStudentAndExam(c *gin.Context) {
	studentID, err := primitive.ObjectIDFromHex(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	examSessionID, err := primitive.ObjectIDFromHex(c.Param("examSessionId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam session ID"})
		return
	}

	grade, err := ctrl.Repo.GetExamGradeByStudentAndExam(studentID, examSessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Grade not found"})
		return
	}

	c.JSON(http.StatusOK, grade)
}
func (ctrl *Controllers) CreateMajor(c *gin.Context) {
	var major repositories.Major
	if err := c.BindJSON(&major); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ctrl.Repo.CreateMajor(&major); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create major"})
		return
	}

	c.JSON(http.StatusCreated, major)
}

func (ctrl *Controllers) GetAllMajors(c *gin.Context) {
	majors, err := ctrl.Repo.GetAllMajors()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch majors"})
		return
	}
	c.JSON(http.StatusOK, majors)
}

func (ctrl *Controllers) GetMajorByID(c *gin.Context) {
	idParam := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid major ID"})
		return
	}

	major, err := ctrl.Repo.GetMajorByID(objID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch major"})
		return
	}
	if major == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Major not found"})
		return
	}

	c.JSON(http.StatusOK, major)
}

func (ctrl *Controllers) UpdateMajor(c *gin.Context) {
	idParam := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid major ID"})
		return
	}

	var updateData repositories.Major
	if err := c.BindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ctrl.Repo.UpdateMajor(objID, &updateData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update major"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Major updated successfully"})
}
func (ctrl *Controllers) DeleteMajor(c *gin.Context) {
	idParam := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid major ID"})
		return
	}

	if err := ctrl.Repo.DeleteMajor(objID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete major"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Major deleted successfully"})
}

func (ctrl *Controllers) GetSubjectsFromMajor(c *gin.Context) {
	idParam := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid major ID"})
		return
	}

	subjects, err := ctrl.Repo.GetSubjectsFromMajor(objID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subjects"})
		return
	}

	c.JSON(http.StatusOK, subjects)
}
