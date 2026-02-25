package controllers

import (
	"net/http"
	repositories "university-service/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CreateExamPeriod creates a new exam period (STUDENTSKA_SLUZBA or admin).
func (ctrl *Controllers) CreateExamPeriod(c *gin.Context) {
	var req repositories.CreateExamPeriodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.EndDate.Before(req.StartDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date must be on or after start_date"})
		return
	}
	if req.Semester != 0 && req.Semester != 1 && req.Semester != 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "semester must be 1 or 2"})
		return
	}

	period := &repositories.ExamPeriod{
		Name:         req.Name,
		StartDate:    req.StartDate,
		EndDate:      req.EndDate,
		AcademicYear: req.AcademicYear,
		Semester:     req.Semester,
		MajorID:      req.MajorID,
		IsActive:     req.IsActive,
	}
	if err := ctrl.Repo.CreateExamPeriod(period); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, period)
}

// GetAllExamPeriods returns all exam periods.
func (ctrl *Controllers) GetAllExamPeriods(c *gin.Context) {
	periods, err := ctrl.Repo.GetAllExamPeriods()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if periods == nil {
		periods = []repositories.ExamPeriod{}
	}
	c.JSON(http.StatusOK, periods)
}

// GetActiveExamPeriods returns only active exam periods (for scheduling).
func (ctrl *Controllers) GetActiveExamPeriods(c *gin.Context) {
	periods, err := ctrl.Repo.GetActiveExamPeriods()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if periods == nil {
		periods = []repositories.ExamPeriod{}
	}
	c.JSON(http.StatusOK, periods)
}

// GetExamPeriodByID returns one exam period by ID.
func (ctrl *Controllers) GetExamPeriodByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam period ID"})
		return
	}
	period, err := ctrl.Repo.GetExamPeriodByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if period == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam period not found"})
		return
	}
	c.JSON(http.StatusOK, period)
}

// UpdateExamPeriod updates an exam period (e.g. toggle is_active, adjust dates).
func (ctrl *Controllers) UpdateExamPeriod(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam period ID"})
		return
	}
	existing, err := ctrl.Repo.GetExamPeriodByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if existing == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam period not found"})
		return
	}

	var req repositories.ExamPeriod
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.ID = id
	req.CreatedAt = existing.CreatedAt
	if req.Name == "" {
		req.Name = existing.Name
	}
	if req.StartDate.IsZero() {
		req.StartDate = existing.StartDate
	}
	if req.EndDate.IsZero() {
		req.EndDate = existing.EndDate
	}
	if req.AcademicYear == 0 {
		req.AcademicYear = existing.AcademicYear
	}
	if req.Semester == 0 {
		req.Semester = existing.Semester
	}
	if req.MajorID == nil && existing.MajorID != nil {
		req.MajorID = existing.MajorID
	}
	if req.EndDate.Before(req.StartDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date must be on or after start_date"})
		return
	}
	if req.Semester != 1 && req.Semester != 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "semester must be 1 or 2"})
		return
	}

	if err := ctrl.Repo.UpdateExamPeriod(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, req)
}

func (ctrl *Controllers) DeleteExamPeriod(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exam period ID"})
		return
	}
	err = ctrl.Repo.DeleteExamPeriod(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Exam period deleted successfully"})
}
