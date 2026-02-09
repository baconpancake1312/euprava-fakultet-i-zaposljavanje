package repositories

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type University struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name            string             `bson:"name" json:"name" validate:"required"`
	Location        string             `bson:"location" json:"location"`
	FoundationYear  int                `bson:"foundation_year" json:"foundation_year"`
	StudentCount    int                `bson:"student_count" json:"student_count"`
	StaffCount      int                `bson:"staff_count" json:"staff_count"`
	Accreditation   string             `bson:"accreditation" json:"accreditation"`
	OfferedPrograms []string           `bson:"offered_programs" json:"offered_programs"`
}

type Department struct {
	ID       primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Name     string               `bson:"name" json:"name" validate:"required"`
	Head     primitive.ObjectID   `bson:"head" json:"head"`
	MajorIDs []primitive.ObjectID `bson:"major_ids,omitempty" json:"major_ids,omitempty"`
	StaffIDs []primitive.ObjectID `bson:"staff,omitempty" json:"staff,omitempty"`
}
type Major struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Name         string              `bson:"name" json:"name"`
	Subjects     []Subject           `bson:"subjects,omitempty" json:"subjects,omitempty"`
	DepartmentID *primitive.ObjectID `bson:"department_id,omitempty" json:"department_id,omitempty"`
}
type Subject struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name" validate:"required"`
	MajorID     primitive.ObjectID `bson:"major_id,omitempty" json:"major_id,omitempty"`
	ProfessorID primitive.ObjectID `bson:"professor_id,omitempty" json:"professor_id,omitempty"`
	Year        int                `bson:"year" json:"year"`
	HasPassed   bool               `bson:"has_passed,omitempty" json:"has_passed,omitempty"`
}
