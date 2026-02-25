package repositories

import (
	"encoding/json"
	"io"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	FirstName   *string   `json:"first_name" validate:"required,min=2,max=100"`
	LastName    *string   `json:"last_name" validate:"required,min=2,max=100"`
	Email       *string   `json:"email" validate:"required,email"`
	Password    *string   `json:"password" validate:"required,min=8"`
	Phone       *string   `json:"phone" validate:"required"`
	Address     *string   `json:"address" validate:"required"`
	DateOfBirth time.Time `bson:"date_of_birth" json:"date_of_birth"`
	JMBG        string    `json:"jmbg" validate:"required,len=13"`
	UserType    UserType  `bson:"user_type" json:"user_type"`
}
type StudentService struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name          string             `bson:"name" json:"name" validate:"required"`
	Department    string             `bson:"department" json:"department"`
	EmployeeCount int                `bson:"employee_count" json:"employee_count"`
}

type Administrator struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Position       string             `bson:"position" json:"position"`
	StudentService StudentService     `bson:"student_service" json:"student_service"`
}

type Professor struct {
	ID primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	User
	Subjects []Subject `bson:"subjects" json:"subjects"`
}

type Assistant struct {
	ID primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	User
	Professor Professor `bson:"professor" json:"professor"`
	Subjects  []Subject `bson:"subjects,omitempty" json:"subjects,omitempty"`
}

type Student struct {
	User
	ID            primitive.ObjectID `bson:"_id" json:"id"`
	MajorID       primitive.ObjectID `bson:"major_id" json:"major_id,omitempty"`
	Year          int                `bson:"year" json:"year,omitempty"`
	HighschoolGPA float64            `bson:"highschool_gpa" json:"highschool_gpa,omitempty"`
	GPA           float64            `bson:"gpa" json:"gpa"`
	CVFile        string             `json:"cv_file,omitempty"`
	CVBase64      string             `json:"cv_base64,omitempty"`
	Skills        []string           `json:"skills,omitempty"`
	Subjects      []Subject          `json:"subjects,omitempty"`
	Graduated     bool               `bson:"graduated" json:"graduated,omitempty"`
}

type TuitionPayment struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	StudentID primitive.ObjectID `bson:"student_id" json:"student_id"`
	Amount    float64            `bson:"amount" json:"amount"`
	Date      time.Time          `bson:"date" json:"date"`
}

type Notification struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title          string             `json:"title" binding:"required"`
	Content        string             `json:"content"`
	RecipientType  string             `json:"recipient_type" binding:"required"` // "id", "role", "department", "major"
	RecipientValue string             `json:"recipient_value" binding:"required"`
	RecipientID    primitive.ObjectID `bson:"recipient_id,omitempty" json:"recipient_id,omitempty"` // User ID this notification is for
	CreatedAt      time.Time          `bson:"created_at" json:"created_at"`
	Seen           bool               `bson:"seen" json:"seen"`
}

type InternshipApplication struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ListingID   primitive.ObjectID `bson:"listing_id,omitempty" json:"listing_id"`
	ApplicantID primitive.ObjectID `bson:"applicant_id,omitempty" json:"applicant_id"`
	Status      Status             `bson:"status" json:"status"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
}
type Internship struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Field     string             `bson:"field" json:"field,omitempty"`
	PosterId  primitive.ObjectID `bson:"poster_id,omitempty" json:"poster_id"`
	ExpireAt  time.Time          `bson:"expire_at" json:"expire_at"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

type GraduationRequest struct {
	ID          primitive.ObjectID `bson:"_id" json:"id"`
	StudentID   primitive.ObjectID `bson:"student_id,omitempty" json:"student_id,omitempty"`
	RequestedAt time.Time          `bson:"requested_at,omitempty" json:"requested_at,omitempty"`
	Status      Status             `bson:"status,omitempty" json:"status,omitempty"`
	Comments    string             `bson:"comments,omitempty" json:"comments,omitempty"`
}
type Notifications []*Notification
type InternshipApplications []*InternshipApplication
type Internships []*Internship

func (n *Notifications) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(n)
}

func (n *Notification) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(n)
}

func (n *Notification) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(n)
}
func (ia *InternshipApplication) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(ia)
}
func (i *Internships) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(i)
}
func (u *University) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(u)
}

func (d *Department) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(d)
}

func (p *Professor) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(p)
}

func (a *Assistant) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(a)
}

func (c *Subject) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(c)
}

func (ss *StudentService) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(ss)
}

func (adm *Administrator) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(adm)
}

func (u *User) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(u)
}

func (s *Student) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(s)
}

func (u *University) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(u)
}

func (d *Department) FromJSON(r io.Reader) error {
	decoder := json.NewDecoder(r)
	return decoder.Decode(d)
}

func (p *Professor) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(p)
}

func (a *Assistant) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(a)
}

func (c *Subject) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(c)
}

func (ss *StudentService) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(ss)
}

func (adm *Administrator) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(adm)
}

func (u *User) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(u)
}

func (s *Student) FromJSON(r io.Reader) error {
	d := json.NewDecoder(r)
	return d.Decode(s)
}
