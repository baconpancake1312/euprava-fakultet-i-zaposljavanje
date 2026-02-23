package controllers

import (
	"net/http"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (ctrl *Controllers) CreateCourse(c *gin.Context) {
	var subject repositories.Subject
	if err := c.BindJSON(&subject); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if subject.Semester != 1 && subject.Semester != 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "semester must be 1 (first semester) or 2 (second semester)"})
		return
	}

	err := ctrl.Repo.CreateSubject(&subject)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, subject)
}

func (ctrl *Controllers) GetCourseByID(c *gin.Context) {
	id := c.Param("id")

	subject, err := ctrl.Repo.GetSubjectByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	c.JSON(http.StatusOK, subject)
}

func (ctrl *Controllers) UpdateSubject(c *gin.Context) {
	id := c.Param("id")
	var subject repositories.Subject
	if err := c.BindJSON(&subject); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if subject.Semester != 0 && subject.Semester != 1 && subject.Semester != 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "semester must be 1 (first semester) or 2 (second semester)"})
		return
	}
	oldSubject, err := ctrl.Repo.GetSubjectByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(oldSubject.ProfessorIDs) != len(subject.ProfessorIDs) {
		if len(oldSubject.ProfessorIDs) > len(subject.ProfessorIDs) {
			for _, professorID := range oldSubject.ProfessorIDs {
				err = ctrl.Repo.RemoveSubjectFromProfessor(professorID, id)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
			}
		} else {
			subjectObjID, _ := primitive.ObjectIDFromHex(id)
			for _, professorID := range subject.ProfessorIDs {
				err = ctrl.Repo.AddSubjectToProfessor([]primitive.ObjectID{subjectObjID}, professorID.Hex())
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
			}
		}
		err = ctrl.Repo.UpdateSubject(&subject)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	subject.ID = objectID

	err = ctrl.Repo.UpdateSubject(&subject)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subject)
}

func (ctrl *Controllers) DeleteSubject(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteSubject(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}
