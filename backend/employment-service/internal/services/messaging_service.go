package services

import (
	"context"
	"log"
	"time"

	"employment-service/data"
	"employment-service/messaging"
	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessagingService struct {
	repo   *data.EmploymentRepo
	broker *messaging.Broker
	hub    *messaging.Hub
	logger *log.Logger
}

func NewMessagingService(repo *data.EmploymentRepo, broker *messaging.Broker, hub *messaging.Hub, logger *log.Logger) *MessagingService {
	return &MessagingService{
		repo:   repo,
		broker: broker,
		hub:    hub,
		logger: logger,
	}
}

// SendMessage publishes the message to RabbitMQ instead of writing directly to MongoDB.
// The consumer (started in main) will persist it and push it via WebSocket.
func (s *MessagingService) SendMessage(message *models.Message) (primitive.ObjectID, error) {
	// Assign ID and timestamp here so the caller gets them back immediately.
	if message.ID == primitive.NilObjectID {
		message.ID = primitive.NewObjectID()
	}
	message.SentAt = time.Now()
	message.Read = false

	payload := messaging.MessagePayload{
		ID:           message.ID.Hex(),
		SenderID:     message.SenderId.Hex(),
		ReceiverID:   message.ReceiverId.Hex(),
		JobListingID: message.JobListingId.Hex(),
		Content:      message.Content,
		SentAt:       message.SentAt,
		Read:         false,
	}

	if s.broker != nil {
		if err := s.broker.Publish(context.Background(), payload); err != nil {
			s.logger.Printf("[messaging] broker publish failed, falling back to direct write: %v", err)
			// Fallback: persist directly if RabbitMQ is unavailable
			return s.repo.SendMessage(message)
		}
		return message.ID, nil
	}

	// No broker configured – write directly
	return s.repo.SendMessage(message)
}

func (s *MessagingService) GetMessagesBetweenUsers(userAID, userBID string) ([]*models.Message, error) {
	return s.repo.GetMessagesBetweenUsers(userAID, userBID)
}

func (s *MessagingService) GetInboxMessages(userID string) ([]*models.Message, error) {
	return s.repo.GetInboxMessages(userID)
}

func (s *MessagingService) GetSentMessages(userID string) ([]*models.Message, error) {
	return s.repo.GetSentMessages(userID)
}

func (s *MessagingService) MarkMessagesAsRead(senderID, receiverID string) error {
	return s.repo.MarkMessagesAsRead(senderID, receiverID)
}
