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

	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

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

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("Employment service error: %s", string(body))})
		return
	}

	var response map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse employment service response"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetAllAvailableInternships fetches all available internships from the employment service
func (ctrl *Controllers) GetAllAvailableInternships(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

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

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("Employment service error: %s", string(body))})
		return
	}

	var response map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse employment service response"})
		return
	}

	c.JSON(http.StatusOK, response)
}
