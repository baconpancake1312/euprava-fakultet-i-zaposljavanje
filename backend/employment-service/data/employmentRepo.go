package data

import (
	"context"
	"employment-service/models"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

type EmploymentRepo struct {
	cli    *mongo.Client
	logger *log.Logger
	client *http.Client
}

func NewEmploymentRepo(ctx context.Context, logger *log.Logger) (*EmploymentRepo, error) {
	dburi := fmt.Sprintf("mongodb://%s:%s@%s:%s/", 
		os.Getenv("MONGO_INITDB_ROOT_USERNAME"), 
		os.Getenv("MONGO_INITDB_ROOT_PASSWORD"))

	client, err := mongo.NewClient(options.Client().ApplyURI(dburi))
	if err != nil {
		return nil, err
	}

	err = client.Connect(ctx)
	if err != nil {
		return nil, err
	}

	httpClient := &http.Client{
		Transport: &http.Transport{
			MaxIdleConns:        10,
			MaxIdleConnsPerHost: 10,
			MaxConnsPerHost:     10,
		},
	}

	// Return repository with logger and DB client
	return &EmploymentRepo{
		logger: logger,
		cli:    client,
		client: httpClient,
	}, nil
}

// Disconnect from database
func (er *EmploymentRepo) DisconnectMongo(ctx context.Context) error {
	err := er.cli.Disconnect(ctx)
	if err != nil {
		return err
	}
	return nil
}

// Check database connection
func (er *EmploymentRepo) Ping() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check connection -> if no error, connection is established
	err := er.cli.Ping(ctx, readpref.Primary())
	if err != nil {
		er.logger.Println(err)
	}

	// Print available databases
	databases, err := er.cli.ListDatabaseNames(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
	}
	fmt.Println(databases)
}

func (er *EmploymentRepo) GetClient() *mongo.Client {
	return er.cli
}

func OpenCollection(client *mongo.Client, collectionName string) *mongo.Collection {
	var collection *mongo.Collection = client.Database(os.Getenv("EMPLOYMENT_DB_HOST")).Collection(collectionName)
	return collection
}

// JobListing CRUD operations

func (er *EmploymentRepo) GetJobListing(listingId string) (*models.JobListing, error) {
	var listing models.JobListing
	lisCollection := OpenCollection(er.cli, "listings")
	objectId, err := primitive.ObjectIDFromHex(listingId)

	err = lisCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&listing)
	if err != nil {
		return nil, fmt.Errorf("no listings not found for id: %s", listingId)
	}

	return &listing, nil
}

func (er *EmploymentRepo) InsertJobListing(listing *models.JobListing) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	lisCollection := OpenCollection(er.cli, "listings")
	listing.Id = primitive.NewObjectID()
	result, err := lisCollection.InsertOne(ctx, &listing)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return listing.Id, nil
}

func (er *EmploymentRepo) UpdateJobListing(listingId string, listing *models.JobListing) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	selCollection := OpenCollection(er.cli, "listings")
	objectId, err := primitive.ObjectIDFromHex(listingId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"position":      listing.Position,
			"description":   listing.Description,
			"expire_date":   listing.ExpireDate,
			"is_internship": listing.IsInternship,
		},
	}

	result, err := selCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update listing with id: %s, error: %v", listingId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no listing found with id: %s", listingId)
	}

	er.logger.Printf("Updated listing with id: %s", listingId)
	return nil
}

func (er *EmploymentRepo) DeleteJobListing(listingId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	appCollection := OpenCollection(er.cli, "listings")
	objectId, err := primitive.ObjectIDFromHex(listingId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	applications, err := er.GetApplicationsForJob(er.cli, listingId)
	if err != nil {
		return fmt.Errorf("could not delete applications for job listing with id: %s, error: %v", listingId, err)
	}
	for _, app := range applications {
		er.DeleteApplication(app.Id.Hex())
		if err != nil {
			return fmt.Errorf("could not delete applications for job listing with id: %s, error: %v", listingId, err)
		} else {
			er.logger.Printf("Deleting application: %s from listing: %s", app.Id.Hex(), listingId)
		}
		return nil
	}

	result, err := appCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete listing with id: %s, error: %v", listingId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no listing found with id: %s", listingId)
	}
	er.logger.Printf("Deleted listing with id: %s", listingId)
	return nil
}

func (er *EmploymentRepo) GetAllJobListings() ([]*models.JobListing, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	lisCollection := OpenCollection(er.cli, "listings")

	var listings []*models.JobListing
	cursor, err := lisCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &listings); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return listings, nil
}

// Application CRUD operations

func (er *EmploymentRepo) GetApplication(applicationId string) (*models.Application, error) {
	var application models.Application
	appCollection := OpenCollection(er.cli, "applications")
	objectId, err := primitive.ObjectIDFromHex(applicationId)

	err = appCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&application)
	if err != nil {
		return nil, fmt.Errorf("no applications not found for id: %s", applicationId)
	}

	return &application, nil
}

func (er *EmploymentRepo) GetApplicationsForJob(client *mongo.Client, listingID string) (models.Applications, error) {
	listingObjID, err := primitive.ObjectIDFromHex(listingID)
	if err != nil {
		return nil, fmt.Errorf("invalid listing ID: %v", err)
	}

	appCollection := OpenCollection(er.cli, "applications")

	filter := bson.M{"listing_id": listingObjID}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := appCollection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("error querying applications: %v", err)
	}
	defer cursor.Close(ctx)

	var applications *models.Applications
	if err := cursor.All(ctx, &applications); err != nil {
		return nil, fmt.Errorf("error decoding applications: %v", err)
	}

	return *applications, nil
}

func (er *EmploymentRepo) InsertApplication(application *models.Application) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	selCollection := OpenCollection(er.cli, "applications")
	application.Id = primitive.NewObjectID()
	result, err := selCollection.InsertOne(ctx, &application)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return application.Id, nil
}

func (er *EmploymentRepo) UpdateApplication(applicationId string, application *models.Application) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	selCollection := OpenCollection(er.cli, "applications")
	objectId, err := primitive.ObjectIDFromHex(applicationId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"_applicant_id": application.ApplicantId,
			"status":        application.Status,
		},
	}

	result, err := selCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update application with id: %s, error: %v", applicationId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no application found with id: %s", applicationId)
	}

	er.logger.Printf("Updated application with id: %s", applicationId)
	return nil
}

func (er *EmploymentRepo) DeleteApplication(applicationId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	appCollection := OpenCollection(er.cli, "applications")
	objectId, err := primitive.ObjectIDFromHex(applicationId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	result, err := appCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete application with id: %s, error: %v", applicationId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no application found with id: %s", applicationId)
	}

	er.logger.Printf("Deleted application with id: %s", applicationId)
	return nil
}

func (er *EmploymentRepo) GetAllApplications() ([]*models.Application, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	appCollection := OpenCollection(er.cli, "applications")

	var applications []*models.Application
	cursor, err := appCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &applications); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return applications, nil
}

// User CRUD operations
func (er *EmploymentRepo) CreateUser(user *models.User) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	userCollection := OpenCollection(er.cli, "users")
	user.ID = primitive.NewObjectID()
	result, err := userCollection.InsertOne(ctx, &user)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return user.ID, nil
}

func (er *EmploymentRepo) GetUser(userId string) (*models.User, error) {
	var user models.User
	userCollection := OpenCollection(er.cli, "users")
	objectId, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = userCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&user)
	if err != nil {
		return nil, fmt.Errorf("no user found for id: %s", userId)
	}

	return &user, nil
}

func (er *EmploymentRepo) GetAllUsers() ([]*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	userCollection := OpenCollection(er.cli, "users")

	var users []*models.User
	cursor, err := userCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &users); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return users, nil
}

func (er *EmploymentRepo) UpdateUser(userId string, user *models.User) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	userCollection := OpenCollection(er.cli, "users")
	objectId, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"first_name":    user.FirstName,
			"last_name":     user.LastName,
			"email":         user.Email,
			"phone":         user.Phone,
			"address":       user.Address,
			"jmbg":          user.JMBG,
			"notifications": user.Notifications,
		},
	}

	result, err := userCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update user with id: %s, error: %v", userId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no user found with id: %s", userId)
	}

	er.logger.Printf("Updated user with id: %s", userId)
	return nil
}

func (er *EmploymentRepo) DeleteUser(userId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	userCollection := OpenCollection(er.cli, "users")
	objectId, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	result, err := userCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete user with id: %s, error: %v", userId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no user found with id: %s", userId)
	}

	er.logger.Printf("Deleted user with id: %s", userId)
	return nil
}

// Student CRUD operations
func (er *EmploymentRepo) CreateStudent(student *models.Student) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	studentCollection := OpenCollection(er.cli, "students")
	student.ID = primitive.NewObjectID()
	result, err := studentCollection.InsertOne(ctx, &student)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return student.ID, nil
}

func (er *EmploymentRepo) GetStudent(studentId string) (*models.Student, error) {
	var student models.Student
	studentCollection := OpenCollection(er.cli, "students")
	objectId, err := primitive.ObjectIDFromHex(studentId)
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = studentCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&student)
	if err != nil {
		return nil, fmt.Errorf("no student found for id: %s", studentId)
	}

	return &student, nil
}

func (er *EmploymentRepo) GetAllStudents() ([]*models.Student, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	studentCollection := OpenCollection(er.cli, "students")

	var students []*models.Student
	cursor, err := studentCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &students); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return students, nil
}

func (er *EmploymentRepo) UpdateStudent(studentId string, student *models.Student) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	studentCollection := OpenCollection(er.cli, "students")
	objectId, err := primitive.ObjectIDFromHex(studentId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"first_name":      student.FirstName,
			"last_name":       student.LastName,
			"email":           student.Email,
			"phone":           student.Phone,
			"address":         student.Address,
			"jmbg":            student.JMBG,
			"scholarship":     student.Scholarship,
			"assigned_dorm":   student.AssignedDorm,
			"highschool_gpa":  student.HighschoolGPA,
			"gpa":             student.GPA,
			"ects":            student.ECTS,
			"year":            student.Year,
		},
	}

	result, err := studentCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update student with id: %s, error: %v", studentId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no student found with id: %s", studentId)
	}

	er.logger.Printf("Updated student with id: %s", studentId)
	return nil
}

func (er *EmploymentRepo) DeleteStudent(studentId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	studentCollection := OpenCollection(er.cli, "students")
	objectId, err := primitive.ObjectIDFromHex(studentId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	result, err := studentCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete student with id: %s, error: %v", studentId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no student found with id: %s", studentId)
	}

	er.logger.Printf("Deleted student with id: %s", studentId)
	return nil
}

// Notification CRUD operations
func (er *EmploymentRepo) CreateNotification(notification *models.Notification) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	notificationCollection := OpenCollection(er.cli, "notifications")
	notification.ID = primitive.NewObjectID()
	result, err := notificationCollection.InsertOne(ctx, &notification)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return notification.ID, nil
}

func (er *EmploymentRepo) GetNotification(notificationId string) (*models.Notification, error) {
	var notification models.Notification
	notificationCollection := OpenCollection(er.cli, "notifications")
	objectId, err := primitive.ObjectIDFromHex(notificationId)
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = notificationCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&notification)
	if err != nil {
		return nil, fmt.Errorf("no notification found for id: %s", notificationId)
	}

	return &notification, nil
}

func (er *EmploymentRepo) GetAllNotifications() ([]*models.Notification, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	notificationCollection := OpenCollection(er.cli, "notifications")

	var notifications []*models.Notification
	cursor, err := notificationCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &notifications); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return notifications, nil
}

func (er *EmploymentRepo) UpdateNotification(notificationId string, notification *models.Notification) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	notificationCollection := OpenCollection(er.cli, "notifications")
	objectId, err := primitive.ObjectIDFromHex(notificationId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"user_id":     notification.UserId,
			"message":     notification.Message,
			"date":        notification.Date,
			"read_status": notification.ReadStatus,
		},
	}

	result, err := notificationCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update notification with id: %s, error: %v", notificationId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no notification found with id: %s", notificationId)
	}

	er.logger.Printf("Updated notification with id: %s", notificationId)
	return nil
}

func (er *EmploymentRepo) DeleteNotification(notificationId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	notificationCollection := OpenCollection(er.cli, "notifications")
	objectId, err := primitive.ObjectIDFromHex(notificationId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	result, err := notificationCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete notification with id: %s, error: %v", notificationId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no notification found with id: %s", notificationId)
	}

	er.logger.Printf("Deleted notification with id: %s", notificationId)
	return nil
}

// Benefit CRUD operations
func (er *EmploymentRepo) CreateBenefit(benefit *models.Benefit) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	benefitCollection := OpenCollection(er.cli, "benefits")
	benefit.ID = primitive.NewObjectID()
	result, err := benefitCollection.InsertOne(ctx, &benefit)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return benefit.ID, nil
}

func (er *EmploymentRepo) GetBenefit(benefitId string) (*models.Benefit, error) {
	var benefit models.Benefit
	benefitCollection := OpenCollection(er.cli, "benefits")
	objectId, err := primitive.ObjectIDFromHex(benefitId)
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = benefitCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&benefit)
	if err != nil {
		return nil, fmt.Errorf("no benefit found for id: %s", benefitId)
	}

	return &benefit, nil
}

func (er *EmploymentRepo) GetAllBenefits() ([]*models.Benefit, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	benefitCollection := OpenCollection(er.cli, "benefits")

	var benefits []*models.Benefit
	cursor, err := benefitCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &benefits); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return benefits, nil
}

func (er *EmploymentRepo) UpdateBenefit(benefitId string, benefit *models.Benefit) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	benefitCollection := OpenCollection(er.cli, "benefits")
	objectId, err := primitive.ObjectIDFromHex(benefitId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"user_id":    benefit.UserId,
			"amount":     benefit.Amount,
			"start_date": benefit.StartDate,
			"end_date":   benefit.EndDate,
			"status":     benefit.Status,
		},
	}

	result, err := benefitCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update benefit with id: %s, error: %v", benefitId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no benefit found with id: %s", benefitId)
	}

	er.logger.Printf("Updated benefit with id: %s", benefitId)
	return nil
}

func (er *EmploymentRepo) DeleteBenefit(benefitId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	benefitCollection := OpenCollection(er.cli, "benefits")
	objectId, err := primitive.ObjectIDFromHex(benefitId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	result, err := benefitCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete benefit with id: %s, error: %v", benefitId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no benefit found with id: %s", benefitId)
	}

	er.logger.Printf("Deleted benefit with id: %s", benefitId)
	return nil
}

// Request CRUD operations
func (er *EmploymentRepo) CreateRequest(request *models.Request) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	requestCollection := OpenCollection(er.cli, "requests")
	request.ID = primitive.NewObjectID()
	result, err := requestCollection.InsertOne(ctx, &request)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return request.ID, nil
}

func (er *EmploymentRepo) GetRequest(requestId string) (*models.Request, error) {
	var request models.Request
	requestCollection := OpenCollection(er.cli, "requests")
	objectId, err := primitive.ObjectIDFromHex(requestId)
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = requestCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&request)
	if err != nil {
		return nil, fmt.Errorf("no request found for id: %s", requestId)
	}

	return &request, nil
}

func (er *EmploymentRepo) GetAllRequests() ([]*models.Request, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	requestCollection := OpenCollection(er.cli, "requests")

	var requests []*models.Request
	cursor, err := requestCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &requests); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return requests, nil
}

func (er *EmploymentRepo) UpdateRequest(requestId string, request *models.Request) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	requestCollection := OpenCollection(er.cli, "requests")
	objectId, err := primitive.ObjectIDFromHex(requestId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"user_id":     request.UserId,
			"type":        request.Type,
			"status":      request.Status,
			"created_at":  request.CreatedAt,
			"updated_at":  request.UpdatedAt,
			"documents":   request.Documents,
		},
	}

	result, err := requestCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update request with id: %s, error: %v", requestId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no request found with id: %s", requestId)
	}

	er.logger.Printf("Updated request with id: %s", requestId)
	return nil
}

func (er *EmploymentRepo) DeleteRequest(requestId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	requestCollection := OpenCollection(er.cli, "requests")
	objectId, err := primitive.ObjectIDFromHex(requestId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	result, err := requestCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete request with id: %s, error: %v", requestId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no request found with id: %s", requestId)
	}

	er.logger.Printf("Deleted request with id: %s", requestId)
	return nil
}

// Document CRUD operations
func (er *EmploymentRepo) CreateDocument(document *models.Document) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	documentCollection := OpenCollection(er.cli, "documents")
	document.ID = primitive.NewObjectID()
	result, err := documentCollection.InsertOne(ctx, &document)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return document.ID, nil
}

func (er *EmploymentRepo) GetDocument(documentId string) (*models.Document, error) {
	var document models.Document
	documentCollection := OpenCollection(er.cli, "documents")
	objectId, err := primitive.ObjectIDFromHex(documentId)
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = documentCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&document)
	if err != nil {
		return nil, fmt.Errorf("no document found for id: %s", documentId)
	}

	return &document, nil
}

func (er *EmploymentRepo) GetAllDocuments() ([]*models.Document, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	documentCollection := OpenCollection(er.cli, "documents")

	var documents []*models.Document
	cursor, err := documentCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &documents); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return documents, nil
}

func (er *EmploymentRepo) UpdateDocument(documentId string, document *models.Document) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	documentCollection := OpenCollection(er.cli, "documents")
	objectId, err := primitive.ObjectIDFromHex(documentId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"request_id": document.RequestId,
			"name":       document.Name,
			"file_path":  document.FilePath,
			"uploaded":   document.Uploaded,
		},
	}

	result, err := documentCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update document with id: %s, error: %v", documentId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no document found with id: %s", documentId)
	}

	er.logger.Printf("Updated document with id: %s", documentId)
	return nil
}

func (er *EmploymentRepo) DeleteDocument(documentId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	documentCollection := OpenCollection(er.cli, "documents")
	objectId, err := primitive.ObjectIDFromHex(documentId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	result, err := documentCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete document with id: %s, error: %v", documentId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no document found with id: %s", documentId)
	}

	er.logger.Printf("Deleted document with id: %s", documentId)
	return nil
}