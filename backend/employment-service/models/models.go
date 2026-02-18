package models

import (
	"encoding/json"
	"io"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ApprovalStatus string

type UserType string
type Status string

const (
	StudentType       UserType = "STUDENT"
	AdministratorType UserType = "ADMIN"
	EmployerType      UserType = "EMPLOYER"
	CandidateType     UserType = "CANDIDATE"

	// Service account types
	AuthServiceType       UserType = "AUTH_SERVICE"
	UniversityServiceType UserType = "UNIVERSITY_SERVICE"
	EmploymentServiceType UserType = "EMPLOYMENT_SERVICE"

	Approved ApprovalStatus = "Approved"
	Rejected ApprovalStatus = "Rejected"
	Pending  ApprovalStatus = "Pending"
)

type User struct {
	ID          primitive.ObjectID `bson:"_id" json:"id"`
	FirstName   *string            `bson:"first_name" json:"first_name" validate:"required,min=2,max=100"`
	LastName    *string            `bson:"last_name" json:"last_name" validate:"required,min=2,max=100"`
	Email       *string            `bson:"email" json:"email" validate:"required,email"`
	Password    *string            `bson:"password" json:"password" validate:"required,min=8"`
	Phone       *string            `bson:"phone" json:"phone" validate:"required"`
	Address     *string            `bson:"address" json:"address" validate:"required"`
	DateOfBirth time.Time          `bson:"date_of_birth" json:"date_of_birth"`
	JMBG        *string            `bson:"jmbg" json:"jmbg" validate:"required,len=13"`
	UserType    UserType           `bson:"user_type" json:"user_type"`
}

type Employer struct {
	User
	FirmName       string    `bson:"firm_name" json:"firm_name"`
	PIB            string    `bson:"pib" json:"pib"`
	MatBr          string    `bson:"maticni_broj" json:"maticni_broj"`
	Delatnost      string    `bson:"delatnost" json:"delatnost"`
	FirmAddress    string    `bson:"firm_address" json:"firm_address"`
	FirmPhone      string    `bson:"firm_phone" json:"firm_phone"`
	ApprovalStatus string    `bson:"approval_status" json:"approval_status"`
	ApprovedAt     time.Time `bson:"approved_at" json:"approved_at"`
	ApprovedBy     string    `bson:"approved_by" json:"approved_by"`
}

type Company struct {
	ID          primitive.ObjectID `bson:"_id" json:"id"`
	EmployerId  primitive.ObjectID `bson:"employer_id" json:"employer_id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	Website     string             `bson:"website" json:"website"`
	Industry    string             `bson:"industry" json:"industry"`
	Size        string             `bson:"size" json:"size"`
	Founded     int                `bson:"founded" json:"founded"`
	Logo        string             `bson:"logo" json:"logo"`
	Address     string             `bson:"address" json:"address"`
	Phone       string             `bson:"phone" json:"phone"`
	Email       string             `bson:"email" json:"email"`
	PIB         string             `bson:"pib" json:"pib"`
	MatBr       string             `bson:"maticni_broj" json:"maticni_broj"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

type Candidate struct {
	User
	ID            primitive.ObjectID `bson:"_id" json:"id"`
	Major         string             `bson:"major" json:"major,omitempty"`
	Year          int                `bson:"year" json:"year,omitempty"`
	Scholarship   bool               `bson:"scholarship" json:"scholarship,omitempty"`
	HighschoolGPA float64            `bson:"highschool_gpa" json:"highschool_gpa,omitempty"`
	GPA           float64            `bson:"gpa" json:"gpa,omitempty"`
	ESBP          int                `bson:"esbp" json:"esbp,omitempty"`
	CVFile        string             `json:"cv_file,omitempty"`
	CVBase64      string             `json:"cv_base64,omitempty"`
	Skills        []string           `json:"skills,omitempty"`
}

type JobListing struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PosterId       primitive.ObjectID `bson:"poster_id" json:"poster_id"`
	PosterName     string             `bson:"poster_name,omitempty" json:"poster_name,omitempty"`
	Position       string             `bson:"position" json:"position"`
	Description    string             `bson:"description" json:"description"`
	CreatedAt      time.Time          `bson:"created_at,omitempty" json:"created_at"`
	ExpireAt       time.Time          `bson:"expire_at,omitempty" json:"expire_at"`
	IsInternship   bool               `bson:"is_internship" json:"is_internship"`
	ApprovalStatus ApprovalStatus     `bson:"approval_status" json:"approval_status"`
	ApprovedAt     time.Time          `bson:"approved_at,omitempty" json:"approved_at"`
	ApprovedBy     string             `bson:"approved_by,omitempty" json:"approved_by"`
}

type Application struct {
	ID          primitive.ObjectID `bson:"_id" json:"id"`
	ApplicantId primitive.ObjectID `bson:"applicant_id" json:"applicant_id"`
	ListingId   primitive.ObjectID `bson:"listing_id" json:"listing_id"`
	Status      string             `bson:"status" json:"status"`
	SubmittedAt time.Time          `bson:"submitted_at" json:"submitted_at"`
}

type UnemployedRecord struct {
	ID         primitive.ObjectID `bson:"_id" json:"id"`
	UserId     primitive.ObjectID `bson:"user_id" json:"user_id"`
	Status     string             `bson:"status" json:"status"`
	Registered time.Time          `bson:"registered" json:"registered"`
	Updated    time.Time          `bson:"updated" json:"updated"`
	Office     string             `bson:"office" json:"office"`
}

type Document struct {
	ID        primitive.ObjectID `bson:"_id" json:"id"`
	RequestId primitive.ObjectID `bson:"request_id" json:"request_id"`
	Name      string             `bson:"name" json:"name"`
	FilePath  string             `bson:"file_path" json:"file_path"`
	Uploaded  time.Time          `bson:"uploaded" json:"uploaded"`
}

type Applications []*Application

func (o *Applications) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(o)
}
