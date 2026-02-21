package services

import (
	"log"

	"employment-service/data"
)

type SearchService struct {
	repo   *data.EmploymentRepo
	logger *log.Logger
}

func NewSearchService(repo *data.EmploymentRepo, logger *log.Logger) *SearchService {
	return &SearchService{
		repo:   repo,
		logger: logger,
	}
}

func (s *SearchService) SearchUsersByText(query string, page, limit int) (map[string]interface{}, error) {
	users, total, err := s.repo.SearchUsersByText(query, page, limit)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"users": users,
		"total": total,
		"page":  page,
		"limit": limit,
	}, nil
}

func (s *SearchService) SearchEmployersByText(query string, page, limit int) (map[string]interface{}, error) {
	employers, total, err := s.repo.SearchEmployersByText(query, page, limit)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"employers": employers,
		"total":     total,
		"page":       page,
		"limit":      limit,
	}, nil
}

func (s *SearchService) SearchCandidatesByText(query string, page, limit int) (map[string]interface{}, error) {
	candidates, total, err := s.repo.SearchCandidatesByText(query, page, limit)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"candidates": candidates,
		"total":      total,
		"page":       page,
		"limit":      limit,
	}, nil
}
