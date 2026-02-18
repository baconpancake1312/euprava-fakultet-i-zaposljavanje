package middleware

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	helper "employment-service/helpers"

	"github.com/gin-gonic/gin"
)

var (
	keycloakURL   = os.Getenv("KEYCLOAK_URL")
	keycloakRealm = os.Getenv("KEYCLOAK_REALM")
)

func Authentication() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientToken := c.Request.Header.Get("Authorization")
		clientToken = strings.Replace(clientToken, "Bearer ", "", 1)
		if clientToken == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "No Authorization header provided"})
			c.Abort()
			return
		}

		if keycloakURL != "" && keycloakRealm != "" {
			keycloakUserInfo, keycloakErr := validateKeycloakToken(clientToken)
			if keycloakErr == nil && keycloakUserInfo != nil {

				email, _ := keycloakUserInfo["email"].(string)
				preferredUsername, _ := keycloakUserInfo["preferred_username"].(string)
				if email == "" {
					email = preferredUsername
				}
				
				firstName, _ := keycloakUserInfo["given_name"].(string)
				lastName, _ := keycloakUserInfo["family_name"].(string)
				sub, _ := keycloakUserInfo["sub"].(string)
				
				userType := "CANDIDATE"
				if userTypeAttr, ok := keycloakUserInfo["user_type"].([]interface{}); ok && len(userTypeAttr) > 0 {
					if ut, ok := userTypeAttr[0].(string); ok {
						userType = ut
					}
				}

				c.Set("email", email)
				c.Set("first_name", firstName)
				c.Set("last_name", lastName)
				c.Set("uid", sub)
				c.Set("user_id", sub)
				c.Set("user_type", userType)
				c.Set("keycloak_token", true)

				c.Next()
				return
			}
		}

		claims, err := helper.ValidateToken(clientToken)
		if err != "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err})
			c.Abort()
			return
		}

		c.Set("email", claims.Email)
		c.Set("first_name", claims.First_name)
		c.Set("last_name", claims.Last_name)
		c.Set("uid", claims.Uid)
		c.Set("user_id", claims.Uid)
		c.Set("user_type", claims.User_type)
		c.Set("keycloak_token", false)

		isServiceAccount := isServiceAccountType(claims.User_type)
		c.Set("is_service_account", isServiceAccount)

		c.Next()
	}
}

func validateKeycloakToken(token string) (map[string]interface{}, error) {
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

func isServiceAccountType(userType string) bool {
	serviceTypes := []string{
		"AUTH_SERVICE",
		"UNIVERSITY_SERVICE",
		"EMPLOYMENT_SERVICE",
	}

	for _, serviceType := range serviceTypes {
		if userType == serviceType {
			return true
		}
	}
	return false
}
func AuthorizeRoles(roles []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user_type, _ := c.Get("user_type")
		userRole := user_type.(string)
		authorized := false
		if isServiceAccountType(userRole) || userRole == "ADMIN" {
			authorized = true
		} else {
			for _, role := range roles {
				if userRole == role {
					authorized = true
					break
				}
			}
		}

		if !authorized {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		c.Next()
	}
}
