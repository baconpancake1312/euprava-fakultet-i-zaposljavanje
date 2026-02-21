package controllers

import (
	"fmt"
	"net/http"
	"time"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CreateNotificationByRecipient creates notifications for recipients based on the notification request.
// Returns the count of created notifications and an error (ValidationError for validation issues, regular error for server errors).
func (ctrl *Controllers) CreateNotificationByRecipient(req repositories.Notification) (int, error) {
	// Validate recipient type
	validTypes := map[string]bool{
		"id":                    true,
		"role":                  true,
		"department":            true,
		"department_professors": true,
		"department_students":   true,
		"major":                 true,
		"major_students":        true,
		"major_professors":      true,
	}
	if !validTypes[req.RecipientType] {
		return 0, &ValidationError{Message: "Invalid recipient_type. Must be: id, role, department, or major"}
	}

	var recipientIDs []primitive.ObjectID

	switch req.RecipientType {
	case "id":
		// Single user by ID
		userID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid user ID format"}
		}
		recipientIDs = []primitive.ObjectID{userID}

	case "role":
		// All users with a specific role
		validRoles := map[string]bool{
			"STUDENT":           true,
			"PROFESSOR":         true,
			"ASSISTANT":         true,
			"ADMINISTRATOR":     true,
			"STUDENTSKA_SLUZBA": true,
		}
		if !validRoles[req.RecipientValue] {
			return 0, &ValidationError{Message: "Invalid role. Must be: STUDENT, PROFESSOR, ASSISTANT, ADMINISTRATOR, or STUDENTSKA_SLUZBA"}
		}

		switch req.RecipientValue {
		case "STUDENT":
			students, err := ctrl.Repo.GetAllStudents()
			if err != nil {
				return 0, fmt.Errorf("failed to get students: %w", err)
			}
			for _, student := range students {
				recipientIDs = append(recipientIDs, student.ID)
			}
		case "PROFESSOR":
			professors, err := ctrl.Repo.GetAllProfessors()
			if err != nil {
				return 0, fmt.Errorf("failed to get professors: %w", err)
			}
			for _, professor := range professors {
				recipientIDs = append(recipientIDs, professor.ID)
			}
		case "ASSISTANT":
			assistants, err := ctrl.Repo.GetAllAssistants()
			if err != nil {
				return 0, fmt.Errorf("failed to get assistants: %w", err)
			}
			for _, assistant := range assistants {
				recipientIDs = append(recipientIDs, assistant.ID)
			}
		case "ADMINISTRATOR", "STUDENTSKA_SLUZBA":
			administrators, err := ctrl.Repo.GetAllAdministrators()
			if err != nil {
				return 0, fmt.Errorf("failed to get administrators: %w", err)
			}
			for _, admin := range administrators {
				recipientIDs = append(recipientIDs, admin.ID)
			}
		}

	case "department":
		// All users in a department
		departmentID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid department ID format"}
		}
		recipientIDs, err = ctrl.Repo.GetUsersByDepartmentID(departmentID)
		ctrl.logger.Println("Sending notification to department", departmentID.Hex())
		ctrl.logger.Println("recipientIDs", recipientIDs)
		if err != nil {
			return 0, fmt.Errorf("failed to get users by department: %w", err)
		}

	case "major":
		// All students in a major
		majorID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid major ID format"}
		}
		students, err := ctrl.Repo.GetStudentsByMajorID(majorID)
		if err != nil {
			return 0, fmt.Errorf("failed to get students by major: %w", err)
		}
		for _, student := range students {
			recipientIDs = append(recipientIDs, student.ID)
		}
		ctrl.logger.Println("Sending notification to major", majorID.Hex())
		ctrl.logger.Println("recipientIDs", recipientIDs)
	case "major_students":
		majorID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid major ID format"}
		}
		students, err := ctrl.Repo.GetStudentsByMajorID(majorID)
		if err != nil {
			return 0, fmt.Errorf("failed to get students by major: %w", err)
		}
		for _, student := range students {
			recipientIDs = append(recipientIDs, student.ID)
		}
	case "major_professors":
		majorID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid major ID format"}
		}
		professors, err := ctrl.Repo.GetProfessorsByMajorId(majorID)
		if err != nil {
			return 0, fmt.Errorf("failed to get professors by major: %w", err)
		}
		for _, professor := range professors {
			recipientIDs = append(recipientIDs, professor.ID)
		}
	case "department_professors":
		departmentID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid department ID format"}
		}
		department, err := ctrl.Repo.GetDepartmentByID(departmentID.Hex())
		if err != nil {
			return 0, fmt.Errorf("failed to get department: %w", err)
		}
		for _, user := range department.StaffIDs {
			recipientIDs = append(recipientIDs, user)
		}

	case "department_students":
		departmentID, err := primitive.ObjectIDFromHex(req.RecipientValue)
		if err != nil {
			return 0, &ValidationError{Message: "Invalid department ID format"}
		}
		department, err := ctrl.Repo.GetDepartmentByID(departmentID.Hex())
		if err != nil {
			return 0, fmt.Errorf("failed to get department: %w", err)
		}
		majorIds := department.MajorIDs
		for _, majorId := range majorIds {
			students, err := ctrl.Repo.GetStudentsByMajorID(majorId)
			if err != nil {
				return 0, fmt.Errorf("failed to get students by major: %w", err)
			}
			for _, student := range students {
				recipientIDs = append(recipientIDs, student.ID)
			}
		}
	}

	// Create one separate notification document per recipient (no sharing)
	createdCount := 0
	for _, recipientID := range recipientIDs {
		notification := repositories.Notification{
			RecipientID:    recipientID,
			RecipientType:  req.RecipientType,
			RecipientValue: req.RecipientValue,
			Title:          req.Title,
			Content:        req.Content,
			CreatedAt:      time.Now(),
			Seen:           false,
		}
		if err := ctrl.Repo.CreateNotification(&notification); err != nil {
			return createdCount, fmt.Errorf("failed to create notification for user %s: %w", recipientID.Hex(), err)
		}
		createdCount++
	}

	return createdCount, nil
}

func (ctrl *Controllers) CreateNotificationByRecipientHandler(c *gin.Context) {
	var req repositories.Notification
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	createdCount, err := ctrl.CreateNotificationByRecipient(req)
	if err != nil {
		// Check if it's a validation error
		if validationErr, ok := err.(*ValidationError); ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		// Otherwise it's an internal server error
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": fmt.Sprintf("Successfully created %d notifications", createdCount),
		"count":   createdCount,
	})
}
func (ctrl *Controllers) CreateNotificationByHealthcareHandler(c *gin.Context) {
	var appointmentData map[string]interface{}

	if err := c.ShouldBindJSON(&appointmentData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	description := "Systematic check appointment details: "
	if date, ok := appointmentData["date"].(string); ok {
		description += "Date: " + date + ", "
	}
	var facultyName, fieldOfStudy string
	if facultyNameVal, ok := appointmentData["faculty_name"].(string); ok {
		facultyName = facultyNameVal
		description += "Faculty: " + facultyName + ", "
	}
	if fieldOfStudyVal, ok := appointmentData["field_of_study"].(string); ok {
		fieldOfStudy = fieldOfStudyVal
		description += "Field of Study: " + fieldOfStudy + ", "
	}
	if descriptionText, ok := appointmentData["description"].(string); ok {
		description += "Description: " + descriptionText
	}

	existingNotification, err := ctrl.Repo.GetNotificationByDescription(facultyName, fieldOfStudy)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	if existingNotification != nil {
		existingNotification.Content = description
		if err := ctrl.Repo.UpdateNotification(existingNotification); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusOK)
		return
	} else {
		notification := repositories.Notification{
			Title:     "New Appointment for Systematic Check Notification",
			Content:   description,
			CreatedAt: time.Now(),
		}

		if err := ctrl.Repo.CreateNotification(&notification); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

	}

	c.Status(http.StatusOK)
}

func (ctrl *Controllers) UpdateNotificationHandler(c *gin.Context) {
	notificationID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}
	notification, err := ctrl.Repo.GetNotificationByID(notificationID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}
	var req repositories.Notification
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	notification.Title = req.Title
	notification.Content = req.Content
	notification.Seen = req.Seen
	err = ctrl.Repo.UpdateNotification(notification)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusOK)
}
func (ctrl *Controllers) UpdateNotificationSeen(c *gin.Context) {
	notificationID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}
	notification, err := ctrl.Repo.GetNotificationByID(notificationID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}
	notification.Seen = true
	err = ctrl.Repo.UpdateNotification(notification)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusOK)
}
func (ctrl *Controllers) GetNotificationByIDHandler(c *gin.Context) {
	notificationID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}

	notification, err := ctrl.Repo.GetNotificationByID(notificationID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	c.JSON(http.StatusOK, notification)
}
func (ctrl *Controllers) GetNotificationByUserIDHandler(c *gin.Context) {
	userID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	notifications, err := ctrl.Repo.GetNotificationsByUserID(userID)
	if err != nil {
		// Return empty array instead of error if no notifications found
		c.JSON(http.StatusOK, []repositories.Notification{})
		return
	}

	// Return empty array if nil
	if notifications == nil {
		notifications = []repositories.Notification{}
	}

	c.JSON(http.StatusOK, notifications)
}

func (ctrl *Controllers) GetAllNotificationsHandler(c *gin.Context) {
	notifications, err := ctrl.Repo.GetAllNotifications()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, notifications)
}

func (ctrl *Controllers) DeleteNotificationHandler(c *gin.Context) {
	notificationID := c.Param("id")

	err := ctrl.Repo.DeleteNotification(notificationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusOK)
}
