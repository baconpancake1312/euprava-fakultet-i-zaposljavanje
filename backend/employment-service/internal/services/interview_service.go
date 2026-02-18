package services

import (
	"log"

	"employment-service/data"
	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type InterviewService struct {
	repo   *data.EmploymentRepo
	logger *log.Logger
}

func NewInterviewService(repo *data.EmploymentRepo, logger *log.Logger) *InterviewService {
	return &InterviewService{
		repo:   repo,
		logger: logger,
	}
}

func (s *InterviewService) CreateInterview(interview *models.Interview) (primitive.ObjectID, error) {
	return s.repo.CreateInterview(interview)
}

func (s *InterviewService) GetInterviewsByCandidate(candidateID string) ([]*models.Interview, error) {
	return s.repo.GetInterviewsByCandidate(candidateID)
}

func (s *InterviewService) GetInterviewsByEmployer(employerID string) ([]*models.Interview, error) {
	return s.repo.GetInterviewsByEmployer(employerID)
}

func (s *InterviewService) UpdateInterviewStatus(interviewID, status string) error {
	return s.repo.UpdateInterview(interviewID, map[string]interface{}{"status": status})
}
