package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Controllers struct {
	Repo   *repositories.Repository
	logger *log.Logger
}

// ValidationError represents a validation error that should return HTTP 400
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

func NewControllers(repo *repositories.Repository, l *log.Logger) *Controllers {
	return &Controllers{Repo: repo, logger: l}
}

// createStudentRequest is used for binding the create-student payload.
// When the auth service creates a user and then calls this endpoint, it sends user_id
// so the university-service stores the same ID and the two services stay in sync.
type createStudentRequest struct {
	UserID string `json:"user_id"` // optional; from auth service – used as student.ID when set
	repositories.Student
}

func (ctrl *Controllers) CreateStudent(c *gin.Context) {
	var req createStudentRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	student := &req.Student

	// Use auth service's user_id as student ID so it matches the user record in auth DB
	if req.UserID != "" {
		objectID, err := primitive.ObjectIDFromHex(req.UserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id format"})
			return
		}
		student.ID = objectID
	} else {
		// Caller did not send user_id (e.g. manual create); let repository use new ID if needed
		if student.ID.IsZero() {
			student.ID = primitive.NewObjectID()
		}
	}

	err := ctrl.Repo.CreateStudent(student)
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

// Helper function to update User fields
func (ctrl *Controllers) updateUserFields(user *repositories.User, updateData map[string]interface{}) error {
	var errors []string

	if firstName, ok := updateData["first_name"]; ok {
		if firstNameStr, ok := firstName.(string); ok {
			user.FirstName = &firstNameStr
		} else {
			errors = append(errors, "first_name must be a string")
		}
	}
	if lastName, ok := updateData["last_name"]; ok {
		if lastNameStr, ok := lastName.(string); ok {
			user.LastName = &lastNameStr
		} else {
			errors = append(errors, "last_name must be a string")
		}
	}
	if email, ok := updateData["email"]; ok {
		if emailStr, ok := email.(string); ok {
			user.Email = &emailStr
		} else {
			errors = append(errors, "email must be a string")
		}
	}
	if password, ok := updateData["password"]; ok {
		if passwordStr, ok := password.(string); ok {
			user.Password = &passwordStr
		} else {
			errors = append(errors, "password must be a string")
		}
	}
	if phone, ok := updateData["phone"]; ok {
		if phoneStr, ok := phone.(string); ok {
			user.Phone = &phoneStr
		} else {
			errors = append(errors, "phone must be a string")
		}
	}
	if address, ok := updateData["address"]; ok {
		if addressStr, ok := address.(string); ok {
			user.Address = &addressStr
		} else {
			errors = append(errors, "address must be a string")
		}
	}
	if dateOfBirth, ok := updateData["date_of_birth"]; ok {
		if dateOfBirthStr, ok := dateOfBirth.(string); ok {
			// Try RFC3339Nano first (handles milliseconds), then RFC3339
			var parsedDate time.Time
			var err error
			if parsedDate, err = time.Parse(time.RFC3339Nano, dateOfBirthStr); err != nil {
				if parsedDate, err = time.Parse(time.RFC3339, dateOfBirthStr); err != nil {
					errors = append(errors, fmt.Sprintf("date_of_birth must be a valid RFC3339 date string: %v", err))
				}
			}
			if err == nil {
				user.DateOfBirth = parsedDate
			}
		} else {
			errors = append(errors, "date_of_birth must be a string")
		}
	}
	if jmbg, ok := updateData["jmbg"]; ok {
		if jmbgStr, ok := jmbg.(string); ok {
			user.JMBG = jmbgStr
		} else {
			errors = append(errors, "jmbg must be a string")
		}
	}
	if userType, ok := updateData["user_type"]; ok {
		if userTypeStr, ok := userType.(string); ok {
			user.UserType = repositories.UserType(userTypeStr)
		} else {
			errors = append(errors, "user_type must be a string")
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("validation errors: %s", strings.Join(errors, ", "))
	}
	return nil
}

// Helper function to update Student-specific fields
func (ctrl *Controllers) updateStudentFields(student *repositories.Student, updateData map[string]interface{}) error {
	var errors []string

	if majorID, ok := updateData["major_id"]; ok {
		if majorIDStr, ok := majorID.(string); ok {
			if objectID, err := primitive.ObjectIDFromHex(majorIDStr); err == nil {
				student.MajorID = objectID
			} else {
				errors = append(errors, "major_id must be a valid ObjectID")
			}
		} else {
			errors = append(errors, "major_id must be a string")
		}
	}
	if year, ok := updateData["year"]; ok {
		if yearFloat, ok := year.(float64); ok {
			student.Year = int(yearFloat)
		} else {
			errors = append(errors, "year must be a number")
		}
	}
	if highschoolGPA, ok := updateData["highschool_gpa"]; ok {
		if gpaFloat, ok := highschoolGPA.(float64); ok {
			student.HighschoolGPA = gpaFloat
		} else {
			errors = append(errors, "highschool_gpa must be a number")
		}
	}
	if gpa, ok := updateData["gpa"]; ok {
		if gpaFloat, ok := gpa.(float64); ok {
			student.GPA = gpaFloat
		} else {
			errors = append(errors, "gpa must be a number")
		}
	}
	if cvFile, ok := updateData["cv_file"]; ok {
		if cvFileStr, ok := cvFile.(string); ok {
			student.CVFile = cvFileStr
		} else {
			errors = append(errors, "cv_file must be a string")
		}
	}
	if cvBase64, ok := updateData["cv_base64"]; ok {
		if cvBase64Str, ok := cvBase64.(string); ok {
			student.CVBase64 = cvBase64Str
		} else {
			errors = append(errors, "cv_base64 must be a string")
		}
	}
	if skills, ok := updateData["skills"]; ok {
		if skillsSlice, ok := skills.([]interface{}); ok {
			var skillsList []string
			for _, skill := range skillsSlice {
				if skillStr, ok := skill.(string); ok {
					skillsList = append(skillsList, skillStr)
				} else {
					errors = append(errors, "all skills must be strings")
					break
				}
			}
			student.Skills = skillsList
		} else {
			errors = append(errors, "skills must be an array of strings")
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("validation errors: %s", strings.Join(errors, ", "))
	}
	return nil
}

// Main UpdateStudent function
func (ctrl *Controllers) UpdateStudent(c *gin.Context) {
	id := c.Param("id")

	// First, get the existing student
	existingStudent, err := ctrl.Repo.GetStudentByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	// Create a map to hold only the fields that should be updated
	var updateData map[string]interface{}
	if err := c.BindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update User fields (inherited from User struct)
	if err := ctrl.updateUserFields(&existingStudent.User, updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update Student-specific fields
	if err := ctrl.updateStudentFields(existingStudent, updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update the student in the database
	err = ctrl.Repo.UpdateStudent(existingStudent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return the updated student
	c.JSON(http.StatusOK, existingStudent)
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

type createProfessorRequest struct {
	UserID string `json:"user_id"`
	repositories.Professor
}

func (ctrl *Controllers) CreateProfessor(c *gin.Context) {
	var req createProfessorRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	professor := &req.Professor
	if req.UserID != "" {
		objectID, err := primitive.ObjectIDFromHex(req.UserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id format"})
			return
		}
		professor.ID = objectID
	} else if professor.ID.IsZero() {
		professor.ID = primitive.NewObjectID()
	}

	err := ctrl.Repo.CreateProfessor(professor)
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
	for _, majorID := range department.MajorIDs {
		err = ctrl.AddDepartmentToMajor(department.ID, majorID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
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
	department, err := ctrl.Repo.GetDepartmentByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, majorID := range department.MajorIDs {
		err = ctrl.RemoveDepartmentFromMajor(majorID, department.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	err = ctrl.Repo.DeleteDepartment(id)
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

type createAdministratorRequest struct {
	UserID string `json:"user_id"`
	repositories.Administrator
}

func (ctrl *Controllers) CreateAdministrator(c *gin.Context) {
	var req createAdministratorRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	administrator := &req.Administrator
	if req.UserID != "" {
		objectID, err := primitive.ObjectIDFromHex(req.UserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id format"})
			return
		}
		administrator.ID = objectID
	} else if administrator.ID.IsZero() {
		administrator.ID = primitive.NewObjectID()
	}

	err := ctrl.Repo.CreateAdministrator(administrator)
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

type createAssistantRequest struct {
	UserID string `json:"user_id"`
	repositories.Assistant
}

func (ctrl *Controllers) CreateAssistant(c *gin.Context) {
	var req createAssistantRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	assistant := &req.Assistant
	if req.UserID != "" {
		objectID, err := primitive.ObjectIDFromHex(req.UserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id format"})
			return
		}
		assistant.ID = objectID
	} else if assistant.ID.IsZero() {
		assistant.ID = primitive.NewObjectID()
	}

	err := ctrl.Repo.CreateAssistant(assistant)
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

// CreateNotificationByRecipient creates notifications for recipients based on the notification request.
// Returns the count of created notifications and an error (ValidationError for validation issues, regular error for server errors).
func (ctrl *Controllers) CreateNotificationByRecipient(req repositories.Notification) (int, error) {
	// Validate recipient type
	validTypes := map[string]bool{
		"id":                    true,
		"role":                  true,
		"department":            true,
		"department_professors": true,
		"department_students":   true,
		"major":                 true,
		"major_students":        true,
		"major_professors":      true,
	}
	if !validTypes[req.RecipientType] {
		return 0, &ValidationError{Message: "Invalid recipient_type. Must be: id, role, department, or major"}
	}

	var recipientIDs []primitive.ObjectID

	switch req.RecipientType {
	case "id":
		// Single user by ID
		userID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid user ID format"}
		}
		recipientIDs = []primitive.ObjectID{userID}

	case "role":
		// All users with a specific role
		validRoles := map[string]bool{
			"STUDENT":           true,
			"PROFESSOR":         true,
			"ASSISTANT":         true,
			"ADMINISTRATOR":     true,
			"STUDENTSKA_SLUZBA": true,
		}
		if !validRoles[req.RecipientValue] {
			return 0, &ValidationError{Message: "Invalid role. Must be: STUDENT, PROFESSOR, ASSISTANT, ADMINISTRATOR, or STUDENTSKA_SLUZBA"}
		}

		switch req.RecipientValue {
		case "STUDENT":
			students, err := ctrl.Repo.GetAllStudents()
			if err != nil {
				return 0, fmt.Errorf("failed to get students: %w", err)
			}
			for _, student := range students {
				recipientIDs = append(recipientIDs, student.ID)
			}
		case "PROFESSOR":
			professors, err := ctrl.Repo.GetAllProfessors()
			if err != nil {
				return 0, fmt.Errorf("failed to get professors: %w", err)
			}
			for _, professor := range professors {
				recipientIDs = append(recipientIDs, professor.ID)
			}
		case "ASSISTANT":
			assistants, err := ctrl.Repo.GetAllAssistants()
			if err != nil {
				return 0, fmt.Errorf("failed to get assistants: %w", err)
			}
			for _, assistant := range assistants {
				recipientIDs = append(recipientIDs, assistant.ID)
			}
		case "ADMINISTRATOR", "STUDENTSKA_SLUZBA":
			administrators, err := ctrl.Repo.GetAllAdministrators()
			if err != nil {
				return 0, fmt.Errorf("failed to get administrators: %w", err)
			}
			for _, admin := range administrators {
				recipientIDs = append(recipientIDs, admin.ID)
			}
		}

	case "department":
		// All users in a department
		departmentID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid department ID format"}
		}
		recipientIDs, err = ctrl.Repo.GetUsersByDepartmentID(departmentID)
		ctrl.logger.Println("Sending notification to department", departmentID.Hex())
		ctrl.logger.Println("recipientIDs", recipientIDs)
		if err != nil {
			return 0, fmt.Errorf("failed to get users by department: %w", err)
		}

	case "major":
		// All students in a major
		majorID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid major ID format"}
		}
		students, err := ctrl.Repo.GetStudentsByMajorID(majorID)
		if err != nil {
			return 0, fmt.Errorf("failed to get students by major: %w", err)
		}
		for _, student := range students {
			recipientIDs = append(recipientIDs, student.ID)
		}
		ctrl.logger.Println("Sending notification to major", majorID.Hex())
		ctrl.logger.Println("recipientIDs", recipientIDs)
	case "major_students":
		majorID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid major ID format"}
		}
		students, err := ctrl.Repo.GetStudentsByMajorID(majorID)
		if err != nil {
			return 0, fmt.Errorf("failed to get students by major: %w", err)
		}
		for _, student := range students {
			recipientIDs = append(recipientIDs, student.ID)
		}
	case "major_professors":
		majorID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid major ID format"}
		}
		professors, err := ctrl.Repo.GetProfessorsByMajorId(majorID)
		if err != nil {
			return 0, fmt.Errorf("failed to get professors by major: %w", err)
		}
		for _, professor := range professors {
			recipientIDs = append(recipientIDs, professor.ID)
		}
	case "department_professors":
		departmentID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid department ID format"}
		}
		department, err := ctrl.Repo.GetDepartmentByID(departmentID.Hex())
		if err != nil {
			return 0, fmt.Errorf("failed to get department: %w", err)
		}
		for _, user := range department.StaffIDs {
			recipientIDs = append(recipientIDs, user)
		}

	case "department_students":
		departmentID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid department ID format"}
		}
		department, err := ctrl.Repo.GetDepartmentByID(departmentID.Hex())
		if err != nil {
			return 0, fmt.Errorf("failed to get department: %w", err)
		}
		majorIds := department.MajorIDs
		for _, majorId := range majorIds {
			students, err := ctrl.Repo.GetStudentsByMajorID(majorId)
			if err != nil {
				return 0, fmt.Errorf("failed to get students by major: %w", err)
			}
			for _, student := range students {
				recipientIDs = append(recipientIDs, student.ID)
			}
		}
	}

	// Create one separate notification document per recipient (no sharing)
	createdCount := 0
	for _, recipientID := range recipientIDs {
		notification := repositories.Notification{
			RecipientID:    recipientID,
			RecipientType:  req.RecipientType,
			RecipientValue: req.RecipientValue,
			Title:          req.Title,
			Content:        req.Content,
			CreatedAt:      time.Now(),
			Seen:           false,
		}
		if err := ctrl.Repo.CreateNotification(&notification); err != nil {
			return createdCount, fmt.Errorf("failed to create notification for user %s: %w", recipientID.Hex(), err)
		}
		createdCount++
	}

	return createdCount, nil
}

func (ctrl *Controllers) CreateNotificationByRecipientHandler(c *gin.Context) {
	var req repositories.Notification
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	createdCount, err := ctrl.CreateNotificationByRecipient(req)
	if err != nil {
		// Check if it's a validation error
		if validationErr, ok := err.(*ValidationError); ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		// Otherwise it's an internal server error
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": fmt.Sprintf("Successfully created %d notifications", createdCount),
		"count":   createdCount,
	})
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

func (ctrl *Controllers) UpdateNotificationHandler(c *gin.Context) {
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
	var req repositories.Notification
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	notification.Title = req.Title
	notification.Content = req.Content
	notification.Seen = req.Seen
	err = ctrl.Repo.UpdateNotification(notification)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusOK)
}
func (ctrl *Controllers) UpdateNotificationSeen(c *gin.Context) {
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
	notification.Seen = true
	err = ctrl.Repo.UpdateNotification(notification)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
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
func (ctrl *Controllers) GetNotificationByUserIDHandler(c *gin.Context) {
	userID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}
	
	notifications, err := ctrl.Repo.GetNotificationsByUserID(userID)
	if err != nil {
		// Return empty array instead of error if no notifications found
		c.JSON(http.StatusOK, []repositories.Notification{})
		return
	}

	// Return empty array if nil
	if notifications == nil {
		notifications = []repositories.Notification{}
	}

	c.JSON(http.StatusOK, notifications)
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
		c.JSON(http.StatusNotFound, gin.H{"error": "Subject not found"})
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

func (ctrl *Controllers) GetExamSessionsByMajor(c *gin.Context) {
	studentId := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(studentId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	examSessions, err := ctrl.Repo.GetExamSessionsByStudent(objectID)
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
	oldExamSession, err := ctrl.Repo.GetExamSessionByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	examSession.ID = objectID

	err = ctrl.Repo.UpdateExamSession(&examSession)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	registrations, err := ctrl.Repo.GetExamRegistrationsByExamSession(examSession.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, registration := range registrations {
		_, err = ctrl.CreateNotificationByRecipient(repositories.Notification{
			RecipientID:    registration.Student.ID,
			RecipientType:  "id",
			RecipientValue: registration.Student.ID.Hex(),
			Title:          "The " + oldExamSession.Subject.Name + " exam you registered for has been updated",
			Content:        "The exam date is: " + examSession.ExamDate.Format(time.DateOnly) + " at " + examSession.ExamDate.Format(time.TimeOnly) + " \nThe location is: " + examSession.Location + " \nThe maximum number of students is " + strconv.Itoa(examSession.MaxStudents),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"notificationerror": err.Error()})
			continue
		}
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

	examRegistration, err := ctrl.Repo.GetExamRegistrationById(req.ExamRegistrationId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam session not found"})
		return
	}

	examSession, err := ctrl.Repo.GetExamSessionByID(examRegistration.ExamSessionID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam session not found"})
		return
	}

	examSession.Status = repositories.Completed
	err = ctrl.Repo.UpdateExamSession(examSession)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam session not found"})
		return
	}

	// Get professor from exam session for grading
	professor := examSession.Professor

	// Create the grade with full objects
	grade := repositories.ExamGrade{
		Student:            *fetchedStudent,
		ExamRegistrationId: req.ExamRegistrationId,
		ExamSessionId:      examSession.ID,
		SubjectId:          examSession.Subject.ID,
		Grade:              req.Grade,
		Passed:             req.Grade >= 6,
		GradedBy:           professor,
		Comments:           req.Comments,
	}

	err = ctrl.Repo.CreateExamGrade(&grade)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if grade.Passed {
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		fetchedStudent.GPA = (fetchedStudent.GPA + float64(grade.Grade)) / 2

		err := ctrl.Repo.UpdateStudent(fetchedStudent)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		_, err = ctrl.CreateNotificationByRecipient(repositories.Notification{
			RecipientID:    grade.Student.ID,
			RecipientType:  "id",
			RecipientValue: grade.Student.ID.Hex(),
			Title:          "You have passed the " + examSession.Subject.Name + " exam",
			Content:        "You have passed the " + examSession.Subject.Name + " exam with a grade of " + strconv.Itoa(grade.Grade) + ". \nHere is the comment from professor " + *grade.GradedBy.FirstName + " " + *grade.GradedBy.LastName + ": " + grade.Comments,
		})
	} else {
		_, err = ctrl.CreateNotificationByRecipient(repositories.Notification{
			RecipientID:    grade.Student.ID,
			RecipientType:  "id",
			RecipientValue: grade.Student.ID.Hex(),
			Title:          "You have failed the " + examSession.Subject.Name + " exam",
			Content:        "You have failed the " + examSession.Subject.Name + " exam, better luck next time. \nHere is the comment from professor " + *grade.GradedBy.FirstName + " " + *grade.GradedBy.LastName + ": " + grade.Comments,
		})
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

func (ctrl *Controllers) DeleteExamGrade(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid grade ID"})
		return
	}

	err = ctrl.Repo.DeleteExamGrade(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
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

// createMajorRequest binds department_id as a string so it is not dropped by JSON (ObjectID does not unmarshal from string by default).
type createMajorRequest struct {
	Name         string                 `json:"name"`
	DepartmentID string                 `json:"department_id"`
	Subjects     []repositories.Subject `json:"subjects,omitempty"`
}

func (ctrl *Controllers) CreateMajor(c *gin.Context) {
	var req createMajorRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	major := &repositories.Major{
		Name:     req.Name,
		Subjects: req.Subjects,
	}
	if req.DepartmentID != "" {
		depID, err := primitive.ObjectIDFromHex(req.DepartmentID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid department_id format"})
			return
		}
		major.DepartmentID = &depID
	}

	id, err := ctrl.Repo.CreateMajor(major)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create major"})
		return
	}
	major.ID, err = primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create major"})
		return
	}

	c.JSON(http.StatusCreated, major)
}

func (ctrl *Controllers) GetAllMajors(c *gin.Context) {
	majors, err := ctrl.Repo.GetAllMajors()
	if err != nil {
		ctrl.logger.Println(err.Error())
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
func (ctrl *Controllers) AddDepartmentToMajor(departmentID primitive.ObjectID, majorID primitive.ObjectID) error {
	major, err := ctrl.Repo.GetMajorByID(majorID)
	if err != nil {
		return err
	}
	if major == nil {
		return fmt.Errorf("major not found")
	}
	major.DepartmentID = &departmentID
	err = ctrl.Repo.UpdateMajor(majorID, major)
	if err != nil {
		return fmt.Errorf("failed to update major: %w", err)
	}
	if major == nil {
		return fmt.Errorf("major not found")
	}
	return nil
}
func (ctrl *Controllers) RemoveDepartmentFromMajor(majorID primitive.ObjectID, departmentID primitive.ObjectID) error {
	major, err := ctrl.Repo.GetMajorByID(majorID)
	if err != nil {
		return err
	}
	if major == nil {
		return fmt.Errorf("major not found")
	}
	major.DepartmentID = nil
	err = ctrl.Repo.UpdateMajor(majorID, major)
	if err != nil {
		return fmt.Errorf("failed to update major: %w", err)
	}
	if major.DepartmentID == nil {
		return fmt.Errorf("department not found")
	}
	return nil
}
func (ctrl *Controllers) AddMajorToDepartment(departmentID primitive.ObjectID, majorID primitive.ObjectID) error {
	department, err := ctrl.Repo.GetDepartmentByID(departmentID.Hex())
	if err != nil {
		return err
	}
	if department == nil {
		return fmt.Errorf("department not found")
	}
	department.MajorIDs = append(department.MajorIDs, majorID)
	err = ctrl.Repo.UpdateDepartment(department)
	if err != nil {
		return fmt.Errorf("failed to update department: %w", err)
	}
	return nil
}
func (ctrl *Controllers) RemoveMajorFromDepartment(departmentID primitive.ObjectID, majorID primitive.ObjectID) error {
	department, err := ctrl.Repo.GetDepartmentByID(departmentID.Hex())
	if err != nil {
		return err
	}
	if department == nil {
		return fmt.Errorf("department not found")
	}
	department.MajorIDs = remove(department.MajorIDs, majorID)
	err = ctrl.Repo.UpdateDepartment(department)
	if err != nil {
		return fmt.Errorf("failed to update department: %w", err)
	}
	return nil
}
func remove(slice []primitive.ObjectID, item primitive.ObjectID) []primitive.ObjectID {
	for i, v := range slice {
		if v == item {
			return append(slice[:i], slice[i+1:]...)
		}
	}
	return slice
}

func (ctrl *Controllers) UpdateMajor(c *gin.Context) {
	idParam := c.Param("id")
	majorObjID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid major ID"})
		return
	}

	var updateData repositories.Major
	if err := c.BindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ctrl.Repo.UpdateMajor(majorObjID, &updateData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update major"})
		return
	}
	if updateData.DepartmentID != nil {
		err = ctrl.AddMajorToDepartment(*updateData.DepartmentID, majorObjID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
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
	major, err := ctrl.Repo.GetMajorByID(objID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get major"})
		return
	}
	if major == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Major not found"})
		return
	}

	if err := ctrl.Repo.DeleteMajor(objID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete major"})
		return
	}

	if major.DepartmentID != nil {
		err = ctrl.RemoveMajorFromDepartment(*major.DepartmentID, objID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
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

func (ctrl *Controllers) RegisterStudentForMajor(c *gin.Context) {
	//studentId := c.Param("id")
	//studentObjId, err := primitive.ObjectIDFromHex(studentId)
	//majorId := c.Param("major_id")
	//	majorObjId, err := primitive.ObjectIDFromHex(majorId)

}
func (ctrl *Controllers) GetPassedSubjectsForStudent(c *gin.Context) {
	// student id -> get his grades -> get subjects from grades
	studentIdParam := c.Param("id")
	studentObjID, err := primitive.ObjectIDFromHex(studentIdParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid major ID"})
		return
	}
	grades, err := ctrl.Repo.GetExamGradesByStudent(studentObjID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch grades for student"})
		return
	}
	fmt.Printf("grades: %v", grades)
	var passingGrades []repositories.ExamGrade
	for _, grade := range grades {
		if grade.Passed {
			passingGrades = append(passingGrades, grade)
		}
	}
	var passedSubjects []repositories.Subject
	for _, passingGrade := range passingGrades {
		subject, err := ctrl.Repo.GetSubjectByID(passingGrade.SubjectId.Hex())
		id := passingGrade.ID
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Subject id in grade " + id.Hex() + " is invalid"})
			return
		}
		passedSubjects = append(passedSubjects, *subject)
	}

	c.JSON(http.StatusOK, passedSubjects)
}
func (ctrl *Controllers) GetSubjectsByProfessorId(c *gin.Context) {
	professorId, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid professor ID"})
		return
	}

	subjects, err := ctrl.Repo.GetSubjectsByProfessorId(professorId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, subjects)
}
