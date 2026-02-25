package repositories

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ExamPeriod defines a date range during which exams can be scheduled.
// Optionally scoped to a major (MajorID nil = applies to all majors).
type ExamPeriod struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Name         string             `bson:"name" json:"name"`                           // e.g. "Winter exam period 2025"
	StartDate    time.Time          `bson:"start_date" json:"start_date"`                // inclusive
	EndDate      time.Time          `bson:"end_date" json:"end_date"`                     // inclusive
	AcademicYear int                `bson:"academic_year" json:"academic_year"`          // e.g. 2025
	Semester     int                `bson:"semester" json:"semester"`                    // 1 = first, 2 = second semester
	MajorID      *primitive.ObjectID `bson:"major_id,omitempty" json:"major_id,omitempty"` // nil = all majors
	IsActive     bool               `bson:"is_active" json:"is_active"`                 // only active periods accept new exams
	CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
}

// CreateExamPeriodRequest is the payload for creating an exam period.
type CreateExamPeriodRequest struct {
	Name         string              `json:"name" validate:"required"`
	StartDate    time.Time           `json:"start_date" validate:"required"`
	EndDate      time.Time           `json:"end_date" validate:"required"`
	AcademicYear int                 `json:"academic_year"`
	Semester     int                 `json:"semester"` // 1 or 2
	MajorID      *primitive.ObjectID `json:"major_id,omitempty"`
	IsActive     bool                `json:"is_active"`
}

// ExamSession represents an exam created by a professor
type ExamSession struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Subject      Subject             `bson:"subject" json:"subject"`
	Professor    Professor           `bson:"professor" json:"professor"`
	ExamDate     time.Time           `bson:"exam_date" json:"exam_date"`
	ExamPeriodID *primitive.ObjectID `bson:"exam_period_id,omitempty" json:"exam_period_id,omitempty"` // period this exam was scheduled in
	Location     string              `bson:"location" json:"location"`
	MaxStudents  int                 `bson:"max_students" json:"max_students"`
	Status       ExamStatus          `bson:"status" json:"status"` // "scheduled", "completed", "cancelled"
	CreatedAt    time.Time           `bson:"created_at" json:"created_at"`
}
type ExamRegistration struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Student       Student            `bson:"student" json:"student"`
	ExamSessionID primitive.ObjectID `bson:"exam_session_id" json:"exam_session_id"`
	RegisteredAt  time.Time          `bson:"registered_at" json:"registered_at"`
	Status        ExamStatus         `bson:"status" json:"status"` // "registered", "attended", "missed"
}

// ExamGrade represents a student's grade for an exam
type ExamGrade struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Student            Student            `bson:"student" json:"student"`
	ExamRegistrationId primitive.ObjectID `bson:"exam_registration_id" json:"exam_registration_id"`
	ExamSessionId      primitive.ObjectID `bson:"exam_session_id,omitempty" json:"exam_session_id,omitempty"`
	SubjectId          primitive.ObjectID `bson:"subject_id,omitempty" json:"subject_id,omitempty"`
	Grade              int                `bson:"grade" json:"grade"` // 5-10 scale
	Passed             bool               `bson:"passed" json:"passed"`
	GradedAt           time.Time          `bson:"graded_at" json:"graded_at"`
	GradedBy           Professor          `bson:"graded_by" json:"graded_by"`
	Comments           string             `bson:"comments" json:"comments,omitempty"`
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
	StudentID          primitive.ObjectID `json:"student_id" validate:"required"`
	ExamRegistrationId primitive.ObjectID `json:"exam_registration_id" validate:"required"`
	Grade              int                `json:"grade" validate:"required,min=5,max=10"`
	Comments           string             `json:"comments,omitempty"`
}
