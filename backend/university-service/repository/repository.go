package repositories

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"reflect"
	"slices"
	"strings"
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
	student.GPA = 0

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

	// Use reflection to build update document with only non-zero fields
	updateDoc := bson.M{}
	v := reflect.ValueOf(student).Elem()
	t := reflect.TypeOf(student).Elem()

	for i := 0; i < v.NumField(); i++ {
		field := v.Field(i)
		fieldType := t.Field(i)

		// Skip the ID field
		if fieldType.Name == "ID" {
			continue
		}

		// Get the bson tag for the field name
		bsonTag := fieldType.Tag.Get("bson")
		if bsonTag == "" || bsonTag == "-" {
			continue
		}

		// Check if field has a non-zero value
		if !field.IsZero() {
			updateDoc[bsonTag] = field.Interface()
		}
	}

	_, err := collection.UpdateOne(
		context.TODO(),
		bson.M{"_id": student.ID},
		bson.M{"$set": updateDoc},
	)
	if err != nil {
		r.logger.Println("Error updating student:", err)
	}
	return err
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
	collection := r.getCollection("professor")
	_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": professor.ID}, bson.M{"$set": professor})
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

	return nil
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
	_, err := subjectsCol.UpdateOne(context.TODO(), bson.M{"_id": subject.ID}, subject)
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

func (r *Repository) UpdateNotification(notification *Notification) error {
	collection := r.getCollection("notifications")
	filter := bson.M{"_id": notification.ID}

	var currentNotification Notification
	err := collection.FindOne(context.TODO(), filter).Decode(&currentNotification)
	if err != nil {
		return err
	}

	currentContent := currentNotification.Content

	descriptionIndex := strings.Index(currentContent, "Description:")
	if descriptionIndex != -1 {

		descriptionEndIndex := strings.Index(currentContent[descriptionIndex:], ",")
		if descriptionEndIndex != -1 {
			newContent := currentContent[:descriptionIndex] + "Description: Otkazano"
			update := bson.M{
				"$set": bson.M{
					"content": newContent,
				},
			}
			_, err = collection.UpdateOne(context.TODO(), filter, update)
			return err
		}
	}

	newContent := currentContent + ", Description: Otkazano"
	update := bson.M{
		"$set": bson.M{
			"content": newContent,
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

	cur, err := collection.Find(context.Background(), bson.D{})
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
	cursor, err := collection.Find(context.TODO(), bson.M{"subject.major_id": majorId})
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
	_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": examSession.ID}, bson.M{"$set": examSession})
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
	collection := r.getCollection("exam_grades")
	_, err := collection.UpdateOne(context.TODO(), bson.M{"_id": grade.ID}, bson.M{"$set": grade})
	return err
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
		"student._id":      studentID,
		"exam_session._id": examSessionID,
	}).Decode(&grade)
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
