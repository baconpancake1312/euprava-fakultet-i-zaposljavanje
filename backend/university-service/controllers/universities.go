package controllers

import (
	"net/http"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (ctrl *Controllers) CreateUniversity(c *gin.Context) {
	var university repositories.University
	if err := c.BindJSON(&university); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := ctrl.Repo.CreateUniversity(&university)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, university)
}

func (ctrl *Controllers) GetUniversityByID(c *gin.Context) {
	id := c.Param("id")

	university, err := ctrl.Repo.GetUniversityByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "University not found"})
		return
	}

	c.JSON(http.StatusOK, university)
}

func (ctrl *Controllers) UpdateUniversity(c *gin.Context) {
	id := c.Param("id")
	var university repositories.University
	if err := c.BindJSON(&university); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	university.ID = objectID

	err = ctrl.Repo.UpdateUniversity(&university)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, university)
}

func (ctrl *Controllers) DeleteUniversity(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteUniversity(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}
