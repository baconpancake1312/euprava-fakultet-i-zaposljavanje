package handlers

import (
	"log"

	"employment-service/internal/services"
)

type Handlers struct {
	User        *UserHandler
	Employer    *EmployerHandler
	Candidate   *CandidateHandler
	Job         *JobHandler
	Application *ApplicationHandler
	Admin       *AdminHandler
	Search      *SearchHandler
	Messaging   *MessagingHandler
	Interview   *InterviewHandler
	Company     *CompanyHandler
}

func NewHandlers(services *services.Services, logger *log.Logger) *Handlers {
	return &Handlers{
		User:        NewUserHandler(services.User, logger),
		Employer:    NewEmployerHandler(services.Employer, logger),
		Candidate:   NewCandidateHandler(services.Candidate, logger),
		Job:         NewJobHandler(services.Job, logger),
		Application: NewApplicationHandler(services.Application, logger),
		Admin:       NewAdminHandler(services.Admin, logger),
		Search:      NewSearchHandler(services.Search, logger),
		Messaging:   NewMessagingHandler(services.Messaging, logger),
		Interview:   NewInterviewHandler(services.Interview, logger),
		Company:     NewCompanyHandler(services.Company, logger),
	}
}
