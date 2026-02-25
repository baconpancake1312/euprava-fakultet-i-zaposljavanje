package controllers

import (
	"log"
	repositories "university-service/repository"
)

// Controllers holds shared dependencies for all HTTP handlers.
type Controllers struct {
	Repo   *repositories.Repository
	logger *log.Logger
}

// ValidationError represents a validation error that should return HTTP 400.
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

// NewControllers returns a new Controllers instance.
func NewControllers(repo *repositories.Repository, l *log.Logger) *Controllers {
	return &Controllers{Repo: repo, logger: l}
}
