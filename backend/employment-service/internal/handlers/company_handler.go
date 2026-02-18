package handlers

import (
	"log"
	"net/http"

	"employment-service/models"
	"employment-service/internal/services"

	"github.com/gin-gonic/gin"
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

		err := h.service.UpdateCompany(companyId, &company)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
