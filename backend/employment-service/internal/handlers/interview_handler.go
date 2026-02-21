package handlers

import (
	"log"
	"net/http"

	"employment-service/models"
	"employment-service/internal/services"

	"github.com/gin-gonic/gin"
)

type InterviewHandler struct {
	service *services.InterviewService
	logger  *log.Logger
}

func NewInterviewHandler(service *services.InterviewService, logger *log.Logger) *InterviewHandler {
	return &InterviewHandler{
		service: service,
		logger:  logger,
	}
}

func (h *InterviewHandler) CreateInterview() gin.HandlerFunc {
	return func(c *gin.Context) {
		var interview models.Interview
		if err := c.BindJSON(&interview); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		id, err := h.service.CreateInterview(&interview)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		interview.ID = id
		c.JSON(http.StatusOK, gin.H{"message": "Interview scheduled", "interview": interview})
	}
}

func (h *InterviewHandler) GetInterviewsByCandidate() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("id")
		interviews, err := h.service.GetInterviewsByCandidate(candidateId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, interviews)
	}
}

func (h *InterviewHandler) GetInterviewsByEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")
		interviews, err := h.service.GetInterviewsByEmployer(employerId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, interviews)
	}
}

func (h *InterviewHandler) UpdateInterviewStatus() gin.HandlerFunc {
	return func(c *gin.Context) {
		interviewId := c.Param("id")
		var req struct {
			Status string `json:"status"`
		}

		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		err := h.service.UpdateInterviewStatus(interviewId, req.Status)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Interview status updated successfully"})
	}
}
