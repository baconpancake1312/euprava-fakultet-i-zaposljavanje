package controllers

import (
	"net/http"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
)

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
	c.JSON(http.StatusOK, gin.H{"message": "Lectures endpoint"})
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
