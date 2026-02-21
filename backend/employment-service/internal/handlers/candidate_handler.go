package handlers

import (
	"log"
	"net/http"

	"employment-service/models"
	"employment-service/internal/services"

	"github.com/gin-gonic/gin"
)

type CandidateHandler struct {
	service *services.CandidateService
	logger  *log.Logger
}

func NewCandidateHandler(service *services.CandidateService, logger *log.Logger) *CandidateHandler {
	return &CandidateHandler{
		service: service,
		logger:  logger,
	}
}

func (h *CandidateHandler) CreateCandidate() gin.HandlerFunc {
	return func(c *gin.Context) {
		var candidate models.Candidate
		if err := c.BindJSON(&candidate); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		candidateId, err := h.service.CreateCandidate(&candidate)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		candidate.ID = candidateId
		c.JSON(http.StatusOK, gin.H{"message": "Candidate created successfully", "candidate": candidate})
	}
}

func (h *CandidateHandler) GetCandidate() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("id")
		candidate, err := h.service.GetCandidate(candidateId)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, candidate)
	}
}

func (h *CandidateHandler) GetCandidateByUserID() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("user_id")
		candidate, err := h.service.GetCandidateByUserID(userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Candidate not found"})
			return
		}
		c.JSON(http.StatusOK, candidate)
	}
}

func (h *CandidateHandler) GetAllCandidates() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidates, err := h.service.GetAllCandidates()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, candidates)
	}
}

func (h *CandidateHandler) UpdateCandidate() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("id")
		var candidate models.Candidate
		if err := c.BindJSON(&candidate); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		err := h.service.UpdateCandidate(candidateId, &candidate)
		if err != nil {
			if isNotFoundError(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Candidate updated successfully"})
	}
}

func (h *CandidateHandler) DeleteCandidate() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("id")
		err := h.service.DeleteCandidate(candidateId)
		if err != nil {
			if isNotFoundError(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Candidate deleted successfully"})
	}
}
