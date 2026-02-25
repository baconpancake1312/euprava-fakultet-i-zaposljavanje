package helper

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

var (
	keycloakURL      = os.Getenv("KEYCLOAK_URL")
	keycloakRealm    = os.Getenv("KEYCLOAK_REALM")
	keycloakClientID = os.Getenv("KEYCLOAK_CLIENT_ID")
	keycloakSecret   = os.Getenv("KEYCLOAK_CLIENT_SECRET")
	adminUser        = os.Getenv("KEYCLOAK_ADMIN_USER")
	adminPassword    = os.Getenv("KEYCLOAK_ADMIN_PASSWORD")
)

type KeycloakTokenResponse struct {
	AccessToken      string `json:"access_token"`
	RefreshToken     string `json:"refresh_token"`
	ExpiresIn        int    `json:"expires_in"`
	RefreshExpiresIn int    `json:"refresh_expires_in"`
	TokenType        string `json:"token_type"`
}

type KeycloakUser struct {
	ID            string                 `json:"id,omitempty"`
	Username      string                 `json:"username"`
	Email         string                 `json:"email"`
	FirstName     string                 `json:"firstName"`
	LastName      string                 `json:"lastName"`
	Enabled       bool                   `json:"enabled"`
	EmailVerified bool                   `json:"emailVerified"`
	Attributes    map[string]interface{} `json:"attributes,omitempty"`
	Credentials   []KeycloakCredential   `json:"credentials,omitempty"`
}

type KeycloakCredential struct {
	Type      string `json:"type"`
	Value     string `json:"value"`
	Temporary bool   `json:"temporary"`
}

// GetAdminToken gets an admin access token from Keycloak
func GetAdminToken() (string, error) {
	if keycloakURL == "" {
		return "", fmt.Errorf("KEYCLOAK_URL not set")
	}

	url := fmt.Sprintf("%s/realms/master/protocol/openid-connect/token", keycloakURL)

	data := map[string]string{
		"grant_type":    "password",
		"client_id":     "admin-cli",
		"username":      adminUser,
		"password":      adminPassword,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	// Use form encoding for Keycloak
	formData := fmt.Sprintf("grant_type=password&client_id=admin-cli&username=%s&password=%s", adminUser, adminPassword)
	req, err = http.NewRequest("POST", url, bytes.NewBufferString(formData))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to get admin token: %s, status: %d", string(body), resp.StatusCode)
	}

	var tokenResp KeycloakTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", err
	}

	return tokenResp.AccessToken, nil
}

// CreateUserInKeycloak creates a user in Keycloak
func CreateUserInKeycloak(user KeycloakUser) (string, error) {
	if keycloakURL == "" || keycloakRealm == "" {
		return "", fmt.Errorf("Keycloak configuration not set")
	}

	adminToken, err := GetAdminToken()
	if err != nil {
		return "", fmt.Errorf("failed to get admin token: %v", err)
	}

	url := fmt.Sprintf("%s/admin/realms/%s/users", keycloakURL, keycloakRealm)

	jsonData, err := json.Marshal(user)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+adminToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusConflict {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to create user in Keycloak: %s, status: %d", string(body), resp.StatusCode)
	}

	// Get user ID from Location header
	if resp.StatusCode == http.StatusCreated {
		location := resp.Header.Get("Location")
		if location != "" {
			// Extract user ID from location URL
			// Location format: /admin/realms/{realm}/users/{user-id}
			parts := strings.Split(location, "/")
			if len(parts) > 0 {
				userID := parts[len(parts)-1] // Get the last part which is the user ID
				log.Printf("User created in Keycloak with ID: %s", userID)
				return userID, nil
			}
			log.Printf("User created in Keycloak at: %s", location)
		}
		// If we can't extract from location, try to get by username
		userID, err := GetUserIDFromKeycloak(user.Username)
		if err == nil {
			return userID, nil
		}
	}

	// If user already exists, get the user ID
	if resp.StatusCode == http.StatusConflict {
		userID, err := GetUserIDFromKeycloak(user.Username)
		if err == nil {
			return userID, nil
		}
	}

	return "", fmt.Errorf("failed to get user ID from Keycloak")
}

// GetUserIDFromKeycloak gets user ID from Keycloak by username
func GetUserIDFromKeycloak(username string) (string, error) {
	if keycloakURL == "" || keycloakRealm == "" {
		return "", fmt.Errorf("Keycloak configuration not set")
	}

	adminToken, err := GetAdminToken()
	if err != nil {
		return "", fmt.Errorf("failed to get admin token: %v", err)
	}

	url := fmt.Sprintf("%s/admin/realms/%s/users?username=%s", keycloakURL, keycloakRealm, username)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+adminToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to get user from Keycloak: status %d", resp.StatusCode)
	}

	var users []KeycloakUser
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return "", err
	}

	if len(users) == 0 {
		return "", fmt.Errorf("user not found in Keycloak")
	}

	return users[0].ID, nil
}

// ValidateKeycloakToken validates a Keycloak access token
func ValidateKeycloakToken(token string) (map[string]interface{}, error) {
	if keycloakURL == "" || keycloakRealm == "" {
		return nil, fmt.Errorf("Keycloak configuration not set")
	}

	url := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/userinfo", keycloakURL, keycloakRealm)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid token: status %d", resp.StatusCode)
	}

	var userInfo map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, err
	}

	return userInfo, nil
}

// LoginWithKeycloak performs login using Keycloak
func LoginWithKeycloak(username, password string) (*KeycloakTokenResponse, error) {
	if keycloakURL == "" || keycloakRealm == "" || keycloakClientID == "" {
		return nil, fmt.Errorf("Keycloak configuration not set")
	}

	url := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/token", keycloakURL, keycloakRealm)

	formData := fmt.Sprintf("grant_type=password&client_id=%s&client_secret=%s&username=%s&password=%s",
		keycloakClientID, keycloakSecret, username, password)

	req, err := http.NewRequest("POST", url, bytes.NewBufferString(formData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("login failed: %s, status: %d", string(body), resp.StatusCode)
	}

	var tokenResp KeycloakTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}
