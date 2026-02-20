package handlers

import (
	"log"
	"net/http"

	"employment-service/models"
	"employment-service/internal/services"

	"github.com/gin-gonic/gin"
)

type MessagingHandler struct {
	service *services.MessagingService
	logger  *log.Logger
}

func NewMessagingHandler(service *services.MessagingService, logger *log.Logger) *MessagingHandler {
	return &MessagingHandler{
		service: service,
		logger:  logger,
	}
}

func (h *MessagingHandler) SendMessage() gin.HandlerFunc {
	return func(c *gin.Context) {
		var message models.Message
		if err := c.BindJSON(&message); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		id, err := h.service.SendMessage(&message)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		message.ID = id
		c.JSON(http.StatusOK, gin.H{"message": "Message sent", "data": message})
	}
}

func (h *MessagingHandler) GetMessagesBetweenUsers() gin.HandlerFunc {
	return func(c *gin.Context) {
		userAId := c.Param("userAId")
		userBId := c.Param("userBId")

		messages, err := h.service.GetMessagesBetweenUsers(userAId, userBId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, messages)
	}
}

func (h *MessagingHandler) GetInboxMessages() gin.HandlerFunc {
	return func(c *gin.Context) {
		userId := c.Param("userId")

		messages, err := h.service.GetInboxMessages(userId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, messages)
	}
}

func (h *MessagingHandler) MarkMessagesAsRead() gin.HandlerFunc {
	return func(c *gin.Context) {
		senderId := c.Param("senderId")
		receiverId := c.Param("receiverId")

		err := h.service.MarkMessagesAsRead(senderId, receiverId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Messages marked as read"})
	}
}
