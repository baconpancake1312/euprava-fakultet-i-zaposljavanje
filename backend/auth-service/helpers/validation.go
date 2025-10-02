package helper

import (
	"backend/models"

	"github.com/go-playground/validator/v10"
)

// CustomValidator adds custom validation rules
func CustomValidator() *validator.Validate {
	validate := validator.New()

	// Register custom validation for user types
	validate.RegisterValidation("usertype", validateUserType)

	return validate
}

// validateUserType validates if the user type is valid
func validateUserType(fl validator.FieldLevel) bool {
	userType := fl.Field().String()
	return models.IsValidUserType(userType)
}
