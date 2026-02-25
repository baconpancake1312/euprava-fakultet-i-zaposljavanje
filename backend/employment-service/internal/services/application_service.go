package services

import (
	"log"

	"employment-service/data"
	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ApplicationService struct {
	repo   *data.EmploymentRepo
	logger *log.Logger
}

func NewApplicationService(repo *data.EmploymentRepo, logger *log.Logger) *ApplicationService {
	return &ApplicationService{
		repo:   repo,
		logger: logger,
	}
}

func (s *ApplicationService) CreateApplication(application *models.Application) (primitive.ObjectID, error) {
	return s.repo.CreateApplication(application)
}

func (s *ApplicationService) GetApplication(appID string) (*models.Application, error) {
	return s.repo.GetApplication(appID)
}

func (s *ApplicationService) GetAllApplications() ([]*models.Application, error) {
	return s.repo.GetAllApplications()
}

func (s *ApplicationService) GetApplicationsByCandidate(candidateID string) ([]*models.Application, error) {
	return s.repo.GetApplicationsByCandidateId(candidateID)
}

func (s *ApplicationService) GetCandidateApplicationStats(candidateID string) (map[string]interface{}, error) {
	applications, err := s.repo.GetApplicationsByCandidateId(candidateID)
	if err != nil {
		return nil, err
	}
	pending := 0
	accepted := 0
	rejected := 0
	for _, app := range applications {
		switch app.Status {
		case "pending":
			pending++
		case "accepted":
			accepted++
		case "rejected":
			rejected++
		}
	}
	return map[string]interface{}{
		"total":              len(applications),
		"pending":            pending,
		"accepted":           accepted,
		"rejected":           rejected,
		"recent_applications": 0,
	}, nil
}

func (s *ApplicationService) GetApplicationsByEmployer(employerID string) ([]*models.Application, error) {
	return s.repo.GetApplicationsByEmployerId(employerID)
}

func (s *ApplicationService) GetApplicationsForJob(jobID string) ([]*models.Application, error) {
	return s.repo.GetApplicationsForJob(s.repo.GetClient(), jobID)
}

func (s *ApplicationService) UpdateApplication(appID string, application *models.Application) error {
	return s.repo.UpdateApplication(appID, application)
}

func (s *ApplicationService) AcceptApplication(appID string) error {
	return s.repo.UpdateApplicationStatusByAdmin(appID, "accepted")
}

func (s *ApplicationService) RejectApplication(appID string) error {
	return s.repo.UpdateApplicationStatusByAdmin(appID, "rejected")
}

func (s *ApplicationService) DeleteApplication(appID string) error {
	return s.repo.DeleteApplication(appID)
}

func (s *ApplicationService) SearchApplicationsByStatus(status string, page, limit int) (map[string]interface{}, error) {
	applications, total, err := s.repo.SearchApplicationsByStatus(status, page, limit)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"applications": applications,
		"total":        total,
		"page":         page,
		"limit":        limit,
	}, nil
}

func (s *ApplicationService) GetCandidateByID(candidateID string) (*models.Candidate, error) {
	return s.repo.GetCandidate(candidateID)
}
