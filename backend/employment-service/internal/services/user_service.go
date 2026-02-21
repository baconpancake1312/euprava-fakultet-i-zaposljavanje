package services

import (
	"log"

	"employment-service/data"
	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserService struct {
	repo   *data.EmploymentRepo
	logger *log.Logger
}

func NewUserService(repo *data.EmploymentRepo, logger *log.Logger) *UserService {
	return &UserService{
		repo:   repo,
		logger: logger,
	}
}

func (s *UserService) CreateUser(user *models.User) (primitive.ObjectID, error) {
	return s.repo.CreateUser(user)
}

func (s *UserService) GetUser(userID string) (*models.User, error) {
	return s.repo.GetUser(userID)
}

func (s *UserService) GetAllUsers() ([]*models.User, error) {
	return s.repo.GetAllUsers()
}

func (s *UserService) UpdateUser(userID string, user *models.User) error {
	return s.repo.UpdateUser(userID, user)
}

func (s *UserService) DeleteUser(userID string) error {
	return s.repo.DeleteUser(userID)
}
