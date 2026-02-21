package controllers

import (
	"net/http"
	"strconv"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (ctrl *Controllers) CreateExamGrade(c *gin.Context) {
	var req repositories.CreateExamGradeRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Grade < 5 || req.Grade > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Grade must be between 5 and 10"})
		return
	}

	fetchedStudent, err := ctrl.Repo.GetStudentByID(req.StudentID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	examRegistration, err := ctrl.Repo.GetExamRegistrationById(req.ExamRegistrationId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam session not found"})
		return
	}

	examSession, err := ctrl.Repo.GetExamSessionByID(examRegistration.ExamSessionID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam session not found"})
		return
	}

	examSession.Status = repositories.Completed
	err = ctrl.Repo.UpdateExamSession(examSession)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam session not found"})
		return
	}

	professor := examSession.Professor

	grade := repositories.ExamGrade{
		Student:            *fetchedStudent,
		ExamRegistrationId: req.ExamRegistrationId,
		ExamSessionId:      examSession.ID,
		SubjectId:          examSession.Subject.ID,
		Grade:              req.Grade,
		Passed:             req.Grade >= 6,
		GradedBy:           professor,
		Comments:           req.Comments,
	}

	err = ctrl.Repo.CreateExamGrade(&grade)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if grade.Passed {
		fetchedStudent.GPA = (fetchedStudent.GPA + float64(grade.Grade)) / 2

		err := ctrl.Repo.UpdateStudent(fetchedStudent)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		_, _ = ctrl.CreateNotificationByRecipient(repositories.Notification{
			RecipientID:    grade.Student.ID,
			RecipientType:  "id",
			RecipientValue: grade.Student.ID.Hex(),
			Title:          "You have passed the " + examSession.Subject.Name + " exam",
			Content:        "You have passed the " + examSession.Subject.Name + " exam with a grade of " + strconv.Itoa(grade.Grade) + ". \nHere is the comment from professor " + *grade.GradedBy.FirstName + " " + *grade.GradedBy.LastName + ": " + grade.Comments,
		})
	} else {
		_, _ = ctrl.CreateNotificationByRecipient(repositories.Notification{
			RecipientID:    grade.Student.ID,
			RecipientType:  "id",
			RecipientValue: grade.Student.ID.Hex(),
			Title:          "You have failed the " + examSession.Subject.Name + " exam",
			Content:        "You have failed the " + examSession.Subject.Name + " exam, better luck next time. \nHere is the comment from professor " + *grade.GradedBy.FirstName + " " + *grade.GradedBy.LastName + ": " + grade.Comments,
		})
	}

	c.JSON(http.StatusCreated, grade)
}

func (ctrl *Controllers) UpdateExamGrade(c *gin.Context) {
	id := c.Param("id")
	var grade repositories.ExamGrade
	if err := c.BindJSON(&grade); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if grade.Grade < 5 || grade.Grade > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Grade must be between 5 and 10"})
		return
	}

	grade.Passed = grade.Grade >= 6

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	grade.ID = objectID

	err = ctrl.Repo.UpdateExamGrade(&grade)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, grade)
}

func (ctrl *Controllers) DeleteExamGrade(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid grade ID"})
		return
	}

	err = ctrl.Repo.DeleteExamGrade(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (ctrl *Controllers) GetExamGradesByStudent(c *gin.Context) {
	studentID, err := primitive.ObjectIDFromHex(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	grades, err := ctrl.Repo.GetExamGradesByStudent(studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, grades)
}

func (ctrl *Controllers) GetExamGradesByExamSession(c *gin.Context) {
	examSessionID, err := primitive.ObjectIDFromHex(c.Param("examSessionId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam session ID"})
		return
	}

	grades, err := ctrl.Repo.GetExamGradesByExamSession(examSessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, grades)
}

func (ctrl *Controllers) GetExamGradeByStudentAndExam(c *gin.Context) {
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

	grade, err := ctrl.Repo.GetExamGradeByStudentAndExam(studentID, examSessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Grade not found"})
		return
	}

	c.JSON(http.StatusOK, grade)
}
