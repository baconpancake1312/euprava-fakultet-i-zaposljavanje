package handlers

import (
	"log"
	"net/http"
	"strconv"

	"employment-service/models"
	"employment-service/internal/services"

	"github.com/gin-gonic/gin"
)

type JobHandler struct {
	service *services.JobService
	logger  *log.Logger
}

func NewJobHandler(service *services.JobService, logger *log.Logger) *JobHandler {
	return &JobHandler{
		service: service,
		logger:  logger,
	}
}

func (h *JobHandler) CreateJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		var job models.JobListing
		if err := c.BindJSON(&job); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		jobId, err := h.service.CreateJobListing(&job)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		job.ID = jobId
		c.JSON(http.StatusCreated, gin.H{"message": "Job listing created successfully", "job": job})
	}
}

func (h *JobHandler) GetJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobId := c.Param("id")
		job, err := h.service.GetJobListing(jobId)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, job)
	}
}

func (h *JobHandler) GetAllJobListings() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobs, err := h.service.GetAllJobListings()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, jobs)
	}
}

func (h *JobHandler) UpdateJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobId := c.Param("id")
		var job models.JobListing
		if err := c.BindJSON(&job); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		err := h.service.UpdateJobListing(jobId, &job)
		if err != nil {
			if isNotFoundError(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Job listing updated successfully"})
	}
}

func (h *JobHandler) DeleteJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobId := c.Param("id")
		err := h.service.DeleteJobListing(jobId)
		if err != nil {
			if isNotFoundError(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Job listing deleted successfully"})
	}
}

func (h *JobHandler) SearchJobsByText() gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("q")
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

		result, err := h.service.SearchJobsByText(query, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	}
}

func (h *JobHandler) SearchJobsByInternship() gin.HandlerFunc {
	return func(c *gin.Context) {
		isInternship := c.Query("internship") == "true"
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

		result, err := h.service.SearchJobsByInternship(isInternship, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	}
}

func (h *JobHandler) GetActiveJobs() gin.HandlerFunc {
	return func(c *gin.Context) {
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
		jobs, err := h.service.GetActiveJobs(limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"active_jobs": jobs})
	}
}

func (h *JobHandler) GetTrendingJobs() gin.HandlerFunc {
	return func(c *gin.Context) {
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		jobs, err := h.service.GetTrendingJobs(limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"trending_jobs": jobs})
	}
}

func (h *JobHandler) GetJobRecommendations() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		recommendations, err := h.service.GetJobRecommendations(userID.(string), limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"recommendations": recommendations})
	}
}

func (h *JobHandler) SaveJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			CandidateID string `json:"candidate_id"`
			JobID       string `json:"job_id"`
		}

		if c.Request.ContentLength > 0 {
			if err := c.BindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
				return
			}
		}
		if req.CandidateID == "" {
			req.CandidateID = c.Param("candidateId")
			if req.CandidateID == "" {
				req.CandidateID = c.Param("candidate_id")
			}
		}
		if req.JobID == "" {
			req.JobID = c.Param("jobId")
			if req.JobID == "" {
				req.JobID = c.Param("job_id")
			}
		}

		if req.CandidateID == "" || req.JobID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "candidate_id and job_id are required"})
			return
		}

		err := h.service.SaveJob(req.CandidateID, req.JobID)
		if err != nil {
			if isNotFoundError(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Job saved"})
	}
}

func (h *JobHandler) UnsaveJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateID := c.Param("candidateId")
		if candidateID == "" {
			candidateID = c.Param("candidate_id")
		}
		jobID := c.Param("jobId")
		if jobID == "" {
			jobID = c.Param("job_id")
		}

		err := h.service.UnsaveJob(candidateID, jobID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Job unsaved"})
	}
}

func (h *JobHandler) GetSavedJobs() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateID := c.Param("candidateId")
		if candidateID == "" {
			candidateID = c.Param("candidate_id")
		}

		jobs, err := h.service.GetSavedJobs(candidateID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"saved_jobs": jobs})
	}
}
