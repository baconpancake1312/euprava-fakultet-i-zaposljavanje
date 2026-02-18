package helper

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

var universityServiceURL string

func init() {
	universityServiceURL = os.Getenv("UNIVERSITY_SERVICE_URL")
	if universityServiceURL == "" {
		universityServiceURL = "http://university-service:8088" // Default Docker service name
	}
}

// NotificationRequest represents the notification payload for university service
type NotificationRequest struct {
	Title          string `json:"title" binding:"required"`
	Content        string `json:"content"`
	RecipientType  string `json:"recipient_type" binding:"required"` // "id"
	RecipientValue string `json:"recipient_value" binding:"required"` // User ID as string
}

// CreateNotification sends a notification to the university service
func CreateNotification(userID string, title string, content string, logger *log.Logger) error {
	// Convert userID to ObjectID to validate it
	_, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %v", err)
	}

	notification := NotificationRequest{
		Title:          title,
		Content:        content,
		RecipientType:  "id",
		RecipientValue: userID,
	}

	jsonData, err := json.Marshal(notification)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %v", err)
	}

	// Create HTTP request to internal endpoint (no auth required)
	url := fmt.Sprintf("%s/internal/notifications", universityServiceURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		logger.Printf("Failed to send notification to university service: %v", err)
		return fmt.Errorf("failed to send notification: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		var errorBody map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errorBody)
		logger.Printf("University service returned error: %d, %v", resp.StatusCode, errorBody)
		return fmt.Errorf("university service returned status %d", resp.StatusCode)
	}

	logger.Printf("Notification sent successfully to user %s: %s", userID, title)
	return nil
}
