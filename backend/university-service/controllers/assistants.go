package controllers

import (
	"net/http"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type createAssistantRequest struct {
	UserID string `json:"user_id"`
	repositories.Assistant
}

func (ctrl *Controllers) CreateAssistant(c *gin.Context) {
	var req createAssistantRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	assistant := &req.Assistant
	if req.UserID != "" {
		objectID, err := primitive.ObjectIDFromHex(req.UserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id format"})
			return
		}
		assistant.ID = objectID
	} else if assistant.ID.IsZero() {
		assistant.ID = primitive.NewObjectID()
	}

	err := ctrl.Repo.CreateAssistant(assistant)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, assistant)
}

func (ctrl *Controllers) GetAssistantByID(c *gin.Context) {
	id := c.Param("id")

	assistant, err := ctrl.Repo.GetAssistantByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assistant not found"})
		return
	}

	c.JSON(http.StatusOK, assistant)
}

func (ctrl *Controllers) UpdateAssistant(c *gin.Context) {
	id := c.Param("id")
	var assistant repositories.Assistant
	if err := c.BindJSON(&assistant); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	assistant.ID = objectID

	err = ctrl.Repo.UpdateAssistant(&assistant)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, assistant)
}

func (ctrl *Controllers) DeleteAssistant(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteAssistant(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}
