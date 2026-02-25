package controllers

import (
	"net/http"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (ctrl *Controllers) RegisterForExam(c *gin.Context) {
	var req repositories.CreateExamRegistrationRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	student, err := ctrl.Repo.GetStudentByID(req.StudentID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}
	student.ID = req.StudentID

	examSession, err := ctrl.Repo.GetExamSessionByID(req.ExamSessionID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam session not found"})
		return
	}

	alreadyRegistered, err := ctrl.Repo.CheckExamRegistration(req.StudentID, req.ExamSessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if alreadyRegistered {
		c.JSON(http.StatusConflict, gin.H{"error": "Student is already registered for this exam"})
		return
	}

	registration := repositories.ExamRegistration{
		Student:       *student,
		ExamSessionID: examSession.ID,
	}

	err = ctrl.Repo.RegisterForExam(&registration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Successfully registered for exam"})
}

func (ctrl *Controllers) DeregisterFromExam(c *gin.Context) {
	studentID, err := primitive.ObjectIDFromHex(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	examSessionID, err := primitive.ObjectIDFromHex(c.Param("examSessionId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam session ID"})
		return
	}

	err = ctrl.Repo.DeregisterFromExam(studentID, examSessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully deregistered from exam"})
}

func (ctrl *Controllers) GetExamRegistrationsByStudent(c *gin.Context) {
	studentID, err := primitive.ObjectIDFromHex(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	registrations, err := ctrl.Repo.GetExamRegistrationsByStudent(studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, registrations)
}

func (ctrl *Controllers) GetExamRegistrationsByExamSession(c *gin.Context) {
	examSessionID, err := primitive.ObjectIDFromHex(c.Param("examSessionId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam session ID"})
		return
	}

	registrations, err := ctrl.Repo.GetExamRegistrationsByExamSession(examSessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, registrations)
}
