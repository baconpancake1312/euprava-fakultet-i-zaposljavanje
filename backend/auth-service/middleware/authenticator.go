package middleware

import (
	"net/http"
	"strings"

	helper "backend/helpers"

	"github.com/gin-gonic/gin"
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

		// Try Keycloak token validation first
		keycloakUserInfo, keycloakErr := helper.ValidateKeycloakToken(clientToken)
		if keycloakErr == nil && keycloakUserInfo != nil {
			// Keycloak token is valid, extract user info
			email, _ := keycloakUserInfo["email"].(string)
			preferredUsername, _ := keycloakUserInfo["preferred_username"].(string)
			if email == "" {
				email = preferredUsername
			}
			
			firstName, _ := keycloakUserInfo["given_name"].(string)
			lastName, _ := keycloakUserInfo["family_name"].(string)
			sub, _ := keycloakUserInfo["sub"].(string) // Keycloak user ID
			
			// Get user_type from attributes or realm roles
			userType := "CANDIDATE" // default
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

		// Fallback to legacy JWT token validation
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

		c.Next()
	}
}
