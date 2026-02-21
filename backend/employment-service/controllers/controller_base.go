package controllers

import (
	"log"

	"employment-service/data"
)

type EmploymentController struct {
	repo   *data.EmploymentRepo
	logger *log.Logger
}

func NewEmploymentController(logger *log.Logger, repo *data.EmploymentRepo) *EmploymentController {
	return &EmploymentController{
		repo:   repo,
		logger: logger,
	}
}
