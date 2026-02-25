package middleware

import (
	"net/http"
	"strings"

	helper "university-service/helpers"

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
		c.Set("user_type", claims.User_type)

		// Check if this is a service account token
		isServiceAccount := isServiceAccountType(claims.User_type)
		c.Set("is_service_account", isServiceAccount)

		c.Next()
	}
}

// isServiceAccountType checks if the user type is a service account
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
		if isServiceAccountType(userRole) || userRole == "ADMIN" || userRole == "ADMINISTRATOR" {
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
