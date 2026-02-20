package services

import (
	"log"

	"employment-service/data"
	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessagingService struct {
	repo   *data.EmploymentRepo
	logger *log.Logger
}

func NewMessagingService(repo *data.EmploymentRepo, logger *log.Logger) *MessagingService {
	return &MessagingService{
		repo:   repo,
		logger: logger,
	}
}

func (s *MessagingService) SendMessage(message *models.Message) (primitive.ObjectID, error) {
	return s.repo.SendMessage(message)
}

func (s *MessagingService) GetMessagesBetweenUsers(userAID, userBID string) ([]*models.Message, error) {
	return s.repo.GetMessagesBetweenUsers(userAID, userBID)
}

func (s *MessagingService) GetInboxMessages(userID string) ([]*models.Message, error) {
	return s.repo.GetInboxMessages(userID)
}

func (s *MessagingService) MarkMessagesAsRead(senderID, receiverID string) error {
	return s.repo.MarkMessagesAsRead(senderID, receiverID)
}
