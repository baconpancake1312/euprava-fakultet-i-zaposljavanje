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

		applicationId, err := ec.repo.InsertApplication(&application)
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

		listingId, err := ec.repo.InsertJobListing(&listing)
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

// Student Controller Functions
func (ec *EmploymentController) CreateStudent() gin.HandlerFunc {
	return func(c *gin.Context) {
		var student models.Student

		if err := c.BindJSON(&student); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		studentID, err := ec.repo.CreateStudent(&student)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"id": studentID, "message": "Student created successfully"})
	}
}

func (ec *EmploymentController) GetStudent() gin.HandlerFunc {
	return func(c *gin.Context) {
		studentID := c.Param("id")

		student, err := ec.repo.GetStudent(studentID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, student)
	}
}

func (ec *EmploymentController) GetAllStudents() gin.HandlerFunc {
	return func(c *gin.Context) {
		students, err := ec.repo.GetAllStudents()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, students)
	}
}

func (ec *EmploymentController) UpdateStudent() gin.HandlerFunc {
	return func(c *gin.Context) {
		studentID := c.Param("id")
		var student models.Student

		if err := c.BindJSON(&student); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err := ec.repo.UpdateStudent(studentID, &student)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Student updated successfully"})
	}
}

func (ec *EmploymentController) DeleteStudent() gin.HandlerFunc {
	return func(c *gin.Context) {
		studentID := c.Param("id")

		err := ec.repo.DeleteStudent(studentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Student deleted successfully"})
	}
}

// Notification Controller Functions
func (ec *EmploymentController) CreateNotification() gin.HandlerFunc {
	return func(c *gin.Context) {
		var notification models.Notification

		if err := c.BindJSON(&notification); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		notificationID, err := ec.repo.CreateNotification(&notification)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"id": notificationID, "message": "Notification created successfully"})
	}
}

func (ec *EmploymentController) GetNotification() gin.HandlerFunc {
	return func(c *gin.Context) {
		notificationID := c.Param("id")

		notification, err := ec.repo.GetNotification(notificationID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, notification)
	}
}

func (ec *EmploymentController) GetAllNotifications() gin.HandlerFunc {
	return func(c *gin.Context) {
		notifications, err := ec.repo.GetAllNotifications()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, notifications)
	}
}

func (ec *EmploymentController) UpdateNotification() gin.HandlerFunc {
	return func(c *gin.Context) {
		notificationID := c.Param("id")
		var notification models.Notification

		if err := c.BindJSON(&notification); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err := ec.repo.UpdateNotification(notificationID, &notification)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Notification updated successfully"})
	}
}

func (ec *EmploymentController) DeleteNotification() gin.HandlerFunc {
	return func(c *gin.Context) {
		notificationID := c.Param("id")

		err := ec.repo.DeleteNotification(notificationID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Notification deleted successfully"})
	}
}

// Benefit Controller Functions
func (ec *EmploymentController) CreateBenefit() gin.HandlerFunc {
	return func(c *gin.Context) {
		var benefit models.Benefit

		if err := c.BindJSON(&benefit); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		benefitID, err := ec.repo.CreateBenefit(&benefit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"id": benefitID, "message": "Benefit created successfully"})
	}
}

func (ec *EmploymentController) GetBenefit() gin.HandlerFunc {
	return func(c *gin.Context) {
		benefitID := c.Param("id")

		benefit, err := ec.repo.GetBenefit(benefitID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, benefit)
	}
}

func (ec *EmploymentController) GetAllBenefits() gin.HandlerFunc {
	return func(c *gin.Context) {
		benefits, err := ec.repo.GetAllBenefits()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, benefits)
	}
}

func (ec *EmploymentController) UpdateBenefit() gin.HandlerFunc {
	return func(c *gin.Context) {
		benefitID := c.Param("id")
		var benefit models.Benefit

		if err := c.BindJSON(&benefit); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err := ec.repo.UpdateBenefit(benefitID, &benefit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Benefit updated successfully"})
	}
}

func (ec *EmploymentController) DeleteBenefit() gin.HandlerFunc {
	return func(c *gin.Context) {
		benefitID := c.Param("id")

		err := ec.repo.DeleteBenefit(benefitID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Benefit deleted successfully"})
	}
}

// Request Controller Functions
func (ec *EmploymentController) CreateRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		var request models.Request

		if err := c.BindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		requestID, err := ec.repo.CreateRequest(&request)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"id": requestID, "message": "Request created successfully"})
	}
}

func (ec *EmploymentController) GetRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.Param("id")

		request, err := ec.repo.GetRequest(requestID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, request)
	}
}

func (ec *EmploymentController) GetAllRequests() gin.HandlerFunc {
	return func(c *gin.Context) {
		requests, err := ec.repo.GetAllRequests()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, requests)
	}
}

func (ec *EmploymentController) UpdateRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.Param("id")
		var request models.Request

		if err := c.BindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err := ec.repo.UpdateRequest(requestID, &request)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Request updated successfully"})
	}
}

func (ec *EmploymentController) DeleteRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.Param("id")

		err := ec.repo.DeleteRequest(requestID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Request deleted successfully"})
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