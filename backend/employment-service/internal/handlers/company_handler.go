package handlers

import (
	"log"
	"net/http"

	"employment-service/models"
	"employment-service/internal/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CompanyHandler struct {
	service *services.CompanyService
	logger  *log.Logger
}

func NewCompanyHandler(service *services.CompanyService, logger *log.Logger) *CompanyHandler {
	return &CompanyHandler{
		service: service,
		logger:  logger,
	}
}

func (h *CompanyHandler) GetCompanyProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")
		company, err := h.service.GetCompanyByEmployerId(employerId)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, company)
	}
}

func (h *CompanyHandler) UpdateCompanyProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		companyId := c.Param("id")
		var company models.Company
		if err := c.BindJSON(&company); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Get employer_id from JWT context if not provided in company object
		if company.EmployerId.IsZero() {
			if uidValue, exists := c.Get("uid"); exists {
				if uidStr, ok := uidValue.(string); ok && uidStr != "" {
					if objectId, err := primitive.ObjectIDFromHex(uidStr); err == nil {
						company.EmployerId = objectId
						h.logger.Printf("[UpdateCompanyProfile] Set EmployerId from JWT context: %s", uidStr)
					}
				}
			}
		}

		err := h.service.UpdateCompany(companyId, &company)
		if err != nil {
			if isNotFoundError(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Company profile updated successfully"})
	}
}

func (h *CompanyHandler) GetAllCompanies() gin.HandlerFunc {
	return func(c *gin.Context) {
		companies, err := h.service.GetAllCompanies()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, companies)
	}
}

func (h *CompanyHandler) GetCompanyById() gin.HandlerFunc {
	return func(c *gin.Context) {
		companyId := c.Param("id")
		company, err := h.service.GetCompanyById(companyId)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, company)
	}
}
