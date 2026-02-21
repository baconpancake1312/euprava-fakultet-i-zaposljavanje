package controllers

import (
	"net/http"

	"employment-service/models"

	"github.com/gin-gonic/gin"
)

func (ec *EmploymentController) SendMessage() gin.HandlerFunc {
	return func(c *gin.Context) {
		var message models.Message
		if err := c.BindJSON(&message); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}
		id, err := ec.repo.SendMessage(&message)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		message.ID = id
		c.JSON(http.StatusOK, gin.H{"message": "Message sent", "data": message})
	}
}

func (ec *EmploymentController) GetInboxMessages() gin.HandlerFunc {
	return func(c *gin.Context) {
		userId := c.Param("userId")
		messages, err := ec.repo.GetInboxMessages(userId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, messages)
	}
}

func (ec *EmploymentController) GetMessagesBetweenUsers() gin.HandlerFunc {
	return func(c *gin.Context) {
		userAId := c.Param("userAId")
		userBId := c.Param("userBId")
		messages, err := ec.repo.GetMessagesBetweenUsers(userAId, userBId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, messages)
	}
}

func (ec *EmploymentController) GetSentMessages() gin.HandlerFunc {
	return func(c *gin.Context) {
		userId := c.Param("userId")
		messages, err := ec.repo.GetSentMessages(userId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, messages)
	}
}

func (ec *EmploymentController) MarkMessagesAsRead() gin.HandlerFunc {
	return func(c *gin.Context) {
		senderId := c.Param("senderId")
		receiverId := c.Param("receiverId")
		err := ec.repo.MarkMessagesAsRead(senderId, receiverId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Messages marked as read"})
	}
}
