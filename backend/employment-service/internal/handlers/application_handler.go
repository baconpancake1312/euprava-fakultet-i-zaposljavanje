package handlers

import (
	"log"
	"net/http"
	"strconv"

	"employment-service/models"
	"employment-service/internal/services"
	helper "employment-service/helpers"

	"github.com/gin-gonic/gin"
)

type ApplicationHandler struct {
	service *services.ApplicationService
	logger  *log.Logger
}

func NewApplicationHandler(service *services.ApplicationService, logger *log.Logger) *ApplicationHandler {
	return &ApplicationHandler{
		service: service,
		logger:  logger,
	}
}

func (h *ApplicationHandler) CreateApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		var application models.Application
		if err := c.BindJSON(&application); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		appId, err := h.service.CreateApplication(&application)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		application.ID = appId

		go func() {
			candidate, _ := h.service.GetCandidateByID(application.ApplicantId.Hex())
			if candidate != nil {
				helper.CreateNotification(
					candidate.User.ID.Hex(),
					"Application Submitted",
					"Your job application has been submitted successfully.",
					h.logger,
				)
			}
		}()

		c.JSON(http.StatusCreated, gin.H{"message": "Application created successfully", "application": application})
	}
}

func (h *ApplicationHandler) GetApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		appId := c.Param("id")
		application, err := h.service.GetApplication(appId)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, application)
	}
}

func (h *ApplicationHandler) GetAllApplications() gin.HandlerFunc {
	return func(c *gin.Context) {
		applications, err := h.service.GetAllApplications()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, applications)
	}
}

func (h *ApplicationHandler) GetApplicationsByCandidate() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("id")
		applications, err := h.service.GetApplicationsByCandidate(candidateId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, applications)
	}
}

func (h *ApplicationHandler) GetCandidateApplicationStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("id")
		stats, err := h.service.GetCandidateApplicationStats(candidateId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, stats)
	}
}

func (h *ApplicationHandler) GetApplicationsByEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")
		applications, err := h.service.GetApplicationsByEmployer(employerId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, applications)
	}
}

func (h *ApplicationHandler) GetApplicationsForJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobId := c.Param("id")
		applications, err := h.service.GetApplicationsForJob(jobId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"applications": applications})
	}
}

func (h *ApplicationHandler) UpdateApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		appId := c.Param("id")
		var application models.Application
		if err := c.BindJSON(&application); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		err := h.service.UpdateApplication(appId, &application)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Application updated successfully"})
	}
}

func (h *ApplicationHandler) AcceptApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		appId := c.Param("id")
		err := h.service.AcceptApplication(appId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		go func() {
			application, _ := h.service.GetApplication(appId)
			if application != nil {
				candidate, _ := h.service.GetCandidateByID(application.ApplicantId.Hex())
				if candidate != nil {
					helper.CreateNotification(
						candidate.User.ID.Hex(),
						"Application Accepted",
						"Congratulations! Your job application has been accepted.",
						h.logger,
					)
				}
			}
		}()

		c.JSON(http.StatusOK, gin.H{"message": "Application accepted successfully"})
	}
}

func (h *ApplicationHandler) RejectApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		appId := c.Param("id")
		err := h.service.RejectApplication(appId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		go func() {
			application, _ := h.service.GetApplication(appId)
			if application != nil {
				candidate, _ := h.service.GetCandidateByID(application.ApplicantId.Hex())
				if candidate != nil {
					helper.CreateNotification(
						candidate.User.ID.Hex(),
						"Application Rejected",
						"Your job application has been rejected.",
						h.logger,
					)
				}
			}
		}()

		c.JSON(http.StatusOK, gin.H{"message": "Application rejected successfully"})
	}
}

func (h *ApplicationHandler) DeleteApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		appId := c.Param("id")
		err := h.service.DeleteApplication(appId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Application deleted successfully"})
	}
}

func (h *ApplicationHandler) SearchApplicationsByStatus() gin.HandlerFunc {
	return func(c *gin.Context) {
		status := c.Query("status")
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

		result, err := h.service.SearchApplicationsByStatus(status, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	}
}
