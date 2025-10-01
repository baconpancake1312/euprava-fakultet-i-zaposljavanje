package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

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