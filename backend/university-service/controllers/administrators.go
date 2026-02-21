package controllers

import (
	"net/http"
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
