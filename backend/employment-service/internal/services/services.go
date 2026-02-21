package services

import (
	"log"

	"employment-service/data"
	"employment-service/messaging"
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

func NewServices(repo *data.EmploymentRepo, broker *messaging.Broker, hub *messaging.Hub, logger *log.Logger) *Services {
	return &Services{
		User:        NewUserService(repo, logger),
		Employer:    NewEmployerService(repo, logger),
		Candidate:   NewCandidateService(repo, logger),
		Job:         NewJobService(repo, logger),
		Application: NewApplicationService(repo, logger),
		Admin:       NewAdminService(repo, logger),
		Search:      NewSearchService(repo, logger),
		Messaging:   NewMessagingService(repo, broker, hub, logger),
		Interview:   NewInterviewService(repo, logger),
		Company:     NewCompanyService(repo, logger),
	}
}
