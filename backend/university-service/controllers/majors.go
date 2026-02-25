package controllers

import (
	"fmt"
	"net/http"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// createMajorRequest binds department_id as a string so it is not dropped by JSON.
type createMajorRequest struct {
	Name         string                 `json:"name"`
	DepartmentID string                 `json:"department_id"`
	Subjects     []repositories.Subject `json:"subjects,omitempty"`
	Duration     int                    `json:"duration"`
	Description  string                 `json:"description"`
}

func (ctrl *Controllers) CreateMajor(c *gin.Context) {
	var req createMajorRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	major := &repositories.Major{
		Name:        req.Name,
		Subjects:    req.Subjects,
		Duration:    req.Duration,
		Description: req.Description,
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
	department.MajorIDs = removeObjectID(department.MajorIDs, majorID)
	err = ctrl.Repo.UpdateDepartment(department)
	if err != nil {
		return fmt.Errorf("failed to update department: %w", err)
	}
	return nil
}

func removeObjectID(slice []primitive.ObjectID, item primitive.ObjectID) []primitive.ObjectID {
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
	// Placeholder - not yet implemented
}

func (ctrl *Controllers) GetPassedSubjectsForStudent(c *gin.Context) {
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
