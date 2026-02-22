package controllers

import (
	"fmt"
	"net/http"
	"strings"
	"time"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

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

// updateUserFields updates User fields from a map (used by student and other user types).
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

// updateStudentFields updates Student-specific fields from a map.
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

func (ctrl *Controllers) UpdateStudent(c *gin.Context) {
	id := c.Param("id")

	existingStudent, err := ctrl.Repo.GetStudentByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	var updateData map[string]interface{}
	if err := c.BindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ctrl.updateUserFields(&existingStudent.User, updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := ctrl.updateStudentFields(existingStudent, updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = ctrl.Repo.UpdateStudent(existingStudent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

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

func (ctrl *Controllers) HasStudentPassedAllSubjects(student *repositories.Student) bool {
	for _, subject := range student.Subjects {
		if !subject.HasPassed {
			return false
		}
	}
	return true
}
func (ctrl *Controllers) HasStudentPassedAllSubjectsForCurrentYear(student *repositories.Student) bool {
	for _, subject := range student.Subjects {
		if subject.Year == student.Year && !subject.HasPassed {
			return false
		}
	}
	return true
}

func (ctrl *Controllers) AdvanceToNextYear(c *gin.Context) {
	id := c.Param("id")

	student, err := ctrl.Repo.GetStudentByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	if !ctrl.HasStudentPassedAllSubjectsForCurrentYear(student) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Student has not passed all subjects for current year"})
		return
	}

	student.Year++

	err = ctrl.Repo.UpdateStudent(student)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, student)
}
