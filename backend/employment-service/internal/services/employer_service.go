package services

import (
	"log"

	"employment-service/data"
	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type EmployerService struct {
	repo   *data.EmploymentRepo
	logger *log.Logger
}

func NewEmployerService(repo *data.EmploymentRepo, logger *log.Logger) *EmployerService {
	return &EmployerService{
		repo:   repo,
		logger: logger,
	}
}

func (s *EmployerService) CreateEmployer(employer *models.Employer) (primitive.ObjectID, error) {
	return s.repo.CreateEmployer(employer)
}

func (s *EmployerService) GetEmployer(employerID string) (*models.Employer, error) {
	return s.repo.GetEmployer(employerID)
}

func (s *EmployerService) GetEmployerByUserID(userID string) (*models.Employer, error) {
	return s.repo.GetEmployerByUserID(userID)
}

func (s *EmployerService) GetAllEmployers() ([]*models.Employer, error) {
	return s.repo.GetAllEmployers()
}

func (s *EmployerService) UpdateEmployer(employerID string, employer *models.Employer) error {
	return s.repo.UpdateEmployer(employerID, employer)
}

func (s *EmployerService) DeleteEmployer(employerID string) error {
	return s.repo.DeleteEmployer(employerID)
}
