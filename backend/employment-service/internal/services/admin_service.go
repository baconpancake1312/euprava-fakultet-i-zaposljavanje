package services

import (
	"log"

	"employment-service/data"
	"employment-service/models"
)

type AdminService struct {
	repo   *data.EmploymentRepo
	logger *log.Logger
}

func NewAdminService(repo *data.EmploymentRepo, logger *log.Logger) *AdminService {
	return &AdminService{
		repo:   repo,
		logger: logger,
	}
}

func (s *AdminService) ApproveEmployer(employerID, adminID string) error {
	return s.repo.ApproveEmployer(employerID, adminID)
}

func (s *AdminService) RejectEmployer(employerID, adminID string) error {
	return s.repo.RejectEmployer(employerID, adminID)
}

func (s *AdminService) GetPendingEmployers() ([]*models.Employer, error) {
	return s.repo.GetPendingEmployers()
}

func (s *AdminService) GetEmployerStats() (map[string]interface{}, error) {
	stats, err := s.repo.GetEmployerStats()
	if err != nil {
		return nil, err
	}
	result := make(map[string]interface{})
	for k, v := range stats {
		result[k] = v
	}
	return result, nil
}

func (s *AdminService) ApproveJobListing(jobID, adminID string) error {
	return s.repo.ApproveJobListing(jobID, adminID)
}

func (s *AdminService) RejectJobListing(jobID, adminID string) error {
	return s.repo.RejectJobListing(jobID, adminID)
}

func (s *AdminService) GetPendingJobListings() ([]*models.JobListing, error) {
	return s.repo.GetPendingJobListings()
}

func (s *AdminService) GetEmployer(employerID string) (*models.Employer, error) {
	return s.repo.GetEmployer(employerID)
}
