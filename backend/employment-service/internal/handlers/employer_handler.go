package handlers

import (
	"log"
	"net/http"

	"employment-service/models"
	"employment-service/internal/services"

	"github.com/gin-gonic/gin"
)

type EmployerHandler struct {
	service *services.EmployerService
	logger  *log.Logger
}

func NewEmployerHandler(service *services.EmployerService, logger *log.Logger) *EmployerHandler {
	return &EmployerHandler{
		service: service,
		logger:  logger,
	}
}

func (h *EmployerHandler) CreateEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		var employer models.Employer
		if err := c.BindJSON(&employer); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		employerId, err := h.service.CreateEmployer(&employer)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		employer.ID = employerId
		c.JSON(http.StatusOK, gin.H{"message": "Employer created successfully", "employer": employer})
	}
}

func (h *EmployerHandler) GetEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")
		employer, err := h.service.GetEmployer(employerId)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, employer)
	}
}

func (h *EmployerHandler) GetEmployerByUserID() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("user_id")
		employer, err := h.service.GetEmployerByUserID(userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Employer not found"})
			return
		}
		c.JSON(http.StatusOK, employer)
	}
}

func (h *EmployerHandler) GetAllEmployers() gin.HandlerFunc {
	return func(c *gin.Context) {
		employers, err := h.service.GetAllEmployers()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, employers)
	}
}

func (h *EmployerHandler) UpdateEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")
		var employer models.Employer
		if err := c.BindJSON(&employer); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		err := h.service.UpdateEmployer(employerId, &employer)
		if err != nil {
			if isNotFoundError(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Employer updated successfully"})
	}
}

func (h *EmployerHandler) DeleteEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")
		err := h.service.DeleteEmployer(employerId)
		if err != nil {
			if isNotFoundError(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Employer deleted successfully"})
	}
}
