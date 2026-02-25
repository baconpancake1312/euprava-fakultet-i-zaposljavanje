package handlers

import (
	"log"
	"net/http"
	"strconv"

	"employment-service/internal/services"

	"github.com/gin-gonic/gin"
)

type SearchHandler struct {
	service *services.SearchService
	logger  *log.Logger
}

func NewSearchHandler(service *services.SearchService, logger *log.Logger) *SearchHandler {
	return &SearchHandler{
		service: service,
		logger:  logger,
	}
}

func (h *SearchHandler) SearchUsersByText() gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("q")
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

		result, err := h.service.SearchUsersByText(query, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	}
}

func (h *SearchHandler) SearchEmployersByText() gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("q")
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

		result, err := h.service.SearchEmployersByText(query, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	}
}

func (h *SearchHandler) SearchCandidatesByText() gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("q")
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

		result, err := h.service.SearchCandidatesByText(query, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	}
}
