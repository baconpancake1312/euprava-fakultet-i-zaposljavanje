package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (ec *EmploymentController) SaveJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("candidateId")
		if candidateId == "" {
			candidateId = c.Param("candidate_id")
		}

		var reqBody struct {
			CandidateId string `json:"candidate_id"`
			JobId       string `json:"job_id"`
		}
		if c.Request.ContentLength > 0 {
			if err := c.BindJSON(&reqBody); err == nil {
				if reqBody.CandidateId != "" {
					candidateId = reqBody.CandidateId
				}
			}
		}

		jobId := c.Param("jobId")
		if jobId == "" {
			jobId = c.Param("job_id")
		}
		if jobId == "" && reqBody.JobId != "" {
			jobId = reqBody.JobId
		}

		if candidateId == "" || jobId == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Candidate ID and Job ID are required"})
			return
		}

		candObjId, err := primitive.ObjectIDFromHex(candidateId)
		jobObjId, err2 := primitive.ObjectIDFromHex(jobId)
		if err != nil || err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid candidate or job ID"})
			return
		}
		err = ec.repo.SaveJob(candObjId, jobObjId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Job saved"})
	}
}

func (ec *EmploymentController) UnsaveJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("candidateId")
		if candidateId == "" {
			candidateId = c.Param("candidate_id")
		}
		jobId := c.Param("jobId")
		if jobId == "" {
			jobId = c.Param("job_id")
		}

		if candidateId == "" || jobId == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Candidate ID and Job ID are required"})
			return
		}

		candObjId, err := primitive.ObjectIDFromHex(candidateId)
		jobObjId, err2 := primitive.ObjectIDFromHex(jobId)
		if err != nil || err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid candidate or job ID"})
			return
		}
		err = ec.repo.UnsaveJob(candObjId, jobObjId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Job unsaved"})
	}
}

func (ec *EmploymentController) GetSavedJobs() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("candidateId")
		if candidateId == "" {
			candidateId = c.Param("candidate_id")
		}

		if candidateId == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Candidate ID is required"})
			return
		}

		candObjId, err := primitive.ObjectIDFromHex(candidateId)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid candidate ID"})
			return
		}
		jobs, err := ec.repo.GetSavedJobsWithDetails(candObjId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"saved_jobs": jobs})
	}
}
