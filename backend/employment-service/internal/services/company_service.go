package services

import (
	"log"

	"employment-service/data"
	"employment-service/models"
)

type CompanyService struct {
	repo   *data.EmploymentRepo
	logger *log.Logger
}

func NewCompanyService(repo *data.EmploymentRepo, logger *log.Logger) *CompanyService {
	return &CompanyService{
		repo:   repo,
		logger: logger,
	}
}

func (s *CompanyService) GetCompanyByEmployerId(employerID string) (*models.Company, error) {
	return s.repo.GetCompanyByEmployerId(employerID)
}

func (s *CompanyService) UpdateCompany(companyID string, company *models.Company) error {
	return s.repo.UpdateCompany(companyID, company)
}

func (s *CompanyService) GetAllCompanies() ([]*models.Company, error) {
	return s.repo.GetAllCompanies()
}

func (s *CompanyService) GetCompanyById(companyID string) (*models.Company, error) {
	return s.repo.GetCompanyById(companyID)
}
