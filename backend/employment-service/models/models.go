package models

import (
	"encoding/json"
	"io"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
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

type Candidate struct {
	User
	CVFile   string   `bson:"cv_file" json:"cv_file"`
	CVBase64 string   `bson:"cv_base64" json:"cv_base64"`
	Skills   []string `bson:"skills" json:"skills"`
}

type JobListing struct {
	ID             primitive.ObjectID `bson:"_id" json:"id"`
	PosterId       primitive.ObjectID `bson:"poster_id" json:"poster_id"`
	Position       string             `bson:"position" json:"position"`
	Description    string             `bson:"description" json:"description"`
	CreatedAt      time.Time          `bson:"created_at" json:"created_at"`
	ExpireAt       time.Time          `bson:"expire_at" json:"expire_at"`
	IsInternship   bool               `bson:"is_internship" json:"is_internship"`
	ApprovalStatus string             `bson:"approval_status" json:"approval_status"`
	ApprovedAt     time.Time          `bson:"approved_at" json:"approved_at"`
	ApprovedBy     string             `bson:"approved_by" json:"approved_by"`
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
