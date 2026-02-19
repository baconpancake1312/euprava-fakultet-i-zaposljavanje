package middleware

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
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
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No Authorization header provided"})
			c.Abort()
			return
		}

		if keycloakURL != "" && keycloakRealm != "" {
			var keycloakUserInfo map[string]interface{}
			var keycloakErr error
			
			// Try to decode JWT token directly first (faster, no network call)
			jwtUserInfo, jwtErr := decodeKeycloakJWT(clientToken)
			if jwtErr == nil && jwtUserInfo != nil {
				// JWT decode successful, use it
				keycloakUserInfo = jwtUserInfo
			} else {
				// Fallback to Keycloak API validation
				keycloakUserInfo, keycloakErr = validateKeycloakToken(clientToken)
				if keycloakErr != nil {
					// Log error for debugging but continue to legacy validation
					fmt.Printf("[Keycloak Auth] Token validation failed: %v\n", keycloakErr)
				}
			}
			
			if keycloakErr == nil && keycloakUserInfo != nil {
				email, _ := keycloakUserInfo["email"].(string)
				preferredUsername, _ := keycloakUserInfo["preferred_username"].(string)
				if email == "" {
					email = preferredUsername
				}
				
				firstName, _ := keycloakUserInfo["given_name"].(string)
				lastName, _ := keycloakUserInfo["family_name"].(string)
				sub, _ := keycloakUserInfo["sub"].(string)
				
				userType := "CANDIDATE" // default
				// Try to get user_type from token claims (if mapper is configured)
				if userTypeAttr, ok := keycloakUserInfo["user_type"].([]interface{}); ok && len(userTypeAttr) > 0 {
					if ut, ok := userTypeAttr[0].(string); ok {
						userType = strings.ToUpper(ut)
					}
				} else if userTypeStr, ok := keycloakUserInfo["user_type"].(string); ok {
					userType = strings.ToUpper(userTypeStr)
				} else {
					// Fallback: Try to infer from username pattern (for test users)
					username := preferredUsername
					if strings.HasPrefix(username, "testadmin") {
						userType = "ADMIN"
					} else if strings.HasPrefix(username, "testemployer") {
						userType = "EMPLOYER"
					} else if strings.HasPrefix(username, "testcandidate") {
						userType = "CANDIDATE"
					} else {
						// Try to get from realm roles or resource access
						if realmAccess, ok := keycloakUserInfo["realm_access"].(map[string]interface{}); ok {
							if roles, ok := realmAccess["roles"].([]interface{}); ok {
								for _, role := range roles {
									if roleStr, ok := role.(string); ok {
										roleUpper := strings.ToUpper(roleStr)
										if roleUpper == "ADMIN" {
											userType = "ADMIN"
											break
										} else if roleUpper == "EMPLOYER" {
											userType = "EMPLOYER"
											break
										} else if roleUpper == "CANDIDATE" {
											userType = "CANDIDATE"
											break
										}
									}
								}
							}
						}
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
			c.JSON(http.StatusUnauthorized, gin.H{"error": err})
			c.Abort()
			return
		}

		fmt.Printf("[Auth Service Token] Email: %s, User_type: %s, UID: %s\n", claims.Email, claims.User_type, claims.Uid)

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

	// Try userinfo endpoint first
	url := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/userinfo", keycloakURL, keycloakRealm)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Keycloak: %v", err)
	}
	defer resp.Body.Close()

	// If userinfo fails, try token introspection
	if resp.StatusCode != http.StatusOK {
		// Try token introspection as fallback
		return validateKeycloakTokenIntrospection(token)
	}

	var userInfo map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode userinfo: %v", err)
	}

	return userInfo, nil
}

func validateKeycloakTokenIntrospection(token string) (map[string]interface{}, error) {
	if keycloakURL == "" || keycloakRealm == "" {
		return nil, fmt.Errorf("Keycloak configuration not set")
	}

	// Get client credentials from environment or use default
	clientID := os.Getenv("KEYCLOAK_CLIENT_ID")
	clientSecret := os.Getenv("KEYCLOAK_CLIENT_SECRET")
	
	if clientID == "" {
		clientID = "euprava-client"
	}
	if clientSecret == "" {
		clientSecret = "olp0SqcHvKGvUnonpemuc3nTigYyHqLQ"
	}

	introspectURL := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/token/introspect", keycloakURL, keycloakRealm)

	// Properly URL-encode the form data
	formData := url.Values{}
	formData.Set("token", token)
	formData.Set("client_id", clientID)
	formData.Set("client_secret", clientSecret)
	
	req, err := http.NewRequest("POST", introspectURL, strings.NewReader(formData.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to introspect token: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes := make([]byte, 1024)
		resp.Body.Read(bodyBytes)
		return nil, fmt.Errorf("token introspection failed: status %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	var introspectionResult map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&introspectionResult); err != nil {
		return nil, fmt.Errorf("failed to decode introspection result: %v", err)
	}

	// Check if token is active
	active, ok := introspectionResult["active"].(bool)
	if !ok || !active {
		return nil, fmt.Errorf("token is not active")
	}

	// Return the introspection result which contains user info
	// Note: user_type might not be in introspection result, will be handled in Authentication()
	return introspectionResult, nil
}

// decodeKeycloakJWT decodes a JWT token without verification to extract user info
// This is faster than calling Keycloak API and works even if Keycloak is temporarily unavailable
func decodeKeycloakJWT(token string) (map[string]interface{}, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid JWT token format")
	}

	// Decode the payload (second part)
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("failed to decode JWT payload: %v", err)
	}

	var claims map[string]interface{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, fmt.Errorf("failed to parse JWT claims: %v", err)
	}

	// Check if token is expired
	if exp, ok := claims["exp"].(float64); ok {
		if int64(exp) < time.Now().Unix() {
			return nil, fmt.Errorf("token is expired")
		}
	}

	// Verify issuer matches expected Keycloak realm
	// If this is an auth service token (has User_type), it's not a Keycloak token
	if _, hasUserType := claims["User_type"].(string); hasUserType {
		return nil, fmt.Errorf("auth service token detected, not Keycloak token")
	}
	
	// For Keycloak tokens, verify issuer
	expectedIssuer := fmt.Sprintf("%s/realms/%s", keycloakURL, keycloakRealm)
	if iss, ok := claims["iss"].(string); ok {
		if iss != expectedIssuer && !strings.Contains(iss, keycloakRealm) {
			return nil, fmt.Errorf("token issuer mismatch")
		}
	} else {
		// No issuer field - likely not a Keycloak token
		return nil, fmt.Errorf("token missing issuer, not a Keycloak token")
	}

	// Extract user info from claims
	userInfo := make(map[string]interface{})
	
	// Copy relevant claims to userInfo
	if email, ok := claims["email"].(string); ok {
		userInfo["email"] = email
	}
	if preferredUsername, ok := claims["preferred_username"].(string); ok {
		userInfo["preferred_username"] = preferredUsername
	}
	if givenName, ok := claims["given_name"].(string); ok {
		userInfo["given_name"] = givenName
	}
	if familyName, ok := claims["family_name"].(string); ok {
		userInfo["family_name"] = familyName
	}
	if sub, ok := claims["sub"].(string); ok {
		userInfo["sub"] = sub
	}
	
	// Check for auth service User_type field (capital U, capital T)
	if userType, ok := claims["User_type"].(string); ok {
		userInfo["user_type"] = userType
	}
	
	// Copy realm_access for role extraction
	if realmAccess, ok := claims["realm_access"].(map[string]interface{}); ok {
		userInfo["realm_access"] = realmAccess
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
		
		// Log the authorization check
		fmt.Printf("[AuthorizeRoles] Required roles: %v, User role: %s\n", roles, userRole)
		
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
			fmt.Printf("[AuthorizeRoles] FORBIDDEN - Required roles: %v, User role: %s\n", roles, userRole)
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		
		fmt.Printf("[AuthorizeRoles] AUTHORIZED - User role: %s\n", userRole)
		c.Next()
	}
}
