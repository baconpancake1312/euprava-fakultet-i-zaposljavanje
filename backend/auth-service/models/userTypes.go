package models

type UserType string

const (
	StudentType        UserType = "STUDENT"
	ProfessorType      UserType = "PROFESSOR"
	AdministratorType  UserType = "ADMIN"
	EmployerType       UserType = "EMPLOYER"
	CandidateType      UserType = "CANDIDATE"
	StudentServiceType UserType = "STUDENTSKA_SLUZBA"

	// Service account types
	AuthServiceType       UserType = "AUTH_SERVICE"
	UniversityServiceType UserType = "UNIVERSITY_SERVICE"
	EmploymentServiceType UserType = "EMPLOYMENT_SERVICE"
)

// ValidUserTypes returns all valid user types
func ValidUserTypes() []UserType {
	return []UserType{
		StudentType,
		ProfessorType,
		AdministratorType,
		EmployerType,
		CandidateType,
		StudentServiceType,
		AuthServiceType,
		UniversityServiceType,
		EmploymentServiceType,
	}
}

// IsValidUserType checks if a user type is valid
func IsValidUserType(userType string) bool {
	for _, validType := range ValidUserTypes() {
		if string(validType) == userType {
			return true
		}
	}
	return false
}

// IsAcademicUser checks if user type belongs to academic services
func IsAcademicUser(userType UserType) bool {
	return userType == StudentType ||
		userType == ProfessorType ||
		userType == AdministratorType ||
		userType == StudentServiceType
}

// IsEmploymentUser checks if user type belongs to employment services
func IsEmploymentUser(userType UserType) bool {
	return userType == StudentType ||
		userType == EmployerType ||
		userType == CandidateType
}

// IsServiceAccount checks if user type is a service account
func IsServiceAccount(userType UserType) bool {
	return userType == AuthServiceType ||
		userType == UniversityServiceType ||
		userType == EmploymentServiceType
}
