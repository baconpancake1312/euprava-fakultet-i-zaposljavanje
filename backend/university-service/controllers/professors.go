package controllers

import (
	"net/http"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type createProfessorRequest struct {
	UserID string `json:"user_id"`
	repositories.Professor
}

func (ctrl *Controllers) CreateProfessor(c *gin.Context) {
	var req createProfessorRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	professor := &req.Professor
	if req.UserID != "" {
		objectID, err := primitive.ObjectIDFromHex(req.UserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id format"})
			return
		}
		professor.ID = objectID
	} else if professor.ID.IsZero() {
		professor.ID = primitive.NewObjectID()
	}

	err := ctrl.Repo.CreateProfessor(professor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, professor)
}

func (ctrl *Controllers) GetProfessorByID(c *gin.Context) {
	id := c.Param("id")

	professor, err := ctrl.Repo.GetProfessorByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Professor not found"})
		return
	}

	c.JSON(http.StatusOK, professor)
}

func (ctrl *Controllers) UpdateProfessor(c *gin.Context) {
	id := c.Param("id")
	var professor repositories.Professor
	if err := c.BindJSON(&professor); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	professor.ID = objectID

	err = ctrl.Repo.UpdateProfessor(&professor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, professor)
}

func (ctrl *Controllers) DeleteProfessor(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteProfessor(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}
