package services

import (
	"log"

	"employment-service/data"
	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CandidateService struct {
	repo   *data.EmploymentRepo
	logger *log.Logger
}

func NewCandidateService(repo *data.EmploymentRepo, logger *log.Logger) *CandidateService {
	return &CandidateService{
		repo:   repo,
		logger: logger,
	}
}

func (s *CandidateService) CreateCandidate(candidate *models.Candidate) (primitive.ObjectID, error) {
	return s.repo.CreateCandidate(candidate)
}

func (s *CandidateService) GetCandidate(candidateID string) (*models.Candidate, error) {
	return s.repo.GetCandidate(candidateID)
}

func (s *CandidateService) GetCandidateByUserID(userID string) (*models.Candidate, error) {
	return s.repo.GetCandidateByUserID(userID)
}

func (s *CandidateService) GetAllCandidates() ([]*models.Candidate, error) {
	return s.repo.GetAllCandidates()
}

func (s *CandidateService) UpdateCandidate(candidateID string, candidate *models.Candidate) error {
	return s.repo.UpdateCandidate(candidateID, candidate)
}

func (s *CandidateService) DeleteCandidate(candidateID string) error {
	return s.repo.DeleteCandidate(candidateID)
}
