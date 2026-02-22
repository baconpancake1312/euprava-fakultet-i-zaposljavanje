package handlers

import (
	"fmt"
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
		
		// Log all context values for debugging
		h.logger.Printf("[ApproveEmployer] Request to approve employer: %s", employerId)
		h.logger.Printf("[ApproveEmployer] All context keys: email, first_name, last_name, uid, user_id, user_type")
		
		// Get all relevant context values
		email, _ := c.Get("email")
		uid, _ := c.Get("uid")
		userType, _ := c.Get("user_type")
		adminIdValue, exists := c.Get("user_id")
		
		h.logger.Printf("[ApproveEmployer] Context values - email: %v, uid: %v, user_type: %v, user_id exists: %v", 
			email, uid, userType, exists)
		
		if !exists {
			h.logger.Printf("[ApproveEmployer] user_id not found in context")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
			return
		}

		h.logger.Printf("[ApproveEmployer] user_id value: %v (type: %T)", adminIdValue, adminIdValue)

		// Safely convert adminId to string
		var adminId string
		switch v := adminIdValue.(type) {
		case string:
			adminId = v
		case []byte:
			adminId = string(v)
		default:
			adminId = fmt.Sprintf("%v", v)
		}

		h.logger.Printf("[ApproveEmployer] Converted adminId: %s", adminId)

		if adminId == "" {
			h.logger.Printf("[ApproveEmployer] Admin ID is empty after conversion")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin ID is empty"})
			return
		}

		h.logger.Printf("[ApproveEmployer] Calling service.ApproveEmployer with employerId: %s, adminId: %s", employerId, adminId)
		err := h.service.ApproveEmployer(employerId, adminId)
		if err != nil {
			if isNotFoundError(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
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
		adminIdValue, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
			return
		}

		// Safely convert adminId to string
		var adminId string
		switch v := adminIdValue.(type) {
		case string:
			adminId = v
		case []byte:
			adminId = string(v)
		default:
			adminId = fmt.Sprintf("%v", v)
		}

		if adminId == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin ID is empty"})
			return
		}

		err := h.service.RejectEmployer(employerId, adminId)
		if err != nil {
			if isNotFoundError(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
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

// DebugAuthInfo returns authentication information for debugging
func (h *AdminHandler) DebugAuthInfo() gin.HandlerFunc {
	return func(c *gin.Context) {
		email, _ := c.Get("email")
		firstName, _ := c.Get("first_name")
		lastName, _ := c.Get("last_name")
		uid, _ := c.Get("uid")
		userID, _ := c.Get("user_id")
		userType, _ := c.Get("user_type")
		keycloakToken, _ := c.Get("keycloak_token")
		
		// Get raw token from header
		authHeader := c.GetHeader("Authorization")
		token := ""
		if len(authHeader) > 7 {
			token = authHeader[7:] // Remove "Bearer "
		}
		
		debugInfo := gin.H{
			"email":          email,
			"first_name":     firstName,
			"last_name":      lastName,
			"uid":            uid,
			"user_id":        userID,
			"user_id_type":   fmt.Sprintf("%T", userID),
			"user_type":      userType,
			"keycloak_token": keycloakToken,
			"token_length":   len(token),
			"token_preview":  "",
		}
		
		if len(token) > 50 {
			debugInfo["token_preview"] = token[:50] + "..."
		}
		
		c.JSON(http.StatusOK, debugInfo)
	}
}

func (h *AdminHandler) ApproveJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobId := c.Param("id")
		adminIdValue, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
			return
		}

		// Safely convert adminId to string
		var adminId string
		switch v := adminIdValue.(type) {
		case string:
			adminId = v
		case []byte:
			adminId = string(v)
		default:
			adminId = fmt.Sprintf("%v", v)
		}

		if adminId == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin ID is empty"})
			return
		}

		err := h.service.ApproveJobListing(jobId, adminId)
		if err != nil {
			if isNotFoundError(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Job listing approved successfully"})
	}
}

func (h *AdminHandler) RejectJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobId := c.Param("id")
		adminIdValue, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
			return
		}

		// Safely convert adminId to string
		var adminId string
		switch v := adminIdValue.(type) {
		case string:
			adminId = v
		case []byte:
			adminId = string(v)
		default:
			adminId = fmt.Sprintf("%v", v)
		}

		if adminId == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin ID is empty"})
			return
		}

		err := h.service.RejectJobListing(jobId, adminId)
		if err != nil {
			if isNotFoundError(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
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
