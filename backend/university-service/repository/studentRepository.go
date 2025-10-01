package repositories

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
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

	client, err := mongo.NewClient(options.Client().ApplyURI(dburi))
	if err != nil {
		return nil, err
	}

	err = client.Connect(ctx)
	if err != nil {
		return nil, err
	}

	return &Repository{
		cli:    client,
		logger: logger,
	}, nil
}

func (r *Repository) Disconnect(ctx context.Context) error {
	err := r.cli.Disconnect(ctx)
	if err != nil {
		return err
	}
	return nil
}

func (r *Repository) getCollection(collectionName string) *mongo.Collection {
	db := r.cli.Database("universityDB")
	return db.Collection(collectionName)
}

func (r *Repository) CreateStudent(student *Student) error {
	collection := r.getCollection("student")
	result, err := collection.InsertOne(context.TODO(), student)
	if err != nil {
		return err
	}
	student.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *Repository) GetStudentByID(userID string) (*Student, error) {
	collection := r.getCollection("student")
	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	var student Student
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&student)
	if err != nil {
		return nil, err
	}
	return &student, nil
}

func (r *Repository) UpdateStudent(student *Student) error {
	collection := r.getCollection("student")
	_, err := collection.ReplaceOne(context.TODO(), bson.M{"_id": student.ID}, student)
	return err
}

func (r *Repository) DeleteStudent(userID string) error {
	collection := r.getCollection("student")
	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	return err
}

func (r *Repository) CreateUniversity(university *University) error {
	collection := r.getCollection("university")
	result, err := collection.InsertOne(context.TODO(), university)
	if err != nil {
		return err
	}
	university.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *Repository) GetUniversityByID(universityID string) (*University, error) {
	collection := r.getCollection("university")
	objectID, err := primitive.ObjectIDFromHex(universityID)
	if err != nil {
		return nil, err
	}
	var university University
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&university)
	if err != nil {
		return nil, err
	}
	return &university, nil
}

func (r *Repository) UpdateUniversity(university *University) error {
	collection := r.getCollection("university")
	_, err := collection.ReplaceOne(context.TODO(), bson.M{"_id": university.ID}, university)
	return err
}

func (r *Repository) DeleteUniversity(universityID string) error {
	collection := r.getCollection("university")
	objectID, err := primitive.ObjectIDFromHex(universityID)
	if err != nil {
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	return err
}

func (r *Repository) CreateDepartment(department *Department) error {
	collection := r.getCollection("department")
	result, err := collection.InsertOne(context.TODO(), department)
	if err != nil {
		return err
	}
	department.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *Repository) GetDepartmentByID(departmentID string) (*Department, error) {
	collection := r.getCollection("department")
	objectID, err := primitive.ObjectIDFromHex(departmentID)
	if err != nil {
		return nil, err
	}
	var department Department
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&department)
	if err != nil {
		return nil, err
	}
	return &department, nil
}

func (r *Repository) UpdateDepartment(department *Department) error {
	collection := r.getCollection("department")
	_, err := collection.ReplaceOne(context.TODO(), bson.M{"_id": department.ID}, department)
	return err
}

func (r *Repository) DeleteDepartment(departmentID string) error {
	collection := r.getCollection("department")
	objectID, err := primitive.ObjectIDFromHex(departmentID)
	if err != nil {
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	return err
}

func (r *Repository) CreateProfessor(professor *Professor) error {
	collection := r.getCollection("professor")
	result, err := collection.InsertOne(context.TODO(), professor)
	if err != nil {
		return err
	}
	professor.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *Repository) GetProfessorByID(professorID string) (*Professor, error) {
	collection := r.getCollection("professor")
	objectID, err := primitive.ObjectIDFromHex(professorID)
	if err != nil {
		return nil, err
	}
	var professor Professor
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&professor)
	if err != nil {
		return nil, err
	}
	return &professor, nil
}

func (r *Repository) UpdateProfessor(professor *Professor) error {
	collection := r.getCollection("professor")
	_, err := collection.ReplaceOne(context.TODO(), bson.M{"_id": professor.ID}, professor)
	return err
}

func (r *Repository) DeleteProfessor(professorID string) error {
	collection := r.getCollection("professor")
	objectID, err := primitive.ObjectIDFromHex(professorID)
	if err != nil {
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	return err
}

func (r *Repository) CreateAssistant(assistant *Assistant) error {
	collection := r.getCollection("assistant")
	result, err := collection.InsertOne(context.TODO(), assistant)
	if err != nil {
		return err
	}
	assistant.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *Repository) GetAssistantByID(assistantID string) (*Assistant, error) {
	collection := r.getCollection("assistant")
	objectID, err := primitive.ObjectIDFromHex(assistantID)
	if err != nil {
		return nil, err
	}
	var assistant Assistant
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&assistant)
	if err != nil {
		return nil, err
	}
	return &assistant, nil
}

func (r *Repository) UpdateAssistant(assistant *Assistant) error {
	collection := r.getCollection("assistant")
	_, err := collection.ReplaceOne(context.TODO(), bson.M{"_id": assistant.ID}, assistant)
	return err
}

func (r *Repository) DeleteAssistant(assistantID string) error {
	collection := r.getCollection("assistant")
	objectID, err := primitive.ObjectIDFromHex(assistantID)
	if err != nil {
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	return err
}

// CRUD operations for Course
func (r *Repository) CreateCourse(course *Course) error {
	collection := r.getCollection("course")
	result, err := collection.InsertOne(context.TODO(), course)
	if err != nil {
		return err
	}
	course.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *Repository) GetCourseByID(courseID string) (*Course, error) {
	collection := r.getCollection("course")
	objectID, err := primitive.ObjectIDFromHex(courseID)
	if err != nil {
		return nil, err
	}
	var course Course
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&course)
	if err != nil {
		return nil, err
	}
	return &course, nil
}

func (r *Repository) UpdateCourse(course *Course) error {
	collection := r.getCollection("course")
	_, err := collection.ReplaceOne(context.TODO(), bson.M{"_id": course.ID}, course)
	return err
}

func (r *Repository) DeleteCourse(courseID string) error {
	collection := r.getCollection("course")
	objectID, err := primitive.ObjectIDFromHex(courseID)
	if err != nil {
		return err
	}
	_, err = collection.DeleteOne(context.TODO(), bson.M{"_id": objectID})
	return err
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
	_, err := collection.ReplaceOne(context.TODO(), bson.M{"_id": studentService.ID}, studentService)
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
	_, err := collection.ReplaceOne(context.TODO(), bson.M{"_id": administrator.ID}, administrator)
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

func (r *Repository) CreateExam(exam *Exam) error {
	collection := r.getCollection("exam")
	result, err := collection.InsertOne(context.TODO(), exam)
	if err != nil {
		return err
	}
	exam.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *Repository) GetExamByID(examID string) (*Exam, error) {
	collection := r.getCollection("exam")
	objectID, err := primitive.ObjectIDFromHex(examID)
	if err != nil {
		return nil, err
	}
	var exam Exam
	err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&exam)
	if err != nil {
		return nil, err
	}
	return &exam, nil
}

func (r *Repository) UpdateExam(exam *Exam) error {
	collection := r.getCollection("exam")
	_, err := collection.ReplaceOne(context.TODO(), bson.M{"_id": exam.ID}, exam)
	return err
}

func (r *Repository) DeleteExam(examID string) error {
	collection := r.getCollection("exam")
	objectID, err := primitive.ObjectIDFromHex(examID)
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

func (r *Repository) GetAllCourses() ([]Course, error) {
	collection := r.getCollection("course")
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var courses []Course
	err = cursor.All(context.TODO(), &courses)
	if err != nil {
		return nil, err
	}

	return courses, nil
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

func (r *Repository) GetAllExams() ([]Exam, error) {
	collection := r.getCollection("exam")
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var exams []Exam
	err = cursor.All(context.TODO(), &exams)
	if err != nil {
		return nil, err
	}

	return exams, nil
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

func (r *Repository) RegisterExam(exam *Exam) error {
	collection := r.getCollection("exams")
	_, err := collection.InsertOne(context.TODO(), exam)
	return err
}

func (r *Repository) DeregisterExam(studentID, courseID primitive.ObjectID) error {
	collection := r.getCollection("exams")
	_, err := collection.DeleteOne(context.TODO(), bson.M{"student._id": studentID, "course._id": courseID})
	return err
}

func (r *Repository) GetExamCalendar() ([]Exam, error) {
	collection := r.getCollection("exams")
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var exams []Exam
	if err = cursor.All(context.TODO(), &exams); err != nil {
		return nil, err
	}

	return exams, nil
}

func (r *Repository) GetLectures() ([]Course, error) {
	collection := r.getCollection("courses")
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	var lectures []Course
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
