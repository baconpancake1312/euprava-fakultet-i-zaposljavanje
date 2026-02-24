package handlers

import (
	"log"
	"net/http"

	"employment-service/internal/services"
	"github.com/gin-gonic/gin"
)

type SocialHandler struct {
	service *services.SocialService
	logger  *log.Logger
}

func NewSocialHandler(service *services.SocialService, logger *log.Logger) *SocialHandler {
	return &SocialHandler{
		service: service,
		logger:  logger,
	}
}

// === Admin handlers ===

// GET /admin/benefit-claims
func (h *SocialHandler) AdminGetAllBenefitClaims() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, err := h.service.GetAllBenefitClaims()
		if err != nil {
			h.logger.Printf("AdminGetAllBenefitClaims error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, claims)
	}
}

// PUT /admin/benefit-claims/:id/status
func (h *SocialHandler) AdminUpdateBenefitClaimStatus() gin.HandlerFunc {
	type request struct {
		Status string `json:"status"`
	}
	return func(c *gin.Context) {
		id := c.Param("id")
		var req request
		if err := c.BindJSON(&req); err != nil || req.Status == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "status is required"})
		 return
		}
		if err := h.service.UpdateBenefitClaimStatus(id, req.Status); err != nil {
			h.logger.Printf("AdminUpdateBenefitClaimStatus error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusNoContent)
	}
}

// POST /benefit-claims
func (h *SocialHandler) CreateBenefitClaim() gin.HandlerFunc {
	type request struct {
		CandidateID string `json:"candidate_id"`
		Reason      string `json:"reason"`
	}

	return func(c *gin.Context) {
		var req request
		if err := c.BindJSON(&req); err != nil || req.CandidateID == "" || req.Reason == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "candidate_id and reason are required"})
			return
		}

		claim, err := h.service.CreateBenefitClaim(req.CandidateID, req.Reason)
		if err != nil {
			h.logger.Printf("CreateBenefitClaim error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, claim)
	}
}

// GET /benefit-claims/candidate/:id
func (h *SocialHandler) GetBenefitClaims() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateID := c.Param("id")
		if candidateID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "candidate ID is required"})
			return
		}
		claims, err := h.service.GetBenefitClaims(candidateID)
		if err != nil {
			h.logger.Printf("GetBenefitClaims error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, claims)
	}
}

// POST /state-competitions/applications
func (h *SocialHandler) CreateCompetitionApplication() gin.HandlerFunc {
	type request struct {
		CandidateID string `json:"candidate_id"`
		Title       string `json:"title"`
		Issuer      string `json:"issuer"`
	}

	return func(c *gin.Context) {
		var req request
		if err := c.BindJSON(&req); err != nil || req.CandidateID == "" || req.Title == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "candidate_id and title are required"})
			return
		}

		app, err := h.service.CreateCompetitionApplication(req.CandidateID, req.Title, req.Issuer)
		if err != nil {
			h.logger.Printf("CreateCompetitionApplication error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, app)
	}
}

// GET /state-competitions/applications/candidate/:id
func (h *SocialHandler) GetCompetitionApplications() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateID := c.Param("id")
		if candidateID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "candidate ID is required"})
			return
		}
		apps, err := h.service.GetCompetitionApplications(candidateID)
		if err != nil {
			h.logger.Printf("GetCompetitionApplications error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, apps)
	}
}

// GET /admin/state-competitions/applications
func (h *SocialHandler) AdminGetAllCompetitionApplications() gin.HandlerFunc {
	return func(c *gin.Context) {
		apps, err := h.service.GetAllCompetitionApplications()
		if err != nil {
			h.logger.Printf("AdminGetAllCompetitionApplications error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, apps)
	}
}

// PUT /admin/state-competitions/applications/:id/status
func (h *SocialHandler) AdminUpdateCompetitionApplicationStatus() gin.HandlerFunc {
	type request struct {
		Status string `json:"status"`
	}
	return func(c *gin.Context) {
		id := c.Param("id")
		var req request
		if err := c.BindJSON(&req); err != nil || req.Status == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "status is required"})
			return
		}
		if err := h.service.UpdateCompetitionApplicationStatus(id, req.Status); err != nil {
			h.logger.Printf("AdminUpdateCompetitionApplicationStatus error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusNoContent)
	}
}

// POST /state-communications
func (h *SocialHandler) CreateStateCommunication() gin.HandlerFunc {
	type request struct {
		CandidateID string `json:"candidate_id"`
		Subject     string `json:"subject"`
		Message     string `json:"message"`
	}

	return func(c *gin.Context) {
		var req request
		if err := c.BindJSON(&req); err != nil || req.CandidateID == "" || req.Subject == "" || req.Message == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "candidate_id, subject and message are required"})
			return
		}

		com, err := h.service.CreateStateCommunication(req.CandidateID, req.Subject, req.Message)
		if err != nil {
			h.logger.Printf("CreateStateCommunication error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, com)
	}
}

// GET /state-communications/candidate/:id
func (h *SocialHandler) GetStateCommunications() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateID := c.Param("id")
		if candidateID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "candidate ID is required"})
			return
		}
		comms, err := h.service.GetStateCommunications(candidateID)
		if err != nil {
			h.logger.Printf("GetStateCommunications error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, comms)
	}
}

// GET /admin/state-communications
func (h *SocialHandler) AdminGetAllStateCommunications() gin.HandlerFunc {
	return func(c *gin.Context) {
		comms, err := h.service.GetAllStateCommunications()
		if err != nil {
			h.logger.Printf("AdminGetAllStateCommunications error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, comms)
	}
}

// PUT /admin/state-communications/:id
func (h *SocialHandler) AdminUpdateStateCommunication() gin.HandlerFunc {
	type request struct {
		Status   string `json:"status"`
		Response string `json:"response"`
	}
	return func(c *gin.Context) {
		id := c.Param("id")
		var req request
		if err := c.BindJSON(&req); err != nil || req.Status == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "status is required"})
			return
		}
		if err := h.service.UpdateStateCommunication(id, req.Status, req.Response); err != nil {
			h.logger.Printf("AdminUpdateStateCommunication error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusNoContent)
	}
}

