package controllers

import (
	"net/http"
	"time"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type createAdministratorRequest struct {
	UserID string `json:"user_id"`
	repositories.Administrator
}

func (ctrl *Controllers) CreateAdministrator(c *gin.Context) {
	var req createAdministratorRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	administrator := &req.Administrator
	if req.UserID != "" {
		objectID, err := primitive.ObjectIDFromHex(req.UserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id format"})
			return
		}
		administrator.ID = objectID
	} else if administrator.ID.IsZero() {
		administrator.ID = primitive.NewObjectID()
	}

	err := ctrl.Repo.CreateAdministrator(administrator)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, administrator)
}

func (ctrl *Controllers) GetAdministratorByID(c *gin.Context) {
	id := c.Param("id")

	administrator, err := ctrl.Repo.GetAdministratorByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Administrator not found"})
		return
	}

	c.JSON(http.StatusOK, administrator)
}

func (ctrl *Controllers) UpdateAdministrator(c *gin.Context) {
	id := c.Param("id")
	var administrator repositories.Administrator
	if err := c.BindJSON(&administrator); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	administrator.ID = objectID

	err = ctrl.Repo.UpdateAdministrator(&administrator)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, administrator)
}

func (ctrl *Controllers) DeleteAdministrator(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteAdministrator(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (ctrl *Controllers) GetGraduationRequests(c *gin.Context) {
	requests, err := ctrl.Repo.GetGraduationRequests()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, requests)
}

func (ctrl *Controllers) GetGraduationRequestByStudentID(c *gin.Context) {
	studentID := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(studentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	request, err := ctrl.Repo.GetGraduationRequestByStudentID(objectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, request)
}

func (ctrl *Controllers) GetGraduationRequestsByStudentID(c *gin.Context) {
	studentID := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(studentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	requests, err := ctrl.Repo.GetGraduationRequestsByStudentID(objectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if requests == nil {
		requests = []repositories.GraduationRequest{}
	}
	c.JSON(http.StatusOK, requests)
}
func (ctrl *Controllers) UpdateGraduationRequest(c *gin.Context) {
	id := c.Param("id")
	var request repositories.GraduationRequest
	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	request.ID = objectID
	err = ctrl.Repo.UpdateGraduationRequest(&request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if request.Status == "Approved" {
		_, _ = ctrl.CreateNotificationByRecipient(repositories.Notification{
			RecipientID:    request.StudentID,
			RecipientType:  "id",
			RecipientValue: request.StudentID.Hex(),
			Title:          "Graduation request",
			Content:        "Congratulations! Your graduation request has been approved",
		})

		err = ctrl.Repo.GraduateStudent(request.StudentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	} else {
		_, _ = ctrl.CreateNotificationByRecipient(repositories.Notification{
			RecipientID:    request.StudentID,
			RecipientType:  "id",
			RecipientValue: request.StudentID.Hex(),
			Title:          "Graduation request",
			Content:        "Your graduation request has been updated to " + string(request.Status) + " with the following comments: " + request.Comments,
			CreatedAt:      time.Now(),
		})
	}
	c.JSON(http.StatusOK, request)
}

func (ctrl *Controllers) DeleteGraduationRequest(c *gin.Context) {
	id := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	err = ctrl.Repo.DeleteGraduationRequest(objectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
