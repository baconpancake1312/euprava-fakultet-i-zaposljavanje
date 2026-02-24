package services

import (
	"log"

	"employment-service/data"
	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type JobService struct {
	repo   *data.EmploymentRepo
	logger *log.Logger
}

func NewJobService(repo *data.EmploymentRepo, logger *log.Logger) *JobService {
	return &JobService{
		repo:   repo,
		logger: logger,
	}
}

func (s *JobService) CreateJobListing(job *models.JobListing) (primitive.ObjectID, error) {
	return s.repo.CreateJobListing(job)
}

func (s *JobService) GetJobListing(jobID string) (*models.JobListing, error) {
	return s.repo.GetJobListing(jobID)
}

func (s *JobService) GetAllJobListings() ([]*models.JobListing, error) {
	return s.repo.GetAllJobListings()
}

func (s *JobService) UpdateJobListing(jobID string, job *models.JobListing) error {
	return s.repo.UpdateJobListing(jobID, job)
}

func (s *JobService) DeleteJobListing(jobID string) error {
	return s.repo.DeleteJobListing(jobID)
}

func (s *JobService) SearchJobsByText(query string, page, limit int) (map[string]interface{}, error) {
	jobs, total, err := s.repo.SearchJobsByText(query, page, limit)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"jobs":  jobs,
		"total": total,
		"page":  page,
		"limit": limit,
	}, nil
}

func (s *JobService) SearchJobsByInternship(isInternship bool, page, limit int) (map[string]interface{}, error) {
	jobs, total, err := s.repo.SearchJobsByInternship(isInternship, page, limit)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"jobs":  jobs,
		"total": total,
		"page":  page,
		"limit": limit,
	}, nil
}

func (s *JobService) GetActiveJobs(limit int) ([]*models.JobListing, error) {
	return s.repo.GetActiveJobs(limit)
}

func (s *JobService) GetTrendingJobs(limit int) ([]*models.JobListing, error) {

	return s.repo.GetActiveJobs(limit)
}

func (s *JobService) GetJobRecommendations(userID string, limit int) ([]*models.JobListing, error) {
	candidate, err := s.repo.GetCandidateByUserID(userID)
	if err != nil {

		return s.repo.GetActiveJobs(limit)
	}

	recommendations, err := s.repo.GetJobRecommendationsForCandidate(candidate.ID.Hex(), limit)
	if err != nil {
		return s.repo.GetActiveJobs(limit)
	}

	jobs := make([]*models.JobListing, 0, len(recommendations))
	for _, rec := range recommendations {
		if job, ok := rec["job"].(*models.JobListing); ok {
			jobs = append(jobs, job)
		}
	}
	return jobs, nil
}

func (s *JobService) SaveJob(candidateID, jobID string) error {
	candObjId, err := primitive.ObjectIDFromHex(candidateID)
	if err != nil {
		return err
	}
	jobObjId, err := primitive.ObjectIDFromHex(jobID)
	if err != nil {
		return err
	}
	return s.repo.SaveJob(candObjId, jobObjId)
}

func (s *JobService) UnsaveJob(candidateID, jobID string) error {
	candObjId, err := primitive.ObjectIDFromHex(candidateID)
	if err != nil {
		return err
	}
	jobObjId, err := primitive.ObjectIDFromHex(jobID)
	if err != nil {
		return err
	}
	return s.repo.UnsaveJob(candObjId, jobObjId)
}

func (s *JobService) GetSavedJobs(candidateID string) ([]*models.JobListing, error) {
	candObjId, err := primitive.ObjectIDFromHex(candidateID)
	if err != nil {
		return nil, err
	}
	return s.repo.GetSavedJobsWithDetails(candObjId)
}

func (s *JobService) SetJobOpenState(jobID string, isOpen bool) error {
	return s.repo.SetJobListingOpenState(jobID, isOpen)
}
