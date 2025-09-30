package models

import (
	"encoding/json"
	"io"

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
	Notifications Notifications      `json:"notifications"`
}
type Employer struct {
	User
	Firm        string `json:"firm"`
	FirmAddress string `json:"firm_address"`
	FirmPhone   string `json:"firm_phone"`
}
type Candidate struct {
	User
	CV     string `json:"cv"` //fajl
	Skills string `json:"skills"`
}

type Student struct {
	User
	Scholarship   bool    `json:"scholarship"`
	AssignedDorm  string  `json:"assigned_dorm"`
	HighschoolGPA float64 `json:"highschool_gpa"`
	GPA           float64 `json:"gpa"`
	ESBP          int     `json:"esbp"`
	Year          int     `json:"year"`
}

type Application struct {
	Id          primitive.ObjectID `bson:"_id"`
	ApplicantId primitive.ObjectID `bson:"_applicant_id"`
	ListingId   primitive.ObjectID `bson:"listing_id"`
	Status      string             `json:"status"` //accepted / rejected / pending
}

type JobListing struct {
	Id           primitive.ObjectID `bson:"_id"`
	PosterId     primitive.ObjectID `bson:"_poster_id"`
	Position     string             `json:"position"`
	Description  string             `json:"description"`
	Student      *Student           `json:"student"`
	CreationDate string             `json:"creation_date"`
	ExpireDate   string             `json:"expire_date"`
	IsInternship bool               `json:"is_internship"`
}
type Notification struct {
	Id         primitive.ObjectID `bson:"_id"`
	UserId     primitive.ObjectID `bson:"_user_id"`
	Message    string             `json:"message"`
	Date       string             `json:"date"`
	ReadStatus bool               `json:"read_status"`
}

type Students []*Student
type Applications []*Application
type Notifications []*Notifications

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
