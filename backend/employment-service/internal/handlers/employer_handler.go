package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"employment-service/models"
	"employment-service/internal/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
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
		// First, bind to a map to check for user_id field
		var jsonData map[string]interface{}
		if err := c.ShouldBindJSON(&jsonData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		var employer models.Employer
		
		// Convert map to JSON and back to Employer to properly unmarshal
		jsonBytes, _ := json.Marshal(jsonData)
		if err := json.Unmarshal(jsonBytes, &employer); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body format"})
			return
		}

		// Check for user_id in JSON (from auth-service registration)
		if userIDStr, ok := jsonData["user_id"].(string); ok && userIDStr != "" {
			h.logger.Printf("[CreateEmployer] Found user_id in JSON: %s", userIDStr)
			if objectId, err := primitive.ObjectIDFromHex(userIDStr); err == nil {
				employer.User.ID = objectId
				employer.ID = objectId
				h.logger.Printf("[CreateEmployer] Set User.ID and ID from user_id: %s", objectId.Hex())
			}
		}

		// Also check for id field (from User model)
		if employer.User.ID.IsZero() {
			if idStr, ok := jsonData["id"].(string); ok && idStr != "" {
				h.logger.Printf("[CreateEmployer] Found id in JSON: %s", idStr)
				if objectId, err := primitive.ObjectIDFromHex(idStr); err == nil {
					employer.User.ID = objectId
					employer.ID = objectId
					h.logger.Printf("[CreateEmployer] Set User.ID and ID from id: %s", objectId.Hex())
				}
			}
		}

		// If user_id is provided in context (from token), use it
		if employer.User.ID.IsZero() {
			if userIDStr, ok := c.Get("uid"); ok && userIDStr != nil {
				if uidStr, ok := userIDStr.(string); ok && uidStr != "" {
					h.logger.Printf("[CreateEmployer] Got user_id from context: %s", uidStr)
					if objectId, err := primitive.ObjectIDFromHex(uidStr); err == nil {
						employer.User.ID = objectId
						employer.ID = objectId
						h.logger.Printf("[CreateEmployer] Set User.ID and ID from context: %s", objectId.Hex())
					}
				}
			}
		}

		employerId, err := h.service.CreateEmployer(&employer)
		if err != nil {
			h.logger.Printf("[CreateEmployer] Error creating employer: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		employer.ID = employerId
		h.logger.Printf("[CreateEmployer] Successfully created employer with ID: %s", employerId.Hex())
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
		h.logger.Printf("[GetEmployerByUserID] Handler called with user_id: %s", userID)
		
		employer, err := h.service.GetEmployerByUserID(userID)
		if err != nil {
			h.logger.Printf("[GetEmployerByUserID] Error: %v", err)
			
			// If employer not found and user is EMPLOYER type, try to auto-create
			userType, _ := c.Get("user_type")
			if userType == "EMPLOYER" || userType == "employer" {
				h.logger.Printf("[GetEmployerByUserID] User is EMPLOYER type, attempting to auto-create profile")
				
				// Parse userID to ObjectID
				objectId, parseErr := primitive.ObjectIDFromHex(userID)
				if parseErr != nil {
					h.logger.Printf("[GetEmployerByUserID] Invalid user_id format: %v", parseErr)
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id format"})
					return
				}
				
				// Get user info from context with safe defaults
				email, _ := c.Get("email")
				firstName, _ := c.Get("first_name")
				lastName, _ := c.Get("last_name")
				
				// Create safe string pointers
				emailStr := ""
				if email != nil {
					if s, ok := email.(string); ok {
						emailStr = s
					}
				}
				if emailStr == "" {
					emailStr = "unknown@example.com"
				}
				
				firstNameStr := ""
				if firstName != nil {
					if s, ok := firstName.(string); ok {
						firstNameStr = s
					}
				}
				if firstNameStr == "" {
					firstNameStr = "Unknown"
				}
				
				lastNameStr := ""
				if lastName != nil {
					if s, ok := lastName.(string); ok {
						lastNameStr = s
					}
				}
				if lastNameStr == "" {
					lastNameStr = "User"
				}
				
				// Try to create a minimal employer profile
				newEmployer := models.Employer{
					User: models.User{
						ID:        objectId,
						Email:     &emailStr,
						FirstName: &firstNameStr,
						LastName:  &lastNameStr,
						UserType:  models.EmployerType,
					},
					ApprovalStatus: "pending",
				}
				newEmployer.ID = newEmployer.User.ID
				
				employerId, createErr := h.service.CreateEmployer(&newEmployer)
				if createErr != nil {
					h.logger.Printf("[GetEmployerByUserID] Failed to auto-create employer: %v", createErr)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to auto-create employer profile"})
					return
				}
				
				h.logger.Printf("[GetEmployerByUserID] Auto-created employer with ID: %s", employerId.Hex())
				// Use the employer we just created instead of fetching again
				newEmployer.ID = employerId
				employer = &newEmployer
			} else {
				c.JSON(http.StatusNotFound, gin.H{"error": "Employer not found"})
				return
			}
		}
		
		h.logger.Printf("[GetEmployerByUserID] Successfully found employer with ID: %s", employer.ID.Hex())
		c.JSON(http.StatusOK, employer)
	}
}

func (h *EmployerHandler) GetAllEmployers() gin.HandlerFunc {
	return func(c *gin.Context) {
		// #region agent log
		func() {
			logData := map[string]interface{}{
				"runId":        "handler-exec",
				"hypothesisId": "B",
				"location":     "employer_handler.go:68",
				"message":      "GetAllEmployers handler called",
				"data": map[string]interface{}{
					"path":   c.Request.URL.Path,
					"method": c.Request.Method,
				},
				"timestamp": time.Now().UnixMilli(),
			}
			if logJSON, err := json.Marshal(logData); err == nil {
				if wd, err := os.Getwd(); err == nil {
					logPath := filepath.Join(wd, "..", "..", ".cursor", "debug.log")
					if f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
						f.WriteString(string(logJSON) + "\n")
						f.Close()
					}
				}
			}
		}()
		// #endregion
		employers, err := h.service.GetAllEmployers()
		if err != nil {
			// #region agent log
			func() {
				logData := map[string]interface{}{
					"runId":        "handler-exec",
					"hypothesisId": "C",
					"location":     "employer_handler.go:72",
					"message":      "GetAllEmployers error",
					"data": map[string]interface{}{
						"error": err.Error(),
					},
					"timestamp": time.Now().UnixMilli(),
				}
				if logJSON, err := json.Marshal(logData); err == nil {
					if wd, err := os.Getwd(); err == nil {
						logPath := filepath.Join(wd, "..", "..", ".cursor", "debug.log")
						if f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
							f.WriteString(string(logJSON) + "\n")
							f.Close()
						}
					}
				}
			}()
			// #endregion
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		// #region agent log
		func() {
			logData := map[string]interface{}{
				"runId":        "handler-exec",
				"hypothesisId": "B",
				"location":     "employer_handler.go:76",
				"message":      "GetAllEmployers success",
				"data": map[string]interface{}{
					"employers_count": len(employers),
				},
				"timestamp": time.Now().UnixMilli(),
			}
			if logJSON, err := json.Marshal(logData); err == nil {
				if wd, err := os.Getwd(); err == nil {
					logPath := filepath.Join(wd, "..", "..", ".cursor", "debug.log")
					if f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
						f.WriteString(string(logJSON) + "\n")
						f.Close()
					}
				}
			}
		}()
		// #endregion
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
