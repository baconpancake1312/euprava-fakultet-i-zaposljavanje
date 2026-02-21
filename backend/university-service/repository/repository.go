package repositories

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"slices"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Repository struct {
	cli    *mongo.Client
	logger *log.Logger
}

func New(ctx context.Context, logger *log.Logger) (*Repository, error) {
	dburi := os.Getenv("MONGO_DB_URI")
	logger.Println("Initializing MongoDB client with URI:", dburi)

	client, err := mongo.NewClient(options.Client().ApplyURI(dburi))
	if err != nil {
		logger.Println("Error creating MongoDB client:", err)
		return nil, err
	}

	err = client.Connect(ctx)
	if err != nil {
		logger.Println("Error connecting to MongoDB:", err)
		return nil, err
	}

	logger.Println("Successfully connected to MongoDB")
	return &Repository{
		cli:    client,
		logger: logger,
	}, nil
}

func (r *Repository) Disconnect(ctx context.Context) error {
	r.logger.Println("Disconnecting MongoDB client...")
	err := r.cli.Disconnect(ctx)
	if err != nil {
		r.logger.Println("Error disconnecting MongoDB client:", err)
		return err
	}
	r.logger.Println("MongoDB client disconnected successfully")
	return nil
}

func (r *Repository) getCollection(collectionName string) *mongo.Collection {
	r.logger.Println("Accessing collection:", collectionName)
	db := r.cli.Database("universityDB")
	return db.Collection(collectionName)
}

func (r *Repository) CreateStudent(student *Student) error {
	r.logger.Println("Creating student:", student)
	student.GPA = 0.0

	collection := r.getCollection("student")
	_, err := collection.InsertOne(context.TODO(), student)
	if err != nil {
		r.logger.Println("Error inserting student:", err)
		return err
	}
	return nil
}

func (r *Repository) GetStudentByID(userID string) (*Student, error) {
	r.logger.Println("Fetching student by ID:", userID)
	collection := r.getCollection("student")
	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		r.logger.Println("Invalid student ID format:", err)
		return nil, err
	}
	var student Student
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&student)
	if err != nil {
		r.logger.Println("Error finding student:", err)
		return nil, err
	}
	r.logger.Println("Student found:", student)
	return &student, nil
}

func (r *Repository) UpdateStudent(student *Student) error {
	r.logger.Println("Updating student with ID:", student.ID.Hex())
	collection := r.getCollection("student")

	// Marshal the student struct to BSON to get correct field names
	// This handles embedded structs (User) and pointer fields correctly
	bsonData, err := bson.Marshal(student)
	if err != nil {
		r.logger.Println("Error marshaling student to BSON:", err)
		return err
	}

	// Unmarshal into a map to work with the fields
	var updateDoc bson.M
	err = bson.Unmarshal(bsonData, &updateDoc)
	if err != nil {
		r.logger.Println("Error unmarshaling BSON:", err)
		return err
	}

	// Remove the _id field as we don't want to update it
	delete(updateDoc, "_id")

	// Filter out nil values (unset pointer fields) but keep zero values for non-pointer fields
	// The controller already filters what should be updated, so if a field is present
	// (even with zero value), it should be included
	filteredDoc := bson.M{}
	for key, value := range updateDoc {
		// Skip nil values (unset pointer fields)
		if value == nil {
			continue
		}
		// Include all values (time.Time fields are included since they're not pointers)
		// The controller ensures only fields that should be updated are set on the struct
		filteredDoc[key] = value
	}

	// Explicitly ensure date_of_birth is included if it was set on the student
	// This handles the case where the date might not be in updateDoc due to zero value handling
	if !student.DateOfBirth.IsZero() {
		filteredDoc["date_of_birth"] = student.DateOfBirth
		r.logger.Printf("Explicitly including date_of_birth: %v", student.DateOfBirth)
	}

	// Only update if there are fields to update
	if len(filteredDoc) == 0 {
		r.logger.Println("No fields to update")
		return nil
	}

	r.logger.Println("Update document:", filteredDoc)
	result, err := collection.UpdateOne(
		context.TODO(),
		bson.M{"_id": student.ID},
		bson.M{"$set": filteredDoc},
	)
	if err != nil {
		r.logger.Println("Error updating student:", err)
		return err
	}
	if result.MatchedCount == 0 {
		r.logger.Println("No student found with ID:", student.ID.Hex())
		return fmt.Errorf("student not found")
	}
	r.logger.Printf("Student updated successfully. Matched: %d, Modified: %d", result.MatchedCount, result.ModifiedCount)
	return nil
}

func (r *Repository) DeleteStudent(userID string) error {
	r.logger.Println("Deleting student with ID:", userID)
	collection := r.getCollection("student")
	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		r.logger.Println("Invalid student ID format:", err)
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	if err != nil {
		r.logger.Println("Error deleting student:", err)
	}
	return err
}

func (r *Repository) DeleteDynamic(entityID string, entityType string) error {
	r.logger.Println("Deleting entity with ID:", entityID)
	collections := []string{"student", "professor", "assistant", "department", "university", "subjects", "majors", "exam_sessions", "exam_registrations", "exam_grades", "notifications", "internship_applications", "student_services", "administrators"}
	if !slices.Contains(collections, entityType) {
		return fmt.Errorf("invalid entity type: %s", entityType)
	}
	collection := r.getCollection(entityType)
	objectID, err := primitive.ObjectIDFromHex(entityID)
	if err != nil {
		r.logger.Println("Invalid "+entityType+" ID format:", err)
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	if err != nil {
		r.logger.Println("Error deleting "+entityType+":", err)
	}
	return err
}

func (r *Repository) CreateUniversity(university *University) error {
	r.logger.Println("Creating university:", university)
	collection := r.getCollection("university")
	result, err := collection.InsertOne(context.TODO(), university)
	if err != nil {
		r.logger.Println("Error inserting university:", err)
		return err
	}
	university.ID = result.InsertedID.(primitive.ObjectID)
	r.logger.Println("University created with ID:", university.ID.Hex())
	return nil
}

func (r *Repository) GetUniversityByID(universityID string) (*University, error) {
	r.logger.Println("Fetching university by ID:", universityID)
	collection := r.getCollection("university")
	objectID, err := primitive.ObjectIDFromHex(universityID)
	if err != nil {
		r.logger.Println("Invalid university ID format:", err)
		return nil, err
	}
	var university University
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&university)
	if err != nil {
		r.logger.Println("Error finding university:", err)
		return nil, err
	}
	r.logger.Println("University found:", university)
	return &university, nil
}

func (r *Repository) UpdateUniversity(university *University) error {
	r.logger.Println("Updating university with ID:", university.ID.Hex())
	collection := r.getCollection("university")
	_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": university.ID}, bson.M{"$set": university})
	if err != nil {
		r.logger.Println("Error updating university:", err)
	}
	return err
}

func (r *Repository) DeleteUniversity(universityID string) error {
	r.logger.Println("Deleting university with ID:", universityID)
	collection := r.getCollection("university")
	objectID, err := primitive.ObjectIDFromHex(universityID)
	if err != nil {
		r.logger.Println("Invalid university ID format:", err)
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	if err != nil {
		r.logger.Println("Error deleting university:", err)
	}
	return err
}
func (r *Repository) CreateDepartment(department *Department) error {
	r.logger.Println("Creating department:", department)
	collection := r.getCollection("department")
	result, err := collection.InsertOne(context.TODO(), department)
	if err != nil {
		r.logger.Println("Error inserting department:", err)
		return err
	}
	department.ID = result.InsertedID.(primitive.ObjectID)
	r.logger.Println("Department created with ID:", department.ID.Hex())
	return nil
}

func (r *Repository) GetDepartmentByID(departmentID string) (*Department, error) {
	r.logger.Println("Fetching department by ID:", departmentID)
	collection := r.getCollection("department")
	objectID, err := primitive.ObjectIDFromHex(departmentID)
	if err != nil {
		r.logger.Println("Invalid department ID format:", err)
		return nil, err
	}
	var department Department
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&department)
	if err != nil {
		r.logger.Println("Error finding department:", err)
		return nil, err
	}
	r.logger.Println("Department found:", department)
	return &department, nil
}

func (r *Repository) UpdateDepartment(department *Department) error {
	r.logger.Println("Updating department with ID:", department.ID.Hex())
	collection := r.getCollection("department")
	_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": department.ID}, bson.M{"$set": department})
	if err != nil {
		r.logger.Println("Error updating department:", err)
	}
	return err
}

func (r *Repository) DeleteDepartment(departmentID string) error {
	r.logger.Println("Deleting department with ID:", departmentID)
	collection := r.getCollection("department")
	objectID, err := primitive.ObjectIDFromHex(departmentID)
	if err != nil {
		r.logger.Println("Invalid department ID format:", err)
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	if err != nil {
		r.logger.Println("Error deleting department:", err)
	}
	return err
}

func (r *Repository) CreateProfessor(professor *Professor) error {
	r.logger.Println("Creating professor:", professor)
	collection := r.getCollection("professor")
	result, err := collection.InsertOne(context.TODO(), professor)
	if err != nil {
		r.logger.Println("Error inserting professor:", err)
		return err
	}
	professor.ID = result.InsertedID.(primitive.ObjectID)
	r.logger.Println("Professor created with ID:", professor.ID.Hex())
	return nil
}

func (r *Repository) GetProfessorByID(professorID string) (*Professor, error) {
	r.logger.Println("Fetching professor by ID:", professorID)
	collection := r.getCollection("professor")
	objectID, err := primitive.ObjectIDFromHex(professorID)
	if err != nil {
		r.logger.Println("Invalid professor ID format:", err)
		return nil, err
	}
	var professor Professor
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&professor)
	if err != nil {
		r.logger.Println("Error finding professor:", err)
		return nil, err
	}
	r.logger.Println("Professor found:", professor)
	return &professor, nil
}

func (r *Repository) UpdateProfessor(professor *Professor) error {
	r.logger.Println("Updating professor with ID:", professor.ID.Hex())

	// Get the current professor to compare subjects
	currentProfessor, err := r.GetProfessorByID(professor.ID.Hex())
	if err != nil {
		return fmt.Errorf("failed to get current professor: %w", err)
	}
	if currentProfessor == nil {
		return fmt.Errorf("professor not found")
	}

	// Create maps for easier lookup
	oldSubjectIDs := make(map[primitive.ObjectID]bool)
	for _, s := range currentProfessor.Subjects {
		oldSubjectIDs[s.ID] = true
	}

	newSubjectIDs := make(map[primitive.ObjectID]bool)
	for _, s := range professor.Subjects {
		newSubjectIDs[s.ID] = true
	}

	// Find subjects that were added (in new but not in old)
	addedSubjects := make([]primitive.ObjectID, 0)
	for subjectID := range newSubjectIDs {
		if !oldSubjectIDs[subjectID] {
			addedSubjects = append(addedSubjects, subjectID)
		}
	}

	// Find subjects that were removed (in old but not in new)
	removedSubjects := make([]primitive.ObjectID, 0)
	for subjectID := range oldSubjectIDs {
		if !newSubjectIDs[subjectID] {
			removedSubjects = append(removedSubjects, subjectID)
		}
	}

	subjectCollection := r.getCollection("subjects")

	// Add professor ID to newly added subjects' ProfessorIDs
	for _, subjectID := range addedSubjects {
		_, err = subjectCollection.UpdateOne(
			context.TODO(),
			bson.M{"_id": subjectID},
			bson.M{"$addToSet": bson.M{"professor_ids": professor.ID}},
		)
		if err != nil {
			r.logger.Printf("Warning: failed to add professor ID to subject %s: %v", subjectID.Hex(), err)
			// Continue with other subjects even if one fails
		}
	}

	// Remove professor ID from removed subjects' ProfessorIDs
	for _, subjectID := range removedSubjects {
		_, err = subjectCollection.UpdateOne(
			context.TODO(),
			bson.M{"_id": subjectID},
			bson.M{"$pull": bson.M{"professor_ids": professor.ID}},
		)
		if err != nil {
			r.logger.Printf("Warning: failed to remove professor ID from subject %s: %v", subjectID.Hex(), err)
			// Continue with other subjects even if one fails
		}
	}

	// Update department staff for added subjects
	for _, subjectID := range addedSubjects {
		if err := r.updateDepartmentStaffForSubject(subjectID, professor.ID, true); err != nil {
			r.logger.Printf("Warning: failed to add professor to department staff for subject %s: %v", subjectID.Hex(), err)
			// Continue with other subjects even if one fails
		}
	}

	// Update department staff for removed subjects
	// For each removed subject, check if professor has other subjects in the same department
	for _, subjectID := range removedSubjects {
		subject, err := r.GetSubjectByID(subjectID.Hex())
		if err != nil || subject == nil {
			continue
		}
		major, err := r.GetMajorByID(subject.MajorID)
		if err != nil || major == nil || major.DepartmentID == nil {
			continue
		}

		// Check if professor has other subjects in this department
		hasOtherSubjectsInDept := false
		for _, s := range professor.Subjects {
			subjMajor, err := r.GetMajorByID(s.MajorID)
			if err == nil && subjMajor != nil && subjMajor.DepartmentID != nil {
				if subjMajor.DepartmentID.Hex() == major.DepartmentID.Hex() {
					hasOtherSubjectsInDept = true
					break
				}
			}
		}

		// Only remove from department if no other subjects in this department
		if !hasOtherSubjectsInDept {
			if err := r.updateDepartmentStaffForSubject(subjectID, professor.ID, false); err != nil {
				r.logger.Printf("Warning: failed to remove professor from department staff for subject %s: %v", subjectID.Hex(), err)
				// Continue with other subjects even if one fails
			}
		}
	}

	// Update the professor
	collection := r.getCollection("professor")
	_, err = collection.UpdateOne(context.TODO(), bson.M{"_id": professor.ID}, bson.M{"$set": professor})
	if err != nil {
		r.logger.Println("Error updating professor:", err)
	}
	return err
}

func (r *Repository) DeleteProfessor(professorID string) error {
	r.logger.Println("Deleting professor with ID:", professorID)
	collection := r.getCollection("professor")
	objectID, err := primitive.ObjectIDFromHex(professorID)
	if err != nil {
		r.logger.Println("Invalid professor ID format:", err)
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	if err != nil {
		r.logger.Println("Error deleting professor:", err)
	}
	return err
}

func (r *Repository) CreateAssistant(assistant *Assistant) error {
	r.logger.Println("Creating assistant:", assistant)
	collection := r.getCollection("assistant")
	result, err := collection.InsertOne(context.TODO(), assistant)
	if err != nil {
		r.logger.Println("Error inserting assistant:", err)
		return err
	}
	assistant.ID = result.InsertedID.(primitive.ObjectID)
	r.logger.Println("Assistant created with ID:", assistant.ID.Hex())
	return nil
}

func (r *Repository) GetAssistantByID(assistantID string) (*Assistant, error) {
	r.logger.Println("Fetching assistant by ID:", assistantID)
	collection := r.getCollection("assistant")
	objectID, err := primitive.ObjectIDFromHex(assistantID)
	if err != nil {
		r.logger.Println("Invalid assistant ID format:", err)
		return nil, err
	}
	var assistant Assistant
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&assistant)
	if err != nil {
		r.logger.Println("Error finding assistant:", err)
		return nil, err
	}
	r.logger.Println("Assistant found:", assistant)
	return &assistant, nil
}

func (r *Repository) UpdateAssistant(assistant *Assistant) error {
	r.logger.Println("Updating assistant with ID:", assistant.ID.Hex())
	collection := r.getCollection("assistant")
	_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": assistant.ID}, bson.M{"$set": assistant})
	if err != nil {
		r.logger.Println("Error updating assistant:", err)
	}
	return err
}

func (r *Repository) DeleteAssistant(assistantID string) error {
	r.logger.Println("Deleting assistant with ID:", assistantID)
	collection := r.getCollection("assistant")
	objectID, err := primitive.ObjectIDFromHex(assistantID)
	if err != nil {
		r.logger.Println("Invalid assistant ID format:", err)
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	if err != nil {
		r.logger.Println("Error deleting assistant:", err)
	}
	return err
}

// CRUD operations for Course
func (r *Repository) CreateSubject(subject *Subject) error {
	collection := r.getCollection("subjects")
	result, err := collection.InsertOne(context.TODO(), subject)
	if err != nil {
		return err
	}
	subject.ID = result.InsertedID.(primitive.ObjectID)
	major, err := r.GetMajorByID(subject.MajorID)
	if err != nil {
		return err
	}
	major.Subjects = append(major.Subjects, *subject)
	err = r.UpdateMajor(major.ID, major)
	if err != nil {
		return err
	}
	for _, professorID := range subject.ProfessorIDs {
		professor, err := r.GetProfessorByID(professorID.Hex())
		if err != nil {
			return err
		}
		professor.Subjects = append(professor.Subjects, *subject)
		err = r.UpdateProfessor(professor)
		if err != nil {
			return err
		}
	}
	return nil
}

// updateDepartmentStaffForSubject updates the department's staff list based on a subject assignment/removal
func (r *Repository) updateDepartmentStaffForSubject(subjectID primitive.ObjectID, professorID primitive.ObjectID, add bool) error {
	// Get the subject to find its major
	subject, err := r.GetSubjectByID(subjectID.Hex())
	if err != nil {
		return fmt.Errorf("failed to get subject: %w", err)
	}
	if subject == nil {
		return fmt.Errorf("subject not found")
	}

	// Get the major to find its department
	major, err := r.GetMajorByID(subject.MajorID)
	if err != nil {
		return fmt.Errorf("failed to get major: %w", err)
	}
	if major == nil || major.DepartmentID == nil {
		// Subject's major has no department, nothing to update
		return nil
	}

	// Get the department
	department, err := r.GetDepartmentByID(major.DepartmentID.Hex())
	if err != nil {
		return fmt.Errorf("failed to get department: %w", err)
	}
	if department == nil {
		return fmt.Errorf("department not found")
	}

	// Update department staff
	departmentCollection := r.getCollection("department")
	if add {
		// Add professor to department staff if not already present
		_, err = departmentCollection.UpdateOne(
			context.TODO(),
			bson.M{"_id": department.ID},
			bson.M{"$addToSet": bson.M{"staff": professorID}},
		)
	} else {
		// Remove professor from department staff
		_, err = departmentCollection.UpdateOne(
			context.TODO(),
			bson.M{"_id": department.ID},
			bson.M{"$pull": bson.M{"staff": professorID}},
		)
	}
	if err != nil {
		return fmt.Errorf("failed to update department staff: %w", err)
	}
	return nil
}

func (r *Repository) RemoveSubjectFromProfessor(professorID primitive.ObjectID, subjectID string) error {
	collection := r.getCollection("subjects")
	_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": subjectID}, bson.M{"$pull": bson.M{"professor_ids": professorID}})
	if err != nil {
		return err
	}
	professor, err := r.GetProfessorByID(professorID.Hex())
	if err != nil {
		return err
	}
	subjectIDPrimitive, err := primitive.ObjectIDFromHex(subjectID)
	if err != nil {
		return err
	}
	// Remove subject from professor's Subjects slice by comparing IDs
	newSubjects := make([]Subject, 0, len(professor.Subjects))
	for _, s := range professor.Subjects {
		if s.ID != subjectIDPrimitive {
			newSubjects = append(newSubjects, s)
		}
	}
	professor.Subjects = newSubjects

	// Update department staff - remove professor from department if needed
	// Get the subject to find its major and department
	subject, err := r.GetSubjectByID(subjectID)
	if err == nil && subject != nil {
		major, err := r.GetMajorByID(subject.MajorID)
		if err == nil && major != nil && major.DepartmentID != nil {
			// Check if professor has other subjects in this department
			hasOtherSubjectsInDept := false
			for _, s := range professor.Subjects {
				// Get each subject's major to check if it's in the same department
				subjMajor, err := r.GetMajorByID(s.MajorID)
				if err == nil && subjMajor != nil && subjMajor.DepartmentID != nil {
					if subjMajor.DepartmentID.Hex() == major.DepartmentID.Hex() {
						hasOtherSubjectsInDept = true
						break
					}
				}
			}
			// Only remove from department if no other subjects in this department
			if !hasOtherSubjectsInDept {
				if err := r.updateDepartmentStaffForSubject(subjectIDPrimitive, professorID, false); err != nil {
					r.logger.Printf("Warning: failed to update department staff: %v", err)
				}
			}
		}
	}

	return r.UpdateProfessor(professor)
}
func (r *Repository) AddSubjectToProfessor(subjectIDs []primitive.ObjectID, professorID string) error {

	professor, err := r.GetProfessorByID(professorID)
	if err != nil {
		return fmt.Errorf("failed to get professor: %w", err)
	}

	professorIDPrimitive, err := primitive.ObjectIDFromHex(professorID)
	if err != nil {
		return fmt.Errorf("invalid professor ID format: %w", err)
	}

	for _, subjectID := range subjectIDs {
		subject, err := r.GetSubjectByID(subjectID.Hex())
		if err != nil {
			return fmt.Errorf("failed to get subject %s: %w", subjectID.Hex(), err)
		}
		if subject == nil {
			return fmt.Errorf("subject %s not found", subjectID.Hex())
		}

		subjectExists := false
		for _, s := range professor.Subjects {
			if s.ID == subjectID {
				subjectExists = true
				break
			}
		}

		if !subjectExists {
			professor.Subjects = append(professor.Subjects, *subject)
		}

		professorExists := false
		for _, pid := range subject.ProfessorIDs {
			if pid == professorIDPrimitive {
				professorExists = true
				break
			}
		}

		if !professorExists {
			subjectCollection := r.getCollection("subjects")
			_, err = subjectCollection.UpdateOne(
				context.TODO(),
				bson.M{"_id": subjectID},
				bson.M{"$addToSet": bson.M{"professor_ids": professorIDPrimitive}},
			)
			if err != nil {
				return fmt.Errorf("failed to update subject %s: %w", subjectID.Hex(), err)
			}
		}

		// Add professor to department staff of the subject's major
		if err := r.updateDepartmentStaffForSubject(subjectID, professorIDPrimitive, true); err != nil {
			r.logger.Printf("Warning: failed to update department staff for subject %s: %v", subjectID.Hex(), err)
			// Continue with other subjects even if department update fails
		}
	}

	// Update the professor with the new subjects
	return r.UpdateProfessor(professor)
}
func (r *Repository) GetSubjectByID(subjectID string) (*Subject, error) {
	collection := r.getCollection("subjects")
	objectID, err := primitive.ObjectIDFromHex(subjectID)
	if err != nil {
		return nil, err
	}
	var subject Subject
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&subject)
	if err != nil {
		return nil, err
	}
	return &subject, nil
}

func (r *Repository) UpdateSubject(subject *Subject) error {
	subjectsCol := r.getCollection("subjects")

	// Update the subject in its own collection
	_, err := subjectsCol.UpdateOne(context.TODO(), bson.M{"_id": subject.ID}, bson.M{"$set": subject})
	if err != nil {
		r.logger.Println("Error updating subject in subjects collection:", err)
		return err
	}

	// Fetch the related major
	major, err := r.GetMajorByID(subject.MajorID)
	if err != nil {
		r.logger.Println("Error fetching major for subject:", err)
		return err
	}
	if major == nil {
		return fmt.Errorf("major with ID %v not found", subject.MajorID.Hex())
	}

	// Update the subject within the major’s Subjects array
	updated := false
	for i, s := range major.Subjects {
		if s.ID == subject.ID {
			major.Subjects[i] = *subject
			updated = true
			break
		}
	}

	// If subject not found in major, append it (new subject for that major)
	if !updated {
		major.Subjects = append(major.Subjects, *subject)
	}

	// Persist the change in majors collection
	err = r.UpdateMajor(major.ID, major)
	if err != nil {
		r.logger.Println("Error updating major with new subject data:", err)
		return err
	}

	return nil
}

func (r *Repository) DeleteSubject(subjectID string) error {
	subjectsCol := r.getCollection("subjects")

	objectID, err := primitive.ObjectIDFromHex(subjectID)
	if err != nil {
		return fmt.Errorf("invalid subject ID: %v", err)
	}

	// Get the subject to know which major to update
	subject, err := r.GetSubjectByID(subjectID)
	if err != nil {
		return err
	}
	if subject == nil {
		return fmt.Errorf("subject not found")
	}

	// Delete the subject from "subjects" collection
	_, err = subjectsCol.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	if err != nil {
		r.logger.Println("Error deleting subject:", err)
		return err
	}

	// Remove it from the major’s Subjects array
	major, err := r.GetMajorByID(subject.MajorID)
	if err != nil {
		r.logger.Println("Error fetching major for subject deletion:", err)
		return err
	}
	if major == nil {
		return fmt.Errorf("major with ID %v not found", subject.MajorID.Hex())
	}

	newSubjects := make([]Subject, 0, len(major.Subjects))
	for _, s := range major.Subjects {
		if s.ID != objectID {
			newSubjects = append(newSubjects, s)
		}
	}
	major.Subjects = newSubjects

	// Update the major in the DB
	err = r.UpdateMajor(major.ID, major)
	if err != nil {
		r.logger.Println("Error updating major after subject deletion:", err)
		return err
	}

	return nil
}

// ... existing code ...

// GetStudentsByMajorID retrieves all students for a given major ID
func (r *Repository) GetStudentsByMajorID(majorID primitive.ObjectID) ([]Student, error) {
	collection := r.getCollection("student")
	cursor, err := collection.Find(context.TODO(), bson.M{"major_id": majorID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var students []Student
	err = cursor.All(context.TODO(), &students)
	return students, err
}

// GetUsersByDepartmentID retrieves all users (students, professors, assistants) for a given department ID
func (r *Repository) GetUsersByDepartmentID(departmentID primitive.ObjectID) ([]primitive.ObjectID, error) {
	var userIDs []primitive.ObjectID

	// Get department to find staff IDs and major IDs
	department, err := r.GetDepartmentByID(departmentID.Hex())
	if err != nil {
		return nil, err
	}
	if department == nil {
		return nil, fmt.Errorf("department not found")
	}

	// Add staff IDs (professors, assistants, administrators)
	userIDs = append(userIDs, department.StaffIDs...)
	userIDs = append(userIDs, department.Head)

	// Get all students whose major belongs to this department
	majors, err := r.GetAllMajors()
	if err != nil {
		return nil, err
	}

	var departmentMajorIDs []primitive.ObjectID
	for _, major := range majors {
		if major.DepartmentID != nil && *major.DepartmentID == departmentID {
			departmentMajorIDs = append(departmentMajorIDs, major.ID)
		}
	}

	// Get all students with these majors
	for _, majorID := range departmentMajorIDs {
		students, err := r.GetStudentsByMajorID(majorID)
		if err != nil {
			return nil, err
		}
		for _, student := range students {
			userIDs = append(userIDs, student.ID)
		}
	}

	return userIDs, nil
}

func (r *Repository) CreateStudentService(studentService *StudentService) error {
	collection := r.getCollection("studentservice")
	result, err := collection.InsertOne(context.TODO(), studentService)
	if err != nil {
		return err
	}
	studentService.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *Repository) GetStudentServiceByID(studentServiceID string) (*StudentService, error) {
	collection := r.getCollection("studentservice")
	objectID, err := primitive.ObjectIDFromHex(studentServiceID)
	if err != nil {
		return nil, err
	}
	var studentService StudentService
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&studentService)
	if err != nil {
		return nil, err
	}
	return &studentService, nil
}

func (r *Repository) UpdateStudentService(studentService *StudentService) error {
	collection := r.getCollection("studentservice")
	_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": studentService.ID}, bson.M{"$set": studentService})
	return err
}

func (r *Repository) DeleteStudentService(studentServiceID string) error {
	collection := r.getCollection("studentservice")
	objectID, err := primitive.ObjectIDFromHex(studentServiceID)
	if err != nil {
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	return err
}

func (r *Repository) CreateAdministrator(administrator *Administrator) error {
	collection := r.getCollection("administrator")
	result, err := collection.InsertOne(context.TODO(), administrator)
	if err != nil {
		return err
	}
	administrator.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *Repository) GetAdministratorByID(administratorID string) (*Administrator, error) {
	collection := r.getCollection("administrator")
	objectID, err := primitive.ObjectIDFromHex(administratorID)
	if err != nil {
		return nil, err
	}
	var administrator Administrator
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&administrator)
	if err != nil {
		return nil, err
	}
	return &administrator, nil
}

func (r *Repository) UpdateAdministrator(administrator *Administrator) error {
	collection := r.getCollection("administrator")
	_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": administrator.ID}, bson.M{"$set": administrator})
	return err
}

func (r *Repository) DeleteAdministrator(administratorID string) error {
	collection := r.getCollection("administrator")
	objectID, err := primitive.ObjectIDFromHex(administratorID)
	if err != nil {
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	return err
}

func (r *Repository) GetAllStudents() ([]Student, error) {
	collection := r.getCollection("student")
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var students []Student
	err = cursor.All(context.TODO(), &students)
	if err != nil {
		return nil, err
	}

	return students, nil
}

func (r *Repository) GetAllProfessors() ([]Professor, error) {
	collection := r.getCollection("professor")
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var professors []Professor
	err = cursor.All(context.TODO(), &professors)
	if err != nil {
		return nil, err
	}

	return professors, nil
}

func (r *Repository) GetAllSubjects() ([]Subject, error) {
	collection := r.getCollection("subjects")
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var subjects []Subject
	err = cursor.All(context.TODO(), &subjects)
	if err != nil {
		return nil, err
	}

	return subjects, nil
}

func (r *Repository) GetAllDepartments() ([]Department, error) {
	collection := r.getCollection("department")
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var departments []Department
	err = cursor.All(context.TODO(), &departments)
	if err != nil {
		return nil, err
	}

	return departments, nil
}

func (r *Repository) GetAllUniversities() ([]University, error) {
	collection := r.getCollection("university")
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var universities []University
	err = cursor.All(context.TODO(), &universities)
	if err != nil {
		return nil, err
	}

	return universities, nil
}

func (r *Repository) GetAllAdministrators() ([]Administrator, error) {
	collection := r.getCollection("administrator")
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var administrators []Administrator
	err = cursor.All(context.TODO(), &administrators)
	if err != nil {
		return nil, err
	}

	return administrators, nil
}

func (r *Repository) GetAllAssistants() ([]Assistant, error) {
	collection := r.getCollection("assistant")
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var assistants []Assistant
	err = cursor.All(context.TODO(), &assistants)
	if err != nil {
		return nil, err
	}

	return assistants, nil
}

func (r *Repository) DeregisterExam(studentID, subjectID primitive.ObjectID) error {
	collection := r.getCollection("exams")
	_, err := collection.DeleteOne(context.TODO(), bson.M{"student._id": studentID, "subject._id": subjectID})
	return err
}

func (r *Repository) GetLectures() ([]Subject, error) {
	collection := r.getCollection("subjects")
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var lectures []Subject
	if err = cursor.All(context.TODO(), &lectures); err != nil {
		return nil, err
	}

	return lectures, nil
}

func (r *Repository) PayTuition(payment *TuitionPayment) error {
	collection := r.getCollection("tuitionPayments")
	_, err := collection.InsertOne(context.TODO(), payment)
	return err
}

func (r *Repository) CreateNotification(notification *Notification) error {
	collection := r.getCollection("notifications")
	notification.ID = primitive.NewObjectID()
	notification.CreatedAt = time.Now()
	_, err := collection.InsertOne(context.Background(), notification)
	return err
}

func (r *Repository) GetNotificationByDescription(facultyName string, fieldOfStudy string) (*Notification, error) {
	var notification Notification
	collection := r.getCollection("notifications")

	combinedRegex := fmt.Sprintf("%s.*%s|%s.*%s", facultyName, fieldOfStudy, fieldOfStudy, facultyName)

	filter := bson.M{
		"description": bson.M{"$regex": combinedRegex, "$options": "i"},
	}

	err := collection.FindOne(context.TODO(), filter).Decode(&notification)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}

	return &notification, nil
}
func (r *Repository) GetNotificationsByUserID(userID primitive.ObjectID) ([]Notification, error) {
	collection := r.getCollection("notifications")
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	filter := bson.M{"recipient_id": userID}
	cursor, err := collection.Find(context.TODO(), filter, opts)
	if err != nil {
		// Return empty slice instead of error if query fails
		return []Notification{}, nil
	}
	defer cursor.Close(context.TODO())

	var notifications []Notification
	err = cursor.All(context.TODO(), &notifications)
	if err != nil {
		// Return empty slice instead of error
		return []Notification{}, nil
	}
	
	// Return empty slice if nil
	if notifications == nil {
		return []Notification{}, nil
	}
	
	return notifications, nil
}

func (r *Repository) UpdateNotification(notification *Notification) error {
	collection := r.getCollection("notifications")
	filter := bson.M{"_id": notification.ID}

	var currentNotification Notification
	err := collection.FindOne(context.TODO(), filter).Decode(&currentNotification)
	if err != nil {
		return err
	}

	newContent := notification.Content
	newTitle := notification.Title

	update := bson.M{
		"$set": bson.M{
			"content": newContent,
			"title":   newTitle,
			"seen":    notification.Seen,
		},
	}

	_, err = collection.UpdateOne(context.TODO(), filter, update)
	return err
}

func (r *Repository) GetNotificationByID(id string) (*Notification, error) {
	collection := r.getCollection("notifications")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var notification Notification
	err = collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&notification)
	if err != nil {
		return nil, err
	}
	return &notification, nil
}

func (r *Repository) GetAllNotifications() (Notifications, error) {
	collection := r.getCollection("notifications")

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}})
	cur, err := collection.Find(context.Background(), bson.D{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(context.Background())

	var notifications Notifications
	for cur.Next(context.Background()) {
		var notification Notification
		err := cur.Decode(&notification)
		if err != nil {
			return nil, err
		}
		notifications = append(notifications, &notification)
	}

	if err := cur.Err(); err != nil {
		return nil, err
	}

	return notifications, nil
}

func (r *Repository) DeleteNotification(id string) error {
	collection := r.getCollection("notifications")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = collection.DeleteOne(context.Background(), bson.M{"_id": objectID})
	if err != nil {
		return err
	}
	return nil
}
func (r *Repository) CreateInternshipApplication(internApp *InternshipApplication) error {
	r.logger.Println("Creating internship application:", internApp)
	collection := r.getCollection("internship_applications")
	result, err := collection.InsertOne(context.TODO(), internApp)
	if err != nil {
		r.logger.Println("Error inserting internship application:", err)
		return err
	}
	internApp.ID = result.InsertedID.(primitive.ObjectID)
	r.logger.Println("Internship application created with ID:", internApp.ID.Hex())
	return nil
}

func (r *Repository) GetInternshipApplicationById(internAppID string) (*InternshipApplication, error) {
	r.logger.Println("Fetching internship application by ID:", internAppID)
	collection := r.getCollection("internship_applications")
	objectID, err := primitive.ObjectIDFromHex(internAppID)
	if err != nil {
		r.logger.Println("Invalid internship application ID format:", err)
		return nil, err
	}
	var internApp InternshipApplication
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&internApp)
	if err != nil {
		r.logger.Println("Error finding internship application:", err)
		return nil, err
	}
	r.logger.Println("Internship application found:", internApp)
	return &internApp, nil
}

func (r *Repository) UpdateInternshipApplication(internApp *InternshipApplication) error {
	r.logger.Println("Updating internship application with ID:", internApp.ID.Hex())
	collection := r.getCollection("internship_applications")
	_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": internApp.ID}, bson.M{"$set": internApp})
	if err != nil {
		r.logger.Println("Error updating internship application:", err)
	}
	return err
}

func (r *Repository) DeleteInternshipApplication(internAppID string) error {
	r.logger.Println("Deleting student with ID:", internAppID)
	collection := r.getCollection("internship_applications")
	objectID, err := primitive.ObjectIDFromHex(internAppID)
	if err != nil {
		r.logger.Println("Invalid internship application ID format:", err)
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	if err != nil {
		r.logger.Println("Error deleting internship application:", err)
	}
	return err
}

func (r *Repository) GetAllInternshipApplicationsForStudent(studentId primitive.ObjectID) ([]InternshipApplication, error) {

	filter := bson.M{"student_id": studentId}
	collection := r.getCollection("internship_applications")
	cursor, err := collection.Find(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var internApps []InternshipApplication
	for cursor.Next(context.Background()) {
		var internApp InternshipApplication
		if err := cursor.Decode(&internApp); err != nil {
			return nil, err
		}
		internApps = append(internApps, internApp)
	}
	if len(internApps) == 0 {
		return nil, fmt.Errorf("no applications found")
	}

	return internApps, nil
}

// ===== NEW EXAM SYSTEM METHODS =====

// ExamSession methods
func (r *Repository) CreateExamSession(examSession *ExamSession) error {
	collection := r.getCollection("exam_sessions")
	examSession.ID = primitive.NewObjectID()
	examSession.CreatedAt = time.Now()
	examSession.Status = "scheduled"

	_, err := collection.InsertOne(context.TODO(), examSession)
	return err
}

func (r *Repository) GetExamSessionByID(examSessionID string) (*ExamSession, error) {
	collection := r.getCollection("exam_sessions")
	objectID, err := primitive.ObjectIDFromHex(examSessionID)
	if err != nil {
		return nil, err
	}
	var examSession ExamSession
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&examSession)
	if err != nil {
		return nil, err
	}
	return &examSession, nil
}

func (r *Repository) GetExamSessionsByProfessor(professorID primitive.ObjectID) ([]ExamSession, error) {
	collection := r.getCollection("exam_sessions")
	cursor, err := collection.Find(context.TODO(), bson.M{"professor._id": professorID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var examSessions []ExamSession
	err = cursor.All(context.TODO(), &examSessions)
	return examSessions, err
}

func (r *Repository) GetExamSessionsByStudent(studentID primitive.ObjectID) ([]ExamSession, error) {
	collection := r.getCollection("exam_sessions")
	student, err := r.GetStudentByID(studentID.Hex())
	if err != nil {
		return nil, err
	}
	majorId := student.MajorID
	cursor, err := collection.Find(context.TODO(), bson.M{"subject.major_id": majorId, "subject.year": student.Year})
	if err != nil {
		return nil, err
	}

	defer cursor.Close(context.TODO())

	var examSessions []ExamSession
	err = cursor.All(context.TODO(), &examSessions)
	return examSessions, err
}

func (r *Repository) UpdateExamSession(examSession *ExamSession) error {
	collection := r.getCollection("exam_sessions")

	// Create update document with only non-zero/non-empty fields
	updateDoc := bson.M{}

	// Check each field and only include non-zero values
	if examSession.Subject.ID != primitive.NilObjectID {
		updateDoc["subject"] = examSession.Subject
	}
	if examSession.Professor.ID != primitive.NilObjectID {
		updateDoc["professor"] = examSession.Professor
	}
	if !examSession.ExamDate.IsZero() {
		updateDoc["exam_date"] = examSession.ExamDate
	}
	if examSession.Location != "" {
		updateDoc["location"] = examSession.Location
	}
	if examSession.MaxStudents != 0 {
		updateDoc["max_students"] = examSession.MaxStudents
	}
	if examSession.Status != "" {
		updateDoc["status"] = examSession.Status
	}
	if !examSession.CreatedAt.IsZero() {
		updateDoc["created_at"] = examSession.CreatedAt
	}

	// Only update if there are fields to update
	if len(updateDoc) == 0 {
		return nil // No fields to update
	}

	_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": examSession.ID}, bson.M{"$set": updateDoc})
	return err
}
func (r *Repository) UpdateExamSessionsToPending() error {
	collection := r.getCollection("exam_sessions")
	now := time.Now()

	// Update all scheduled exams where exam_date <= now
	filter := bson.M{
		"status":    "Scheduled",
		"exam_date": bson.M{"$lte": now},
	}

	update := bson.M{
		"$set": bson.M{
			"status": "Pending",
		},
	}

	result, err := collection.UpdateMany(context.TODO(), filter, update)
	if err != nil {
		return err
	}

	r.logger.Printf("Updated %d exam sessions to pending status", result.ModifiedCount)
	return nil
}

func (r *Repository) DeleteExamSession(examSessionID string) error {
	collection := r.getCollection("exam_sessions")
	objectID, err := primitive.ObjectIDFromHex(examSessionID)
	if err != nil {
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	return err
}

func (r *Repository) GetAllExamSessions() ([]ExamSession, error) {
	collection := r.getCollection("exam_sessions")
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var examSessions []ExamSession
	err = cursor.All(context.TODO(), &examSessions)
	return examSessions, err
}

// ExamRegistration methods
func (r *Repository) RegisterForExam(registration *ExamRegistration) error {
	collection := r.getCollection("exam_registrations")
	registration.ID = primitive.NewObjectID()
	registration.RegisteredAt = time.Now()
	registration.Status = "registered"
	_, err := collection.InsertOne(context.TODO(), registration)
	return err
}

func (r *Repository) DeregisterFromExam(studentID, examSessionID primitive.ObjectID) error {
	collection := r.getCollection("exam_registrations")
	examSession, err := r.GetExamSessionByID(examSessionID.Hex())
	if err != nil {
		return fmt.Errorf("you can't unregister from a completed exam")
	}
	if examSession.Status == "Completed" {
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{
		"student._id":     studentID,
		"exam_session_id": examSessionID,
	})
	return err
}

func (r *Repository) GetExamRegistrationsByStudent(studentID primitive.ObjectID) ([]ExamRegistration, error) {
	collection := r.getCollection("exam_registrations")
	cursor, err := collection.Find(context.TODO(), bson.M{"student._id": studentID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var registrations []ExamRegistration
	err = cursor.All(context.TODO(), &registrations)
	return registrations, err
}

func (r *Repository) GetExamRegistrationsByExamSession(examSessionID primitive.ObjectID) ([]ExamRegistration, error) {
	collection := r.getCollection("exam_registrations")
	cursor, err := collection.Find(context.TODO(), bson.M{"exam_session_id": examSessionID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var registrations []ExamRegistration
	err = cursor.All(context.TODO(), &registrations)
	return registrations, err
}

func (r *Repository) GetExamRegistrationById(id primitive.ObjectID) (*ExamRegistration, error) {
	collection := r.getCollection("exam_registrations")
	var examRegistration ExamRegistration
	err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&examRegistration)
	if err != nil {
		return &examRegistration, err
	}
	return &examRegistration, nil
}

func (r *Repository) UpdateExamRegistration(registration *ExamRegistration) error {
	collection := r.getCollection("exam_registrations")
	_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": registration.ID}, bson.M{"$set": registration})
	return err
}

func (r *Repository) CheckExamRegistration(studentID, examSessionID primitive.ObjectID) (bool, error) {
	collection := r.getCollection("exam_registrations")
	count, err := collection.CountDocuments(context.TODO(), bson.M{
		"student._id":     studentID,
		"exam_session_id": examSessionID,
	})
	return count > 0, err
}

// ExamGrade methods
func (r *Repository) CreateExamGrade(grade *ExamGrade) error {
	collection := r.getCollection("exam_grades")
	grade.ID = primitive.NewObjectID()
	grade.GradedAt = time.Now()
	_, err := collection.InsertOne(context.TODO(), grade)
	return err
}

func (r *Repository) UpdateExamGrade(grade *ExamGrade) error {
	type UpdateExamGrade struct {
		Grade    int    `bson:"grade" json:"grade"`
		Passed   bool   `bson:"passed" json:"passed"`
		Comments string `bson:"comments" json:"comments"`
	}
	update := bson.M{
		"$set": bson.M{
			"grade":    grade.Grade,
			"passed":   grade.Passed,
			"comments": grade.Comments,
		},
	}
	collection := r.getCollection("exam_grades")
	filter := bson.M{"_id": grade.ID}
	_, err := collection.UpdateOne(context.TODO(), filter, update)
	return err
}

func (r *Repository) DeleteExamGrade(id primitive.ObjectID) error {
	collection := r.getCollection("exam_grades")

	_, err := collection.DeleteOne(context.TODO(), bson.M{"_id": id})
	if err != nil {
		r.logger.Println("Error deleting exam grade:", err)
		return err
	}
	return nil
}

func (r *Repository) GetExamGradesByStudent(studentID primitive.ObjectID) ([]ExamGrade, error) {
	collection := r.getCollection("exam_grades")
	cursor, err := collection.Find(context.TODO(), bson.M{"student._id": studentID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var grades []ExamGrade
	err = cursor.All(context.TODO(), &grades)
	return grades, err
}

func (r *Repository) GetExamGradesByExamSession(examSessionID primitive.ObjectID) ([]ExamGrade, error) {
	collection := r.getCollection("exam_grades")
	cursor, err := collection.Find(context.TODO(), bson.M{"exam_session_id": examSessionID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var grades []ExamGrade
	err = cursor.All(context.TODO(), &grades)
	return grades, err
}

func (r *Repository) GetExamGradeByStudentAndExam(studentID, examSessionID primitive.ObjectID) (*ExamGrade, error) {
	collection := r.getCollection("exam_grades")
	var grade ExamGrade
	err := collection.FindOne(context.TODO(), bson.M{
		"student._id":     studentID,
		"exam_session_id": examSessionID,
	}).Decode(&grade)
	r.logger.Println("Getting exam grade by student and exam: ")
	r.logger.Println("err: ", err)
	r.logger.Println("studentID: ", studentID.Hex())
	r.logger.Println("examSessionID: ", examSessionID.Hex())
	r.logger.Println("grade: ", grade.Grade)
	r.logger.Println("grade subject id: ", grade.SubjectId.Hex())
	r.logger.Println("grade exam session id: ", grade.ExamSessionId.Hex())
	r.logger.Println("grade exam registration id: ", grade.ExamRegistrationId.Hex())
	r.logger.Println("grade student id: ", grade.Student.ID.Hex())

	if err != nil {
		return nil, err
	}
	return &grade, nil
}

func (r *Repository) GetStudentByIDObject(studentID primitive.ObjectID) (*Student, error) {
	collection := r.getCollection("student")
	var student Student
	err := collection.FindOne(context.TODO(), bson.M{"_id": studentID}).Decode(&student)
	if err != nil {
		return nil, err
	}
	return &student, nil
}

// CreateMajor inserts a new major into the "majors" collection.
func (r *Repository) CreateMajor(major *Major) (string, error) {
	collection := r.getCollection("majors")
	_, err := collection.InsertOne(context.TODO(), major)
	if err != nil {
		r.logger.Println("Error inserting major:", err)
		return "", err
	}
	return major.ID.Hex(), nil
}

// GetAllMajors retrieves all majors from the "majors" collection.
func (r *Repository) GetAllMajors() ([]Major, error) {
	collection := r.getCollection("majors")

	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {

		r.logger.Println("Error finding majors:", err)
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var majors []Major
	if err = cursor.All(context.TODO(), &majors); err != nil {
		r.logger.Println("Error decoding majors:", err)
		return nil, err
	}
	return majors, nil
}

// GetMajorByID fetches a single major by its ObjectID.
func (r *Repository) GetMajorByID(id primitive.ObjectID) (*Major, error) {
	collection := r.getCollection("majors")

	var major Major
	err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&major)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		r.logger.Println("Error finding major by ID:", err)
		return nil, err
	}
	return &major, nil
}

func (r *Repository) GetProfessorsByMajorId(majorId primitive.ObjectID) ([]Professor, error) {
	professors := []Professor{}
	subjects, err := r.GetSubjectsFromMajor(majorId)
	if err != nil {
		return nil, err
	}
	for _, subject := range subjects {
		for _, professorID := range subject.ProfessorIDs {
			professor, err := r.GetProfessorByID(professorID.Hex())
			if err != nil {
				return nil, err
			}
			professors = append(professors, *professor)
		}
	}
	return professors, nil
}

func (r *Repository) RegisterStudentForMajor(id primitive.ObjectID, major_id primitive.ObjectID) error {
	//collection := r.getCollection("majors")
	return nil
}

// UpdateMajor updates a major’s details.
func (r *Repository) UpdateMajor(id primitive.ObjectID, updatedMajor *Major) error {
	collection := r.getCollection("majors")

	update := bson.M{
		"$set": bson.M{
			"name":     updatedMajor.Name,
			"subjects": updatedMajor.Subjects,
		},
	}

	_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": id}, update)
	if err != nil {
		r.logger.Println("Error updating major:", err)
		return err
	}
	return nil
}

// DeleteMajor removes a major by ID.
func (r *Repository) DeleteMajor(id primitive.ObjectID) error {
	collection := r.getCollection("majors")

	_, err := collection.DeleteOne(context.TODO(), bson.M{"_id": id})
	if err != nil {
		r.logger.Println("Error deleting major:", err)
		return err
	}
	return nil
}

// GetSubjectsFromMajor retrieves subjects for a given major ID.
func (r *Repository) GetSubjectsFromMajor(id primitive.ObjectID) ([]Subject, error) {
	collection := r.getCollection("majors")

	var major Major
	err := collection.FindOne(context.TODO(), bson.M{"_id": id}).Decode(&major)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		r.logger.Println("Error finding major subjects:", err)
		return nil, err
	}

	return major.Subjects, nil
}
func (r *Repository) GetSubjectsByProfessorId(professorID primitive.ObjectID) ([]Subject, error) {
	collection := r.getCollection("subjects")
	cursor, err := collection.Find(context.TODO(), bson.M{"professor_ids": bson.M{"$in": []primitive.ObjectID{professorID}}})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var subjects []Subject
	err = cursor.All(context.TODO(), &subjects)
	return subjects, err
}
