package controllers

import (
	"net/http"

	"employment-service/models"

	"github.com/gin-gonic/gin"
)

func (ec *EmploymentController) CreateInterview() gin.HandlerFunc {
	return func(c *gin.Context) {
		var interview models.Interview
		if err := c.BindJSON(&interview); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}
		id, err := ec.repo.CreateInterview(&interview)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		interview.ID = id
		c.JSON(http.StatusOK, gin.H{"message": "Interview scheduled", "interview": interview})
	}
}

func (ec *EmploymentController) GetInterviewsByCandidate() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("id")
		interviews, err := ec.repo.GetInterviewsByCandidate(candidateId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, interviews)
	}
}

func (ec *EmploymentController) GetInterviewsByEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")
		interviews, err := ec.repo.GetInterviewsByEmployer(employerId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, interviews)
	}
}

func (ec *EmploymentController) UpdateInterviewStatus() gin.HandlerFunc {
	return func(c *gin.Context) {
		interviewId := c.Param("id")
		var req struct {
			Status string `json:"status"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}
		err := ec.repo.UpdateInterview(interviewId, map[string]interface{}{"status": req.Status})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Interview status updated"})
	}
}
