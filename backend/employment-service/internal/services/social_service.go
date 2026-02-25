package services

import (
	"log"

	"employment-service/data"
	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SocialService struct {
	repo   *data.EmploymentRepo
	logger *log.Logger
}

func NewSocialService(repo *data.EmploymentRepo, logger *log.Logger) *SocialService {
	return &SocialService{
		repo:   repo,
		logger: logger,
	}
}

func (s *SocialService) CreateBenefitClaim(candidateID, reason string) (*models.BenefitClaim, error) {
	candObjId, err := primitive.ObjectIDFromHex(candidateID)
	if err != nil {
		return nil, err
	}
	return s.repo.CreateBenefitClaim(candObjId, reason)
}

func (s *SocialService) GetBenefitClaims(candidateID string) ([]*models.BenefitClaim, error) {
	candObjId, err := primitive.ObjectIDFromHex(candidateID)
	if err != nil {
		return nil, err
	}
	return s.repo.GetBenefitClaimsByCandidate(candObjId)
}

// Admin: list all benefit claims
func (s *SocialService) GetAllBenefitClaims() ([]*models.BenefitClaim, error) {
	return s.repo.GetAllBenefitClaims()
}

// Admin: update benefit claim status
func (s *SocialService) UpdateBenefitClaimStatus(id, status string) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	return s.repo.UpdateBenefitClaimStatus(objID, status)
}

func (s *SocialService) CreateCompetitionApplication(candidateID, title, issuer string) (*models.StateCompetitionApplication, error) {
	candObjId, err := primitive.ObjectIDFromHex(candidateID)
	if err != nil {
		return nil, err
	}
	return s.repo.CreateStateCompetitionApplication(candObjId, title, issuer)
}

func (s *SocialService) GetCompetitionApplications(candidateID string) ([]*models.StateCompetitionApplication, error) {
	candObjId, err := primitive.ObjectIDFromHex(candidateID)
	if err != nil {
		return nil, err
	}
	return s.repo.GetCompetitionApplicationsByCandidate(candObjId)
}

// Admin: list all competition applications
func (s *SocialService) GetAllCompetitionApplications() ([]*models.StateCompetitionApplication, error) {
	return s.repo.GetAllCompetitionApplications()
}

// Admin: update competition application status
func (s *SocialService) UpdateCompetitionApplicationStatus(id, status string) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	return s.repo.UpdateCompetitionApplicationStatus(objID, status)
}

func (s *SocialService) CreateStateCommunication(candidateID, subject, message string) (*models.StateCommunication, error) {
	candObjId, err := primitive.ObjectIDFromHex(candidateID)
	if err != nil {
		return nil, err
	}
	return s.repo.CreateStateCommunication(candObjId, subject, message)
}

func (s *SocialService) GetStateCommunications(candidateID string) ([]*models.StateCommunication, error) {
	candObjId, err := primitive.ObjectIDFromHex(candidateID)
	if err != nil {
		return nil, err
	}
	return s.repo.GetStateCommunicationsByCandidate(candObjId)
}

// Admin: list all state communications
func (s *SocialService) GetAllStateCommunications() ([]*models.StateCommunication, error) {
	return s.repo.GetAllStateCommunications()
}

// Admin: update state communication status/response
func (s *SocialService) UpdateStateCommunication(id, status, response string) error {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	return s.repo.UpdateStateCommunication(objID, status, response)
}

