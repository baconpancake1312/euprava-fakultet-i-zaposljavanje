package handlers

import (
	"log"
	"net/http"

	"employment-service/internal/services"
	helper "employment-service/helpers"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	service *services.AdminService
	logger  *log.Logger
}

func NewAdminHandler(service *services.AdminService, logger *log.Logger) *AdminHandler {
	return &AdminHandler{
		service: service,
		logger:  logger,
	}
}

func (h *AdminHandler) ApproveEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")
		adminId, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
			return
		}

		err := h.service.ApproveEmployer(employerId, adminId.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		go func() {
			employer, err := h.service.GetEmployer(employerId)
			if err == nil && employer != nil {
				helper.CreateNotification(
					employer.User.ID.Hex(),
					"Employer Profile Approved",
					"Your employer profile has been approved by an administrator.",
					h.logger,
				)
			}
		}()

		c.JSON(http.StatusOK, gin.H{"message": "Employer approved successfully"})
	}
}

func (h *AdminHandler) RejectEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")
		adminId, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
			return
		}

		err := h.service.RejectEmployer(employerId, adminId.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Employer rejected successfully"})
	}
}

func (h *AdminHandler) GetPendingEmployers() gin.HandlerFunc {
	return func(c *gin.Context) {
		employers, err := h.service.GetPendingEmployers()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, employers)
	}
}

func (h *AdminHandler) GetEmployerStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		stats, err := h.service.GetEmployerStats()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, stats)
	}
}

func (h *AdminHandler) ApproveJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobId := c.Param("id")
		adminId, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
			return
		}

		err := h.service.ApproveJobListing(jobId, adminId.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Job listing approved successfully"})
	}
}

func (h *AdminHandler) RejectJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobId := c.Param("id")
		adminId, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
			return
		}

		err := h.service.RejectJobListing(jobId, adminId.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Job listing rejected successfully"})
	}
}

func (h *AdminHandler) GetPendingJobListings() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobs, err := h.service.GetPendingJobListings()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, jobs)
	}
}
