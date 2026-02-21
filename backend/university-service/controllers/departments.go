package controllers

import (
	"net/http"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (ctrl *Controllers) CreateDepartment(c *gin.Context) {
	var department repositories.Department
	if err := c.BindJSON(&department); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	departments, err := ctrl.Repo.GetAllDepartments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, departmentElement := range departments {
		for _, oldProgram := range departmentElement.MajorIDs {
			for _, newProgram := range department.MajorIDs {
				if oldProgram == newProgram {
					major, err := ctrl.Repo.GetMajorByID(newProgram)
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
					if major != nil {
						c.JSON(http.StatusBadRequest, gin.H{
							"error": "Department " + departmentElement.Name + " already has this major: " + major.Name,
						})
						return
					}
				}
			}
		}
	}
	err = ctrl.Repo.CreateDepartment(&department)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, majorID := range department.MajorIDs {
		err = ctrl.AddDepartmentToMajor(department.ID, majorID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, department)
}

func (ctrl *Controllers) GetDepartmentByID(c *gin.Context) {
	id := c.Param("id")

	department, err := ctrl.Repo.GetDepartmentByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Department not found"})
		return
	}

	c.JSON(http.StatusOK, department)
}

func (ctrl *Controllers) UpdateDepartment(c *gin.Context) {
	id := c.Param("id")
	var department repositories.Department
	if err := c.BindJSON(&department); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	department.ID = objectID

	err = ctrl.Repo.UpdateDepartment(&department)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, department)
}

func (ctrl *Controllers) DeleteDepartment(c *gin.Context) {
	id := c.Param("id")
	department, err := ctrl.Repo.GetDepartmentByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, majorID := range department.MajorIDs {
		err = ctrl.RemoveDepartmentFromMajor(majorID, department.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	err = ctrl.Repo.DeleteDepartment(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}
