package services

import (
	"log"

	"employment-service/data"
)

type Services struct {
	User        *UserService
	Employer    *EmployerService
	Candidate   *CandidateService
	Job         *JobService
	Application *ApplicationService
	Admin       *AdminService
	Search      *SearchService
	Messaging   *MessagingService
	Interview   *InterviewService
	Company     *CompanyService
}

func NewServices(repo *data.EmploymentRepo, logger *log.Logger) *Services {
	return &Services{
		User:        NewUserService(repo, logger),
		Employer:    NewEmployerService(repo, logger),
		Candidate:   NewCandidateService(repo, logger),
		Job:         NewJobService(repo, logger),
		Application: NewApplicationService(repo, logger),
		Admin:       NewAdminService(repo, logger),
		Search:      NewSearchService(repo, logger),
		Messaging:   NewMessagingService(repo, logger),
		Interview:   NewInterviewService(repo, logger),
		Company:     NewCompanyService(repo, logger),
	}
}
