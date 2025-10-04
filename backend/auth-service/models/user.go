package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID            primitive.ObjectID `bson:"_id"`
	First_name    *string            `json:"first_name" validate:"required,min=2,max=100"`
	Last_name     *string            `json:"last_name" validate:"required,min=2,max=100"`
	Email         *string            `json:"email" validate:"email,required"`
	Password      *string            `json:"password" validate:"required,min=8"`
	Phone         *string            `json:"phone" validate:"required"`
	Address       *string            `json:"address" validate:"required"`
	Token         *string            `json:"token"`
	User_type     UserType           `json:"user_type" validate:"required,usertype"`
	Refresh_token *string            `json:"refresh_token"`
	Created_at    time.Time          `json:"created_at"`
	Updated_at    time.Time          `json:"updated_at"`
	User_id       string             `json:"user_id"`

	// Service-specific registration status
	UniversityProfileCreated bool `json:"university_profile_created"`
	EmploymentProfileCreated bool `json:"employment_profile_created"`

	// Service account fields
	IsServiceAccount bool   `json:"is_service_account" bson:"is_service_account"`
	ServiceName      string `json:"service_name,omitempty" bson:"service_name,omitempty"`
}

type Student struct {
	User
	Major         string   `bson:"major" json:"major,omitempty"`
	Year          int      `bson:"year" json:"year,omitempty"`
	Scholarship   bool     `bson:"scholarship" json:"scholarship,omitempty"`
	HighschoolGPA float64  `bson:"highschool_gpa" json:"highschool_gpa,omitempty"`
	GPA           float64  `bson:"gpa" json:"gpa,omitempty"`
	ESBP          int      `bson:"esbp" json:"esbp,omitempty"`
	CVFile        string   `json:"cv_file,omitempty"`
	CVBase64      string   `json:"cv_base64,omitempty"`
	Skills        []string `json:"skills,omitempty"`
}
