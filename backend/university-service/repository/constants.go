package repositories

type UserType string
type Status string
type ExamStatus string

const (
	StudentType        UserType = "STUDENT"
	ProfessorType      UserType = "PROFESSOR"
	AdministratorType  UserType = "ADMIN"
	StudentServiceType UserType = "STUDENTSKA_SLUZBA"
)
const (
	AuthServiceType       UserType = "AUTH_SERVICE"
	UniversityServiceType UserType = "UNIVERSITY_SERVICE"
	EmploymentServiceType UserType = "EMPLOYMENT_SERVICE"
)
const (
	Approved Status = "Approved"
	Rejected Status = "Rejected"
	Pending  Status = "Pending"
)
const (
	Scheduled   ExamStatus = "Scheduled"
	Completed   ExamStatus = "Completed"
	PendingExam ExamStatus = "Pending"
)
