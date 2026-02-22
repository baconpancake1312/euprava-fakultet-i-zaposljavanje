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
