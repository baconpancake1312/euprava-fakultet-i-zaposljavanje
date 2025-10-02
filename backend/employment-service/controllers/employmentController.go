package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"employment-service/data"
	"employment-service/models"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type EmploymentController struct {
	logger *log.Logger
	repo   *data.EmploymentRepo
}

var validate = validator.New()

func NewEmploymentController(l *log.Logger, r *data.EmploymentRepo) *EmploymentController {
	return &EmploymentController{l, r}
}

func (ec EmploymentController) GetStudentByID(studentId string) (*models.Student, error) {
	uniUrl := fmt.Sprintf("http://auth-service:8080/users/%v", studentId)
	uniResponse, err := http.Get(uniUrl)
	if err != nil {
		ec.logger.Printf("Error making GET request for user: %v", err)
		return nil, fmt.Errorf("error making GET request for user: %v", err)
	}
	defer uniResponse.Body.Close()

	if uniResponse.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(uniResponse.Body)
		ec.logger.Println("error: ", string(body))
		return nil, fmt.Errorf("uni service returned error: %s", string(body))
	}
	var returnedStudent *models.Student
	if err := json.NewDecoder(uniResponse.Body).Decode(&returnedStudent); err != nil {
		ec.logger.Printf("error parsing auth response body: %v\n", err)
		return nil, fmt.Errorf("error parsing uni response body")
	}
	return returnedStudent, nil
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

		application.Id = applicationId
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
		jobId := c.Param("jobId")

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

		listingId, err := ec.repo.CreateJobListing(&listing)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		listing.Id = listingId
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


// Employer CRUD operations

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

// Candidate CRUD operations

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

// User Controller Functions
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


// Document Controller Functions
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

// UnemployedRecord Controller Functions
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

func (ec *EmploymentController) SearchJobs() gin.HandlerFunc {
	return func(c *gin.Context) {
		var searchReq models.JobSearchRequest

		if err := c.ShouldBindQuery(&searchReq); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query parameters"})
			return
		}

		if c.Request.Method == "POST" {
			if err := c.BindJSON(&searchReq); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
				return
			}
		}

		if searchReq.Page <= 0 {
			searchReq.Page = 1
		}
		if searchReq.Limit <= 0 {
			searchReq.Limit = 20
		}
		if searchReq.Limit > 100 {
			searchReq.Limit = 100
		}

		response, err := ec.repo.SearchJobs(&searchReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, response)
	}
}

func (ec *EmploymentController) GetSearchFilters() gin.HandlerFunc {
	return func(c *gin.Context) {
		filters, err := ec.repo.GetSearchFilters()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, filters)
	}
}

func (ec *EmploymentController) GetJobSearchStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		stats, err := ec.repo.GetJobSearchStats()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, stats)
	}
}

func (ec *EmploymentController) GetSimilarJobs() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobId := c.Param("id")
		limitStr := c.DefaultQuery("limit", "5")
		
		limit := 5
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 20 {
			limit = parsedLimit
		}

		jobs, err := ec.repo.GetSimilarJobs(jobId, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"similar_jobs": jobs})
	}
}

func (ec *EmploymentController) GetJobRecommendations() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		limitStr := c.DefaultQuery("limit", "10")
		limit := 10
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 50 {
			limit = parsedLimit
		}

		searchReq := &models.JobSearchRequest{
			Page:  1,
			Limit: limit,
			SortBy: "created_at",
			SortOrder: "desc",
		}

		response, err := ec.repo.SearchJobs(searchReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"recommendations": response.Jobs,
			"total": response.Total,
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
			"total": len(jobs),
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
			"jobs": jobs,
			"total": total,
			"page": page,
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
			"jobs": jobs,
			"total": total,
			"page": page,
			"limit": limit,
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
			"page": page,
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
			"total": total,
			"page": page,
			"limit": limit,
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
			"total": total,
			"page": page,
			"limit": limit,
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
			"total": total,
			"page": page,
			"limit": limit,
			"status": status,
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
			"total": len(jobs),
		})
	}
}