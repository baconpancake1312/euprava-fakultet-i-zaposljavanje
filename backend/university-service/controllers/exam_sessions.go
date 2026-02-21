package controllers

import (
	"net/http"
	"strconv"
	"time"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (ctrl *Controllers) CreateExamSession(c *gin.Context) {
	var req repositories.CreateExamSessionRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	subject, err := ctrl.Repo.GetSubjectByID(req.SubjectID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subject not found"})
		return
	}

	professor, err := ctrl.Repo.GetProfessorByID(req.ProfessorID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Professor not found"})
		return
	}

	examSession := repositories.ExamSession{
		Subject:     *subject,
		Professor:   *professor,
		ExamDate:    req.ExamDate,
		Location:    req.Location,
		MaxStudents: req.MaxStudents,
	}

	err = ctrl.Repo.CreateExamSession(&examSession)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, examSession)
}

func (ctrl *Controllers) GetExamSessionByID(c *gin.Context) {
	id := c.Param("id")

	examSession, err := ctrl.Repo.GetExamSessionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam session not found"})
		return
	}

	c.JSON(http.StatusOK, examSession)
}

func (ctrl *Controllers) GetExamSessionsByProfessor(c *gin.Context) {
	professorID := c.Param("professorId")
	objectID, err := primitive.ObjectIDFromHex(professorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid professor ID"})
		return
	}

	examSessions, err := ctrl.Repo.GetExamSessionsByProfessor(objectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, examSessions)
}

func (ctrl *Controllers) GetExamSessionsByMajor(c *gin.Context) {
	studentId := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(studentId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	examSessions, err := ctrl.Repo.GetExamSessionsByStudent(objectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, examSessions)
}

func (ctrl *Controllers) UpdateExamSession(c *gin.Context) {
	id := c.Param("id")
	var examSession repositories.ExamSession
	if err := c.BindJSON(&examSession); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	oldExamSession, err := ctrl.Repo.GetExamSessionByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	examSession.ID = objectID

	err = ctrl.Repo.UpdateExamSession(&examSession)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	registrations, err := ctrl.Repo.GetExamRegistrationsByExamSession(examSession.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, registration := range registrations {
		_, err = ctrl.CreateNotificationByRecipient(repositories.Notification{
			RecipientID:    registration.Student.ID,
			RecipientType:  "id",
			RecipientValue: registration.Student.ID.Hex(),
			Title:          "The " + oldExamSession.Subject.Name + " exam you registered for has been updated",
			Content:        "The exam date is: " + examSession.ExamDate.Format(time.DateOnly) + " at " + examSession.ExamDate.Format(time.TimeOnly) + " \nThe location is: " + examSession.Location + " \nThe maximum number of students is " + strconv.Itoa(examSession.MaxStudents),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"notificationerror": err.Error()})
			continue
		}
	}

	c.JSON(http.StatusOK, examSession)
}

func (ctrl *Controllers) DeleteExamSession(c *gin.Context) {
	id := c.Param("id")

	err := ctrl.Repo.DeleteExamSession(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (ctrl *Controllers) GetAllExamSessions(c *gin.Context) {
	examSessions, err := ctrl.Repo.GetAllExamSessions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, examSessions)
}
