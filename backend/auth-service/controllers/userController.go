package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"

	"github.com/gin-gonic/gin"

	"backend/database"

	helper "backend/helpers"
	"backend/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

var userCollection *mongo.Collection = database.OpenCollection(database.Client, "user")
var validate = helper.CustomValidator()
var SECRET_KEY string = os.Getenv("SECRET_KEY")

func HashPassword(password string) string {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		log.Panic(err)
	}

	return string(bytes)
}

func GetLoggedInUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		var user models.User
		err := userCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
			return
		}

		c.JSON(http.StatusOK, user)
	}
}

func VerifyPassword(userPassword string, providedPassword string) (bool, string) {
	err := bcrypt.CompareHashAndPassword([]byte(userPassword), []byte(providedPassword))
	check := true
	msg := ""

	if err != nil {
		msg = fmt.Sprintf("login or passowrd is incorrect")
		check = false
	}

	return check, msg
}

func Register() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		var user models.User
		l := log.New(gin.DefaultWriter, "User controller: ", log.LstdFlags)
		l.Println(c.GetString("Authorization"))

		if err := c.BindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Use custom validator with user type validation
		validationErr := validate.Struct(user)
		if validationErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}

		// Check for existing user
		filter := bson.M{
			"$or": []bson.M{
				{"email": user.Email},
				{"phone": user.Phone},
			},
		}

		count, err := userCollection.CountDocuments(ctx, filter)
		if err != nil {
			l.Println("Error occurred while checking for email or phone number:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while checking for the email or phone number"})
			return
		}

		if count > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "this email or phone number already exists"})
			return
		}

		// Hash password
		password := HashPassword(*user.Password)
		user.Password = &password

		// Set timestamps and IDs
		user.Created_at = time.Now()
		user.Updated_at = time.Now()
		user.ID = primitive.NewObjectID()
		user.User_id = user.ID.Hex()

		// Generate tokens
		token, refreshToken, err := helper.GenerateAllTokens(
			*user.Email,
			*user.First_name,
			*user.Last_name,
			string(user.User_type),
			user.User_id,
		)
		if err != nil {
			l.Println("Error generating tokens:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error generating tokens"})
			return
		}

		user.Token = &token
		user.Refresh_token = &refreshToken

		// Insert user into auth service
		resultInsertionNumber, insertErr := userCollection.InsertOne(ctx, user)
		if insertErr != nil {
			l.Println("Error inserting user:", insertErr.Error())
			c.JSON(http.StatusInternalServerError, gin.H{"error": insertErr.Error()})
			return
		}

		isRegisteredInOthers := false
		// Register in appropriate services based on user type
		go func() {
			err := RegisterInAppropriateServices(&user)
			if err != nil {
				isRegisteredInOthers = false
				l.Printf("Error registering user in services: %v", err)
			} else {
				isRegisteredInOthers = true
			}

		}()

		c.JSON(http.StatusCreated, gin.H{
			"message":                        "User registered successfully",
			"user_id":                        user.User_id,
			"user_type":                      user.User_type,
			"result":                         resultInsertionNumber,
			"registered for other services:": isRegisteredInOthers,
		})
	}
}

// RegisterInAppropriateServices registers user in relevant services
func RegisterInAppropriateServices(user *models.User) error {
	var errors []error

	// Register in university service for academic users
	if models.IsAcademicUser(user.User_type) {
		if err := RegisterIntoUni(user); err != nil {
			errors = append(errors, fmt.Errorf("university service: %v", err))
		} else {
			// Update status
			updateUserServiceStatus(user.User_id, "university_profile_created", true)
		}
	}

	// Register in employment service for employment-related users
	if models.IsEmploymentUser(user.User_type) {
		if err := RegisterIntoEmployment(user); err != nil {
			errors = append(errors, fmt.Errorf("employment service: %v", err))
		} else {
			// Update status
			updateUserServiceStatus(user.User_id, "employment_profile_created", true)
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("registration errors: %v", errors)
	}

	return nil
}

// Update user service registration status
func updateUserServiceStatus(userID, field string, value bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"user_id": userID}
	update := bson.M{"$set": bson.M{field: value}}

	userCollection.UpdateOne(ctx, filter, update)
}

func RegisterIntoUni(user *models.User) error {

	jsonData, err := json.Marshal(user)
	if err != nil {
		return err
	}

	var url string
	switch user.User_type {
	case models.StudentType:
		url = "http://university-service:8088/students/create"
	case models.ProfessorType:
		url = "http://university-service:8088/professors/create"
	case models.AdministratorType:
		url = "http://university-service:8088/admins/create"
	case models.StudentServiceType:
		url = "http://university-service:8088/student-service/create"
	default:
		return fmt.Errorf("unsupported user type for university service: %s", user.User_type)
	}

	// Get service token for auth-service
	token, err := getServiceToken("auth-service")
	if err != nil {
		return fmt.Errorf("failed to get service token: %v", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to register user in university service, status: %d", resp.StatusCode)
	}
	return nil
}

// RegisterIntoEmployment registers user in employment service
func RegisterIntoEmployment(user *models.User) error {
	jsonData, err := json.Marshal(user)
	if err != nil {
		return err
	}

	var url string
	switch user.User_type {
	case models.StudentType, models.CandidateType:
		url = "http://employment-service:8089/candidates"
	case models.EmployerType:
		url = "http://employment-service:8089/employers"
	default:
		return fmt.Errorf("unsupported user type for employment service: %s", user.User_type)
	}

	// Get service token for auth-service
	token, err := getServiceToken("auth-service")
	if err != nil {
		return fmt.Errorf("failed to get service token: %v", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to register user in employment service, status: %d", resp.StatusCode)
	}
	return nil
}

// DeleteFromUni deletes the user from the university service based on their role
func DeleteFromUni(user *models.User) error {
	var url string
	switch user.User_type {
	case models.StudentType:
		url = "http://university-service:8088/students/" + user.User_id
	case models.ProfessorType:
		url = "http://university-service:8088/professors/" + user.User_id
	case models.AdministratorType:
		url = "http://university-service:8088/administrators/" + user.User_id
	case models.StudentServiceType:
		url = "http://university-service:8088/assistants/" + user.User_id
	default:
		return fmt.Errorf("unsupported user type for university service delete: %s", user.User_type)
	}

	token, err := getServiceToken("auth-service")
	if err != nil {
		return fmt.Errorf("failed to get service token: %v", err)
	}

	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("failed to delete user in university service, status: %d", resp.StatusCode)
	}
	return nil
}

func Login() gin.HandlerFunc {
	return func(c *gin.Context) {
		fmt.Println("Request headers:", c.Errors)
		var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
		var user models.User
		var foundUser models.User

		if err := c.BindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		err := userCollection.FindOne(ctx, bson.M{"email": user.Email}).Decode(&foundUser)
		defer cancel()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		passwordIsValid, _ := VerifyPassword(*foundUser.Password, *user.Password)
		defer cancel()
		if !passwordIsValid {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Incorrect password"})
			return
		}

		if foundUser.Email == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User not found"})
			return
		}

		token, refreshToken, _ := helper.GenerateAllTokens(*foundUser.Email, *foundUser.First_name, *foundUser.Last_name, string(foundUser.User_type), foundUser.User_id)

		helper.UpdateAllTokens(token, refreshToken, foundUser.User_id)
		err = userCollection.FindOne(ctx, bson.M{"user_id": foundUser.User_id}).Decode(&foundUser)

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"user":          foundUser,
			"token":         token,
			"refresh_token": refreshToken,
		})
	}
}

func Logout() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("userID", "")
		c.JSON(http.StatusOK, gin.H{"message": "User logged out successfully"})
	}
}

func GetUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userId := c.Param("user_id")

		if err := helper.MatchUserTypeToUid(c, userId); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)

		var user models.User

		err := userCollection.FindOne(ctx, bson.M{"user_id": userId}).Decode(&user)
		defer cancel()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, user)

	}

}

func GetUsers(c *gin.Context) {
	l := log.New(gin.DefaultWriter, "User Controller ", log.LstdFlags)
	authHeader := c.Request.Header["Authorization"]

	if len(authHeader) == 0 {
		c.JSON(http.StatusUnauthorized, "No header")
		return
	}
	authString := strings.Join(authHeader, "")
	tokenString := strings.Split(authString, "Bearer ")[1]

	if len(tokenString) == 0 {
		c.JSON(http.StatusUnauthorized, "Token empty")
		return
	}

	token, err := jwt.ParseWithClaims(tokenString, jwt.MapClaims{}, func(token *jwt.Token) (interface{}, error) {
		l.Println("Parsing token..")
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("invalid signing method")
		}
		return []byte(SECRET_KEY), nil
	})

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	l.Println("Extract the claims from the parsed token")
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		l.Println("Token invalid")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token invalid"})
		return
	}

	parsedToken, _, err := new(jwt.Parser).ParseUnverified(tokenString, jwt.MapClaims{})
	if err != nil {
		l.Println("Error decoding token without verification:", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "error decoding token"})
		return
	}

	l.Println("Token claims:", parsedToken.Claims)

	l.Println("Retrieving user id..")
	userID, ok := claims["Uid"].(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user ID not found in token"})
		return
	}

	var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)

	var user models.User
	userCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&user)
	defer cancel()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user_id": userID, "user": user})
}
func UpdateUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("user_id")
		if userID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "user_id parameter is required"})
			return
		}

		var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		var userUpdate models.User
		if err := c.BindJSON(&userUpdate); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		update := bson.M{}
		if userUpdate.First_name != nil {
			update["first_name"] = userUpdate.First_name
		}
		if userUpdate.Last_name != nil {
			update["last_name"] = userUpdate.Last_name
		}
		if userUpdate.Email != nil {
			update["email"] = userUpdate.Email
		}
		if userUpdate.Phone != nil {
			update["phone"] = userUpdate.Phone
		}
		if userUpdate.Date_of_birth != nil {
			update["date_of_birth"] = userUpdate.Date_of_birth
		}
		if userUpdate.Password != nil && *userUpdate.Password != "" {
			hashedPassword := HashPassword(*userUpdate.Password)
			update["password"] = hashedPassword
		}
		if userUpdate.User_type != "" {
			update["user_type"] = userUpdate.User_type
		}
		update["updated_at"] = time.Now()

		if len(update) == 1 { // only updated_at
			c.JSON(http.StatusBadRequest, gin.H{"error": "no valid fields to update"})
			return
		}

		filter := bson.M{"user_id": userID}
		result, err := userCollection.UpdateOne(
			ctx,
			filter,
			bson.M{"$set": update},
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		// If not found by user_id, try by _id (client may send MongoDB ObjectID hex)
		if result.MatchedCount == 0 {
			objectID, err := primitive.ObjectIDFromHex(userID)
			if err == nil {
				filter = bson.M{"_id": objectID}
				result, err = userCollection.UpdateOne(ctx, filter, bson.M{"$set": update})
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
			}
		}
		if result.MatchedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "user updated successfully"})
	}
}

// DeleteUser deletes a user from the auth service and from university/employment services by role
func DeleteUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("user_id")
		if userID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "user_id parameter is required"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		l := log.New(gin.DefaultWriter, "User controller: ", log.LstdFlags)

		var user models.User
		err := userCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&user)
		if err != nil {
			// Try by _id (MongoDB ObjectID hex)
			objectID, parseErr := primitive.ObjectIDFromHex(userID)
			if parseErr != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
				return
			}
			err = userCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
				return
			}
		}
		var uniErr error
		var uniDone chan struct{}
		// Delete from university service if user is academic (same ID used there)
		// Async delete to avoid blocking the main thread
		// TODO: Implement the same for employment service
		if models.IsAcademicUser(user.User_type) {
			uniDone = make(chan struct{})
			go func() {
				uniErr = DeleteFromUni(&user)
				close(uniDone)
			}()
		}

		// Delete from auth service
		filter := bson.M{"user_id": user.User_id}
		result, err := userCollection.DeleteOne(ctx, filter)
		if err != nil {
			l.Println("Error deleting user:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete user"})
			return
		}
		if result.DeletedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		if uniDone != nil {
			<-uniDone
			if uniErr != nil {
				l.Println("Error deleting user from university service:", uniErr)
				c.JSON(http.StatusMultiStatus, gin.H{"error": "failed to delete user from university service"})
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{"message": "user deleted successfully"})
	}
}

// GetValidUserTypes returns all valid user types
func GetValidUserTypes() gin.HandlerFunc {
	return func(c *gin.Context) {
		userTypes := models.ValidUserTypes()
		var typeStrings []string
		for _, userType := range userTypes {
			typeStrings = append(typeStrings, string(userType))
		}

		c.JSON(http.StatusOK, gin.H{
			"valid_user_types": typeStrings,
			"count":            len(typeStrings),
		})
	}
}

// GenerateServiceToken generates a token for service-to-service communication
func GenerateServiceToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		var request struct {
			ServiceName string `json:"service_name" binding:"required"`
			Password    string `json:"password" binding:"required"`
		}

		if err := c.BindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		// Find service account
		var serviceAccount models.User
		err := userCollection.FindOne(ctx, bson.M{
			"is_service_account": true,
			"service_name":       request.ServiceName,
		}).Decode(&serviceAccount)

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid service credentials"})
			return
		}

		// Verify password
		passwordIsValid, _ := VerifyPassword(*serviceAccount.Password, request.Password)
		if !passwordIsValid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid service credentials"})
			return
		}

		// Generate token
		token, refreshToken, err := helper.GenerateAllTokens(
			*serviceAccount.Email,
			*serviceAccount.First_name,
			*serviceAccount.Last_name,
			string(serviceAccount.User_type),
			serviceAccount.User_id,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token":         token,
			"refresh_token": refreshToken,
			"service_name":  serviceAccount.ServiceName,
		})
	}
}

// CreateServiceAccount creates a service account for inter-service communication
func CreateServiceAccount() gin.HandlerFunc {
	return func(c *gin.Context) {
		var request struct {
			ServiceName string `json:"service_name" binding:"required"`
			Password    string `json:"password" binding:"required"`
			UserType    string `json:"user_type" binding:"required"`
		}

		if err := c.BindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Validate user type is a service account type
		if !models.IsServiceAccount(models.UserType(request.UserType)) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid service account type"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		// Check if service account already exists
		count, err := userCollection.CountDocuments(ctx, bson.M{
			"is_service_account": true,
			"service_name":       request.ServiceName,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error checking existing service account"})
			return
		}

		if count > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "Service account already exists"})
			return
		}

		// Create service account
		hashedPassword := HashPassword(request.Password)
		serviceAccount := models.User{
			ID:               primitive.NewObjectID(),
			First_name:       &request.ServiceName,
			Last_name:        &request.ServiceName,
			Email:            &request.ServiceName,
			Password:         &hashedPassword,
			Phone:            &request.ServiceName,
			Address:          &request.ServiceName,
			User_type:        models.UserType(request.UserType),
			Created_at:       time.Now(),
			Updated_at:       time.Now(),
			User_id:          primitive.NewObjectID().Hex(),
			IsServiceAccount: true,
			ServiceName:      request.ServiceName,
		}

		// Generate tokens
		token, refreshToken, err := helper.GenerateAllTokens(
			*serviceAccount.Email,
			*serviceAccount.First_name,
			*serviceAccount.Last_name,
			string(serviceAccount.User_type),
			serviceAccount.User_id,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating tokens"})
			return
		}

		serviceAccount.Token = &token
		serviceAccount.Refresh_token = &refreshToken

		// Insert service account
		_, err = userCollection.InsertOne(ctx, serviceAccount)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating service account"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message":      "Service account created successfully",
			"service_name": serviceAccount.ServiceName,
			"user_id":      serviceAccount.User_id,
		})
	}
}

// getServiceToken retrieves a token for service-to-service communication
func getServiceToken(serviceName string) (string, error) {
	// Get service credentials from environment variables
	servicePassword := os.Getenv("_PASSWORD")
	if servicePassword == "" {
		return "", fmt.Errorf("service password not found for %s", serviceName)
	}

	// Make request to generate service token
	requestData := map[string]string{
		"service_name": serviceName,
		"password":     servicePassword,
	}

	jsonData, err := json.Marshal(requestData)
	if err != nil {
		return "", err
	}

	// For self-service token generation, we can call the endpoint directly
	// In a real scenario, this might be cached or retrieved from a secure store
	resp, err := http.Post("http://localhost:8080/service-token", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to get service token, status: %d", resp.StatusCode)
	}

	var tokenResponse struct {
		Token string `json:"token"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		return "", err
	}

	return tokenResponse.Token, nil
}
