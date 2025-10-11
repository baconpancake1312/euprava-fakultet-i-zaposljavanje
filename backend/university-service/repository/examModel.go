package repositories

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ExamSession represents an exam created by a professor
type ExamSession struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Subject     Subject            `bson:"subject" json:"subject"`
	Professor   Professor          `bson:"professor" json:"professor"`
	ExamDate    time.Time          `bson:"exam_date" json:"exam_date"`
	Location    string             `bson:"location" json:"location"`
	MaxStudents int                `bson:"max_students" json:"max_students"`
	Status      string             `bson:"status" json:"status"` // "scheduled", "completed", "cancelled"
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
}
type CreateExamSessionRequest struct {
	SubjectID   primitive.ObjectID `json:"subject_id" validate:"required"`
	ProfessorID primitive.ObjectID `json:"professor_id" validate:"required"`
	ExamDate    time.Time          `json:"exam_date" validate:"required"`
	Location    string             `json:"location" validate:"required"`
	MaxStudents int                `json:"max_students" validate:"required,min=1"`
}

type CreateExamRegistrationRequest struct {
	StudentID     primitive.ObjectID `json:"student_id" validate:"required"`
	ExamSessionID primitive.ObjectID `json:"exam_session_id" validate:"required"`
}

type CreateExamGradeRequest struct {
	StudentID     primitive.ObjectID `json:"student_id" validate:"required"`
	ExamSessionID primitive.ObjectID `json:"exam_session_id" validate:"required"`
	Grade         int                `json:"grade" validate:"required,min=5,max=10"`
	Comments      string             `json:"comments,omitempty"`
}

// ExamRegistration represents a student's registration for an exam
type ExamRegistration struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Student       Student            `bson:"student" json:"student"`
	ExamSessionID primitive.ObjectID `bson:"exam_session_id" json:"exam_session_id"`
	RegisteredAt  time.Time          `bson:"registered_at" json:"registered_at"`
	Status        string             `bson:"status" json:"status"` // "registered", "attended", "missed"
}

// ExamGrade represents a student's grade for an exam
type ExamGrade struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Student     Student            `bson:"student" json:"student"`
	ExamSession `bson:"exam_session" json:"exam_session"`
	Grade       int       `bson:"grade" json:"grade"` // 5-10 scale
	Passed      bool      `bson:"passed" json:"passed"`
	GradedAt    time.Time `bson:"graded_at" json:"graded_at"`
	GradedBy    Professor `bson:"graded_by" json:"graded_by"`
	Comments    string    `bson:"comments" json:"comments,omitempty"`
}

// DEPRECATED: Legacy Exam struct - keeping for backward compatibility but will be removed in future versions
// Use ExamSession, ExamRegistration, and ExamGrade instead
type Exam struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Student  Student            `bson:"student" json:"student"`
	Subject  Subject            `bson:"subject" json:"subject"`
	ExamDate time.Time          `bson:"exam_date" json:"exam_date"`
	Status   string             `bson:"status" json:"status"`
}
