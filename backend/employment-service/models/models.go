package models

import (
	"encoding/json"
	"io"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID            primitive.ObjectID `bson:"_id" json:"id"`
	FirstName     *string            `json:"first_name" validate:"required,min=2,max=100"`
	LastName      *string            `json:"last_name" validate:"required,min=2,max=100"`
	Email         *string            `json:"email" validate:"required,email"`
	Password      *string            `json:"password" validate:"required,min=8"`
	Phone         *string            `json:"phone" validate:"required"`
	Address       *string            `json:"address" validate:"required"`
	JMBG          *string            `json:"jmbg" validate:"required,len=13"`
	Notifications []*Notification    `json:"notifications,omitempty"`
}

type Employer struct {
	User
	FirmName    string `json:"firm_name"`
	PIB         string `json:"pib"`
	MatBr       string `json:"maticni_broj"`
	Delatnost   string `json:"delatnost"`
	FirmAddress string `json:"firm_address"`
	FirmPhone   string `json:"firm_phone"`
}

type Candidate struct {
	User
	CVFile   string   `json:"cv_file"`
	CVBase64 string   `json:"cv_base64"`
	Skills   []string `json:"skills"`
}

type Student struct {
	User
	Scholarship   bool    `json:"scholarship"`
	AssignedDorm  string  `json:"assigned_dorm"`
	HighschoolGPA float64 `json:"highschool_gpa"`
	GPA           float64 `json:"gpa"`
	ECTS          int     `json:"ects"`
	Year          int     `json:"year"`
}

type JobListing struct {
	ID          primitive.ObjectID `bson:"_id" json:"id"`
	PosterId    primitive.ObjectID `bson:"poster_id"`
	Position    string             `json:"position"`
	Description string             `json:"description"`
	CreatedAt   time.Time          `json:"created_at"`
	ExpireAt    time.Time          `json:"expire_at"`
	IsInternship bool              `json:"is_internship"`
}

type Application struct {
	ID          primitive.ObjectID `bson:"_id" json:"id"`
	ApplicantId primitive.ObjectID `bson:"applicant_id"`
	ListingId   primitive.ObjectID `bson:"listing_id"`
	Status      string             `json:"status"`
	SubmittedAt time.Time          `json:"submitted_at"`
}

type Notification struct {
	ID         primitive.ObjectID `bson:"_id" json:"id"`
	UserId     primitive.ObjectID `bson:"user_id"`
	Message    string             `json:"message"`
	Date       time.Time          `json:"date"`
	ReadStatus bool               `json:"read_status"`
}

type UnemployedRecord struct {
	ID         primitive.ObjectID `bson:"_id" json:"id"`
	UserId     primitive.ObjectID `bson:"user_id"`
	Status     string             `json:"status"`
	Registered time.Time          `json:"registered"`
	Updated    time.Time          `json:"updated"`
	Office     string             `json:"office"`
}

type Benefit struct {
	ID        primitive.ObjectID `bson:"_id" json:"id"`
	UserId    primitive.ObjectID `bson:"user_id"`
	Amount    float64            `json:"amount"`
	StartDate time.Time          `json:"start_date"`
	EndDate   time.Time          `json:"end_date"`
	Status    string             `json:"status"`
}

type Request struct {
	ID        primitive.ObjectID   `bson:"_id" json:"id"`
	UserId    primitive.ObjectID   `bson:"user_id"`
	Type      string               `json:"type"`
	Status    string               `json:"status"`
	CreatedAt time.Time            `json:"created_at"`
	UpdatedAt time.Time            `json:"updated_at"`
	Documents []primitive.ObjectID `json:"documents"`
}

type Document struct {
	ID        primitive.ObjectID `bson:"_id" json:"id"`
	RequestId primitive.ObjectID `bson:"request_id"`
	Name      string             `json:"name"`
	FilePath  string             `json:"file_path"`
	Uploaded  time.Time          `json:"uploaded"`
}

type Students []*Student
type Applications []*Application
type Notifications []*Notification

func (o *Students) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(o)
}

func (o *Applications) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(o)
}

func (o *Notifications) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(o)
}
