package controllers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"employment-service/data"
	"employment-service/models"
	helper "employment-service/helpers"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)
}

func (ec *EmploymentController) CreateApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		var application models.Application

		if err := c.BindJSON(&application); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		applicationId, err := ec.repo.CreateApplication(&application)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		application.ID = applicationId

		go func() {

			jobListing, err := ec.repo.GetJobListing(application.ListingId.Hex())
			if err == nil && jobListing != nil {

				employerID := jobListing.PosterId.Hex()
				if err := helper.CreateNotification(
					employerID,
					"New Job Application",
					fmt.Sprintf("You have received a new application for the position: %s", jobListing.Position),
					ec.logger,
				); err != nil {
					ec.logger.Printf("Failed to send notification to employer %s: %v", employerID, err)
				}
			}

			candidateID := application.ApplicantId.Hex()
			if err := helper.CreateNotification(
				candidateID,
				"Application Submitted",
				"Your job application has been successfully submitted. The employer will review it and get back to you.",
				ec.logger,
			); err != nil {
				ec.logger.Printf("Failed to send notification to candidate %s: %v", candidateID, err)
			}
		}()

		c.JSON(http.StatusOK, gin.H{"message": "Application created successfully", "application": application})
	}
}

func (ec *EmploymentController) GetApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		applicationId := c.Param("id")

		application, err := ec.repo.GetApplication(applicationId)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, application)
	}
}

func (ec *EmploymentController) GetAllApplications() gin.HandlerFunc {
	return func(c *gin.Context) {
		applications, err := ec.repo.GetAllApplications()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, applications)
	}
}

func (ec *EmploymentController) UpdateApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		applicationId := c.Param("id")

		var application models.Application
		if err := c.BindJSON(&application); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		err := ec.repo.UpdateApplication(applicationId, &application)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Application updated successfully"})
	}
}

func (ec *EmploymentController) DeleteApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		applicationId := c.Param("id")

		err := ec.repo.DeleteApplication(applicationId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Application deleted successfully"})
	}
}

func (ec *EmploymentController) GetApplicationsForJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobId := c.Param("id")

		applications, err := ec.repo.GetApplicationsForJob(ec.repo.GetClient(), jobId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, applications)
	}
}

func (ec *EmploymentController) CreateJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		var listing models.JobListing

		if err := c.BindJSON(&listing); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		if !listing.PosterId.IsZero() {
			fmt.Printf("CreateJobListing: Looking up employer with ID: %s\n", listing.PosterId.Hex())
			employer, err := ec.repo.GetEmployer(listing.PosterId.Hex())
			if err != nil {
				fmt.Printf("CreateJobListing: Error getting employer: %v\n", err)
			} else if employer != nil {
				fmt.Printf("CreateJobListing: Found employer: %+v\n", employer)

				if employer.FirmName != "" {
					listing.PosterName = employer.FirmName
					fmt.Printf("CreateJobListing: Set poster name to firm name: %s\n", employer.FirmName)
				} else if employer.FirstName != nil && employer.LastName != nil {
					listing.PosterName = *employer.FirstName + " " + *employer.LastName
					fmt.Printf("CreateJobListing: Set poster name to full name: %s\n", listing.PosterName)
				}
			} else {
				fmt.Printf("CreateJobListing: Employer not found\n")
			}
		} else {
			fmt.Printf("CreateJobListing: PosterId is zero\n")
		}

		if listing.ApprovalStatus == "" {
			listing.ApprovalStatus = "pending"
		}
		if listing.CreatedAt.IsZero() {
			listing.CreatedAt = time.Now()
		}
		if listing.ExpireAt.IsZero() {

			listing.ExpireAt = time.Now().AddDate(0, 1, 0)
		}

		listingId, err := ec.repo.CreateJobListing(&listing)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		listing.ID = listingId
		c.JSON(http.StatusOK, gin.H{"message": "Job listing created successfully", "listing": listing})
	}
}

func (ec *EmploymentController) GetJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		listingId := c.Param("id")

		listing, err := ec.repo.GetJobListing(listingId)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, listing)
	}
}

func (ec *EmploymentController) GetAllJobListings() gin.HandlerFunc {
	return func(c *gin.Context) {
		listings, err := ec.repo.GetAllJobListings()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, listings)
	}
}

func (ec *EmploymentController) UpdateJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		listingId := c.Param("id")

		var listing models.JobListing
		if err := c.BindJSON(&listing); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		err := ec.repo.UpdateJobListing(listingId, &listing)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Job listing updated successfully"})
	}
}

func (ec *EmploymentController) DeleteJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		listingId := c.Param("id")

		err := ec.repo.DeleteJobListing(listingId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Job listing deleted successfully"})
	}
}


func (ec *EmploymentController) CreateEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		var employer models.Employer

		if err := c.BindJSON(&employer); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		employerId, err := ec.repo.CreateEmployer(&employer)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		employer.ID = employerId
		c.JSON(http.StatusOK, gin.H{"message": "Employer created successfully", "employer": employer})
	}
}

func (ec *EmploymentController) GetEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")

		employer, err := ec.repo.GetEmployer(employerId)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, employer)
	}
}

func (ec *EmploymentController) GetEmployerByUserID() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("user_id")

		employer, err := ec.repo.GetEmployerByUserID(userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Employer not found"})
			return
		}

		c.JSON(http.StatusOK, employer)
	}
}

func (ec *EmploymentController) GetAllEmployers() gin.HandlerFunc {
	return func(c *gin.Context) {
		employers, err := ec.repo.GetAllEmployers()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, employers)
	}
}

func (ec *EmploymentController) UpdateEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")

		var employer models.Employer
		if err := c.BindJSON(&employer); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		err := ec.repo.UpdateEmployer(employerId, &employer)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Employer updated successfully"})
	}
}

func (ec *EmploymentController) DeleteEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")

		err := ec.repo.DeleteEmployer(employerId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Employer deleted successfully"})
	}
}


func (ec *EmploymentController) CreateCandidate() gin.HandlerFunc {
	return func(c *gin.Context) {
		var candidate models.Candidate

		if err := c.BindJSON(&candidate); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		candidateId, err := ec.repo.CreateCandidate(&candidate)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		candidate.ID = candidateId
		c.JSON(http.StatusOK, gin.H{"message": "Candidate created successfully", "candidate": candidate})
	}
}

func (ec *EmploymentController) GetCandidate() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("id")

		candidate, err := ec.repo.GetCandidate(candidateId)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, candidate)
	}
}

func (ec *EmploymentController) GetCandidateByUserID() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("user_id")

		candidate, err := ec.repo.GetCandidateByUserID(userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Candidate not found"})
			return
		}

		c.JSON(http.StatusOK, candidate)
	}
}

func (ec *EmploymentController) GetAllCandidates() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidates, err := ec.repo.GetAllCandidates()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, candidates)
	}
}

func (ec *EmploymentController) UpdateCandidate() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("id")

		var candidate models.Candidate
		if err := c.BindJSON(&candidate); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		err := ec.repo.UpdateCandidate(candidateId, &candidate)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Candidate updated successfully"})
	}
}

func (ec *EmploymentController) DeleteCandidate() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("id")

		err := ec.repo.DeleteCandidate(candidateId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Candidate deleted successfully"})
	}
}

func (ec *EmploymentController) CreateUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		var user models.User

		if err := c.BindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userID, err := ec.repo.CreateUser(&user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"id": userID, "message": "User created successfully"})
	}
}

func (ec *EmploymentController) GetUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")

		user, err := ec.repo.GetUser(userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, user)
	}
}

func (ec *EmploymentController) GetAllUsers() gin.HandlerFunc {
	return func(c *gin.Context) {
		users, err := ec.repo.GetAllUsers()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, users)
	}
}

func (ec *EmploymentController) UpdateUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")
		var user models.User

		if err := c.BindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err := ec.repo.UpdateUser(userID, &user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "User updated successfully"})
	}
}

func (ec *EmploymentController) DeleteUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")

		err := ec.repo.DeleteUser(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
	}
}

func (ec *EmploymentController) CreateDocument() gin.HandlerFunc {
	return func(c *gin.Context) {
		var document models.Document

		if err := c.BindJSON(&document); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		documentID, err := ec.repo.CreateDocument(&document)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"id": documentID, "message": "Document created successfully"})
	}
}

func (ec *EmploymentController) GetDocument() gin.HandlerFunc {
	return func(c *gin.Context) {
		documentID := c.Param("id")

		document, err := ec.repo.GetDocument(documentID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, document)
	}
}

func (ec *EmploymentController) GetAllDocuments() gin.HandlerFunc {
	return func(c *gin.Context) {
		documents, err := ec.repo.GetAllDocuments()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, documents)
	}
}

func (ec *EmploymentController) UpdateDocument() gin.HandlerFunc {
	return func(c *gin.Context) {
		documentID := c.Param("id")
		var document models.Document

		if err := c.BindJSON(&document); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err := ec.repo.UpdateDocument(documentID, &document)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Document updated successfully"})
	}
}

func (ec *EmploymentController) DeleteDocument() gin.HandlerFunc {
	return func(c *gin.Context) {
		documentID := c.Param("id")

		err := ec.repo.DeleteDocument(documentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Document deleted successfully"})
	}
}

func (ec *EmploymentController) CreateUnemployedRecord() gin.HandlerFunc {
	return func(c *gin.Context) {
		var record models.UnemployedRecord

		if err := c.BindJSON(&record); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		recordID, err := ec.repo.CreateUnemployedRecord(&record)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"id": recordID, "message": "Unemployed record created successfully"})
	}
}

func (ec *EmploymentController) GetUnemployedRecord() gin.HandlerFunc {
	return func(c *gin.Context) {
		recordID := c.Param("id")

		record, err := ec.repo.GetUnemployedRecord(recordID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, record)
	}
}

func (ec *EmploymentController) GetAllUnemployedRecords() gin.HandlerFunc {
	return func(c *gin.Context) {
		records, err := ec.repo.GetAllUnemployedRecords()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, records)
	}
}

func (ec *EmploymentController) UpdateUnemployedRecord() gin.HandlerFunc {
	return func(c *gin.Context) {
		recordID := c.Param("id")
		var record models.UnemployedRecord

		if err := c.BindJSON(&record); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err := ec.repo.UpdateUnemployedRecord(recordID, &record)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Unemployed record updated successfully"})
	}
}

func (ec *EmploymentController) DeleteUnemployedRecord() gin.HandlerFunc {
	return func(c *gin.Context) {
		recordID := c.Param("id")

		err := ec.repo.DeleteUnemployedRecord(recordID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Unemployed record deleted successfully"})
	}
}

func (ec *EmploymentController) GetSimilarJobs() gin.HandlerFunc {
	return func(c *gin.Context) {
		limitStr := c.DefaultQuery("limit", "5")

		limit := 5
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 20 {
			limit = parsedLimit
		}

		jobs, err := ec.repo.GetActiveJobs(limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"similar_jobs": jobs})
	}
}

func (ec *EmploymentController) GetJobRecommendations() gin.HandlerFunc {
	return func(c *gin.Context) {
		userId, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		limitStr := c.DefaultQuery("limit", "10")
		limit := 10
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 50 {
			limit = parsedLimit
		}

		candidate, err := ec.repo.GetCandidateByUserID(userId.(string))
		if err == nil && candidate != nil {

			recommendations, err := ec.repo.GetJobRecommendationsForCandidate(candidate.ID.Hex(), limit)
			if err == nil {
				c.JSON(http.StatusOK, gin.H{
					"recommendations": recommendations,
					"total":           len(recommendations),
				})
				return
			}
		}

		jobs, err := ec.repo.GetActiveJobs(limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"recommendations": jobs,
			"total":           len(jobs),
		})
	}
}

func (ec *EmploymentController) GetTrendingJobs() gin.HandlerFunc {
	return func(c *gin.Context) {
		limitStr := c.DefaultQuery("limit", "10")
		limit := 10
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 50 {
			limit = parsedLimit
		}

		jobs, err := ec.repo.GetRecentJobs(limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"trending_jobs": jobs,
			"total":         len(jobs),
		})
	}
}

func (ec *EmploymentController) SearchJobsByText() gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("q")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
			return
		}

		pageStr := c.DefaultQuery("page", "1")
		limitStr := c.DefaultQuery("limit", "20")

		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(limitStr)

		jobs, total, err := ec.repo.SearchJobsByText(query, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"jobs":  jobs,
			"total": total,
			"page":  page,
			"limit": limit,
		})
	}
}

func (ec *EmploymentController) SearchJobsByInternship() gin.HandlerFunc {
	return func(c *gin.Context) {
		internshipStr := c.Query("internship")
		if internshipStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'internship' is required (true/false)"})
			return
		}

		isInternship := internshipStr == "true"

		pageStr := c.DefaultQuery("page", "1")
		limitStr := c.DefaultQuery("limit", "20")

		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(limitStr)

		jobs, total, err := ec.repo.SearchJobsByInternship(isInternship, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"jobs":          jobs,
			"total":         total,
			"page":          page,
			"limit":         limit,
			"is_internship": isInternship,
		})
	}
}

func (ec *EmploymentController) SearchUsersByText() gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("q")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
			return
		}

		pageStr := c.DefaultQuery("page", "1")
		limitStr := c.DefaultQuery("limit", "20")

		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(limitStr)

		users, total, err := ec.repo.SearchUsersByText(query, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"users": users,
			"total": total,
			"page":  page,
			"limit": limit,
		})
	}
}

func (ec *EmploymentController) SearchEmployersByText() gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("q")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
			return
		}

		pageStr := c.DefaultQuery("page", "1")
		limitStr := c.DefaultQuery("limit", "20")

		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(limitStr)

		employers, total, err := ec.repo.SearchEmployersByText(query, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"employers": employers,
			"total":     total,
			"page":      page,
			"limit":     limit,
		})
	}
}

func (ec *EmploymentController) SearchCandidatesByText() gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("q")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
			return
		}

		pageStr := c.DefaultQuery("page", "1")
		limitStr := c.DefaultQuery("limit", "20")

		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(limitStr)

		candidates, total, err := ec.repo.SearchCandidatesByText(query, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"candidates": candidates,
			"total":      total,
			"page":       page,
			"limit":      limit,
		})
	}
}

func (ec *EmploymentController) SearchApplicationsByStatus() gin.HandlerFunc {
	return func(c *gin.Context) {
		status := c.Query("status")
		if status == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'status' is required"})
			return
		}

		pageStr := c.DefaultQuery("page", "1")
		limitStr := c.DefaultQuery("limit", "20")

		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(limitStr)

		applications, total, err := ec.repo.SearchApplicationsByStatus(status, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"applications": applications,
			"total":        total,
			"page":         page,
			"limit":        limit,
			"status":       status,
		})
	}
}

func (ec *EmploymentController) GetActiveJobs() gin.HandlerFunc {
	return func(c *gin.Context) {
		limitStr := c.DefaultQuery("limit", "20")
		limit, _ := strconv.Atoi(limitStr)

		jobs, err := ec.repo.GetActiveJobs(limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"active_jobs": jobs,
			"total":       len(jobs),
		})
	}
}

func (ec *EmploymentController) ApproveEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")
		adminId, exists := c.Get("user_id")

		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
			return
		}

		err := ec.repo.ApproveEmployer(employerId, adminId.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		employer, err := ec.repo.GetEmployer(employerId)
		if err == nil && employer != nil {

			userID := employer.User.ID.Hex()
			go func() {
				if err := helper.CreateNotification(
					userID,
					"Employer Profile Approved",
					"Your employer profile has been approved by an administrator. You can now post job listings and access all employer features.",
					ec.logger,
				); err != nil {
					ec.logger.Printf("Failed to send approval notification to employer %s: %v", userID, err)
				}
			}()
		}

		c.JSON(http.StatusOK, gin.H{"message": "Employer approved successfully"})
	}
}

func (ec *EmploymentController) GetCompanyProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")

		company, err := ec.repo.GetCompanyByEmployerId(employerId)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, company)
	}
}

func (ec *EmploymentController) UpdateCompanyProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		companyId := c.Param("id")

		var company models.Company
		if err := c.BindJSON(&company); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		err := ec.repo.UpdateCompany(companyId, &company)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Company profile updated successfully"})
	}
}

func (ec *EmploymentController) GetAllCompanies() gin.HandlerFunc {
	return func(c *gin.Context) {
		companies, err := ec.repo.GetAllCompanies()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, companies)
	}
}

func (ec *EmploymentController) GetCompanyById() gin.HandlerFunc {
	return func(c *gin.Context) {
		companyId := c.Param("id")

		company, err := ec.repo.GetCompanyById(companyId)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, company)
	}
}

func (ec *EmploymentController) GetApplicationsByCandidate() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("id")

		applications, err := ec.repo.GetApplicationsByCandidateId(candidateId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, applications)
	}
}

func (ec *EmploymentController) GetCandidateApplicationStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		candidateId := c.Param("id")
		applications, err := ec.repo.GetApplicationsByCandidateId(candidateId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		stats := map[string]interface{}{
			"total":              len(applications),
			"pending":            0,
			"accepted":          0,
			"rejected":          0,
			"recent_applications": 0,
		}

		sevenDaysAgo := time.Now().AddDate(0, 0, -7)
		for _, app := range applications {
			switch strings.ToLower(app.Status) {
			case "pending":
				stats["pending"] = stats["pending"].(int) + 1
			case "accepted":
				stats["accepted"] = stats["accepted"].(int) + 1
			case "rejected":
				stats["rejected"] = stats["rejected"].(int) + 1
			}

			if app.SubmittedAt.After(sevenDaysAgo) {
				stats["recent_applications"] = stats["recent_applications"].(int) + 1
			}
		}

		c.JSON(http.StatusOK, stats)
	}
}

func (ec *EmploymentController) GetApplicationsByEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")

		applications, err := ec.repo.GetApplicationsByEmployerId(employerId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, applications)
	}
}

func (ec *EmploymentController) AcceptApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		applicationId := c.Param("id")
		userId, exists := c.Get("user_id")
		userType, _ := c.Get("user_type")

		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		application, _ := ec.repo.GetApplication(applicationId)

		if userType == "ADMIN" {
			err := ec.repo.UpdateApplicationStatusByAdmin(applicationId, "accepted")
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		} else {
			err := ec.repo.UpdateApplicationStatus(applicationId, "accepted", userId.(string))
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}

		if application != nil {
			go func() {
				candidateID := application.ApplicantId.Hex()
				jobListing, err := ec.repo.GetJobListing(application.ListingId.Hex())
				jobTitle := "the position"
				if err == nil && jobListing != nil {
					jobTitle = jobListing.Position
				}
				if err := helper.CreateNotification(
					candidateID,
					"Application Accepted",
					fmt.Sprintf("Congratulations! Your application for %s has been accepted. The employer will contact you soon.", jobTitle),
					ec.logger,
				); err != nil {
					ec.logger.Printf("Failed to send acceptance notification to candidate %s: %v", candidateID, err)
				}
			}()
		}

		c.JSON(http.StatusOK, gin.H{"message": "Application accepted successfully"})
	}
}

func (ec *EmploymentController) RejectApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		applicationId := c.Param("id")
		userId, exists := c.Get("user_id")
		userType, _ := c.Get("user_type")

		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		application, _ := ec.repo.GetApplication(applicationId)

		if userType == "ADMIN" {
			err := ec.repo.UpdateApplicationStatusByAdmin(applicationId, "rejected")
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		} else {
			err := ec.repo.UpdateApplicationStatus(applicationId, "rejected", userId.(string))
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}

		if application != nil {
			go func() {
				candidateID := application.ApplicantId.Hex()
				jobListing, err := ec.repo.GetJobListing(application.ListingId.Hex())
				jobTitle := "the position"
				if err == nil && jobListing != nil {
					jobTitle = jobListing.Position
				}
				if err := helper.CreateNotification(
					candidateID,
					"Application Update",
					fmt.Sprintf("Your application for %s has been reviewed. Unfortunately, it was not selected at this time. Keep applying!", jobTitle),
					ec.logger,
				); err != nil {
					ec.logger.Printf("Failed to send rejection notification to candidate %s: %v", candidateID, err)
				}
			}()
		}

		c.JSON(http.StatusOK, gin.H{"message": "Application rejected successfully"})
	}
}

func (ec *EmploymentController) RejectEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")
		adminId, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
			return
		}

		err := ec.repo.RejectEmployer(employerId, adminId.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Employer rejected successfully"})
	}
}

func (ec *EmploymentController) GetPendingEmployers() gin.HandlerFunc {
	return func(c *gin.Context) {
		employers, err := ec.repo.GetPendingEmployers()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"pending_employers": employers,
			"total":             len(employers),
		})
	}
}

func (ec *EmploymentController) ApproveJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobId := c.Param("id")
		adminId, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
			return
		}

		jobListing, _ := ec.repo.GetJobListing(jobId)

		err := ec.repo.ApproveJobListing(jobId, adminId.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if jobListing != nil {
			go func() {
				employerID := jobListing.PosterId.Hex()
				if err := helper.CreateNotification(
					employerID,
					"Job Listing Approved",
					fmt.Sprintf("Your job listing for '%s' has been approved and is now visible to candidates.", jobListing.Position),
					ec.logger,
				); err != nil {
					ec.logger.Printf("Failed to send approval notification to employer %s: %v", employerID, err)
				}
			}()
		}

		c.JSON(http.StatusOK, gin.H{"message": "Job listing approved successfully"})
	}
}

func (ec *EmploymentController) RejectJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobId := c.Param("id")
		adminId, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
			return
		}

		jobListing, _ := ec.repo.GetJobListing(jobId)

		err := ec.repo.RejectJobListing(jobId, adminId.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if jobListing != nil {
			go func() {
				employerID := jobListing.PosterId.Hex()
				if err := helper.CreateNotification(
					employerID,
					"Job Listing Rejected",
					fmt.Sprintf("Your job listing for '%s' has been rejected. Please review the listing requirements and submit a new one if needed.", jobListing.Position),
					ec.logger,
				); err != nil {
					ec.logger.Printf("Failed to send rejection notification to employer %s: %v", employerID, err)
				}
			}()
		}

		c.JSON(http.StatusOK, gin.H{"message": "Job listing rejected successfully"})
	}
}

func (ec *EmploymentController) ClearTestData() gin.HandlerFunc {
	return func(c *gin.Context) {
		err := ec.repo.ClearTestData()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Test data cleared successfully"})
	}
}

func (ec *EmploymentController) GetPendingJobListings() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobs, err := ec.repo.GetPendingJobListings()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"pending_jobs": jobs,
			"total":        len(jobs),
		})
	}
}

func (ec *EmploymentController) SuspendEmployer() gin.HandlerFunc {
	return func(c *gin.Context) {
		employerId := c.Param("id")
		adminId, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
			return
		}

		err := ec.repo.SuspendEmployer(employerId, adminId.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Employer suspended successfully"})
	}
}

func (ec *EmploymentController) GetEmployerStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		stats, err := ec.repo.GetEmployerStats()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"employer_stats": stats,
		})
	}
}
func (ec *EmploymentController) GetInternships() gin.HandlerFunc {
	return func(c *gin.Context) {
		limitStr := c.DefaultQuery("limit", "20")
		limit, _ := strconv.Atoi(limitStr)

		internships, err := ec.repo.GetInternships(limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"internships": internships,
			"total":       len(internships),
		})
	}
}

func (ec *EmploymentController) GetInternshipsForStudent() gin.HandlerFunc {
	return func(c *gin.Context) {
		studentId := c.Param("studentId")
		if studentId == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Student ID is required"})
			return
		}

		pageStr := c.DefaultQuery("page", "1")
		limitStr := c.DefaultQuery("limit", "20")

		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(limitStr)

		internships, total, err := ec.repo.GetInternshipsForStudent(studentId, page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"internships": internships,
			"total":       total,
			"page":        page,
			"limit":       limit,
		})
	}
}
