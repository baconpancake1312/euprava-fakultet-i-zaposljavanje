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
		os.Getenv("MONGO_INITDB_ROOT_PASSWORD"), 
		os.Getenv("DORM_DB_HOST"), 
		os.Getenv("DORM_DB_PORT"))

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

func (er *EmploymentRepo) CreateJobListing(listing *models.JobListing) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	lisCollection := OpenCollection(er.cli, "listings")
	listing.ID = primitive.NewObjectID()
	result, err := lisCollection.InsertOne(ctx, &listing)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return listing.ID, nil
}

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
			"expire_at":     listing.ExpireAt,
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
		er.DeleteApplication(app.ID.Hex())
		if err != nil {
			return fmt.Errorf("could not delete applications for job listing with id: %s, error: %v", listingId, err)
		} else {
			er.logger.Printf("Deleting application: %s from listing: %s", app.ID.Hex(), listingId)
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

func (er *EmploymentRepo) CreateApplication(application *models.Application) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	selCollection := OpenCollection(er.cli, "applications")
	application.ID = primitive.NewObjectID()
	result, err := selCollection.InsertOne(ctx, &application)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return application.ID, nil
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

// Employer CRUD operations

func (er *EmploymentRepo) CreateEmployer(employer *models.Employer) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	employerCollection := OpenCollection(er.cli, "employers")
	employer.ID = primitive.NewObjectID()
	result, err := employerCollection.InsertOne(ctx, &employer)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return employer.ID, nil
}

func (er *EmploymentRepo) GetEmployer(employerId string) (*models.Employer, error) {
	var employer models.Employer
	employerCollection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = employerCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&employer)
	if err != nil {
		return nil, fmt.Errorf("no employer found for id: %s", employerId)
	}

	return &employer, nil
}

func (er *EmploymentRepo) GetAllEmployers() ([]*models.Employer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	employerCollection := OpenCollection(er.cli, "employers")

	var employers []*models.Employer
	cursor, err := employerCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &employers); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return employers, nil
}

func (er *EmploymentRepo) UpdateEmployer(employerId string, employer *models.Employer) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	employerCollection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"first_name":   employer.FirstName,
			"last_name":    employer.LastName,
			"email":        employer.Email,
			"phone":        employer.Phone,
			"address":      employer.Address,
			"jmbg":         employer.JMBG,
			"firm_name":    employer.FirmName,
			"pib":          employer.PIB,
			"maticni_broj": employer.MatBr,
			"delatnost":    employer.Delatnost,
			"firm_address": employer.FirmAddress,
			"firm_phone":   employer.FirmPhone,
		},
	}

	result, err := employerCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update employer with id: %s, error: %v", employerId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no employer found with id: %s", employerId)
	}

	er.logger.Printf("Updated employer with id: %s", employerId)
	return nil
}

func (er *EmploymentRepo) DeleteEmployer(employerId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	employerCollection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	result, err := employerCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete employer with id: %s, error: %v", employerId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no employer found with id: %s", employerId)
	}

	er.logger.Printf("Deleted employer with id: %s", employerId)
	return nil
}

// Candidate CRUD operations

func (er *EmploymentRepo) CreateCandidate(candidate *models.Candidate) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	candidateCollection := OpenCollection(er.cli, "candidates")
	candidate.ID = primitive.NewObjectID()
	result, err := candidateCollection.InsertOne(ctx, &candidate)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return candidate.ID, nil
}

func (er *EmploymentRepo) GetCandidate(candidateId string) (*models.Candidate, error) {
	var candidate models.Candidate
	candidateCollection := OpenCollection(er.cli, "candidates")
	objectId, err := primitive.ObjectIDFromHex(candidateId)
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = candidateCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&candidate)
	if err != nil {
		return nil, fmt.Errorf("no candidate found for id: %s", candidateId)
	}

	return &candidate, nil
}

func (er *EmploymentRepo) GetAllCandidates() ([]*models.Candidate, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	candidateCollection := OpenCollection(er.cli, "candidates")

	var candidates []*models.Candidate
	cursor, err := candidateCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &candidates); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return candidates, nil
}

func (er *EmploymentRepo) UpdateCandidate(candidateId string, candidate *models.Candidate) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	candidateCollection := OpenCollection(er.cli, "candidates")
	objectId, err := primitive.ObjectIDFromHex(candidateId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"first_name": candidate.FirstName,
			"last_name":  candidate.LastName,
			"email":      candidate.Email,
			"phone":      candidate.Phone,
			"address":    candidate.Address,
			"jmbg":       candidate.JMBG,
			"cv_file":    candidate.CVFile,
			"cv_base64":  candidate.CVBase64,
			"skills":     candidate.Skills,
		},
	}

	result, err := candidateCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update candidate with id: %s, error: %v", candidateId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no candidate found with id: %s", candidateId)
	}

	er.logger.Printf("Updated candidate with id: %s", candidateId)
	return nil
}

func (er *EmploymentRepo) DeleteCandidate(candidateId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	candidateCollection := OpenCollection(er.cli, "candidates")
	objectId, err := primitive.ObjectIDFromHex(candidateId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	result, err := candidateCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete candidate with id: %s, error: %v", candidateId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no candidate found with id: %s", candidateId)
	}

	er.logger.Printf("Deleted candidate with id: %s", candidateId)
	return nil
}

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
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"email":      user.Email,
			"phone":      user.Phone,
			"address":    user.Address,
			"jmbg":       user.JMBG,
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

func (er *EmploymentRepo) SearchJobsByText(query string, page, limit int) ([]*models.JobListing, int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "listings")

	filter := bson.M{
		"$or": []bson.M{
			{"position": bson.M{"$regex": query, "$options": "i"}},
			{"description": bson.M{"$regex": query, "$options": "i"}},
		},
	}

	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	skip := (page - 1) * limit
	cursor, err := collection.Find(ctx, filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var jobs []*models.JobListing
	if err := cursor.All(ctx, &jobs); err != nil {
		return nil, 0, err
	}

	return jobs, total, nil
}

func (er *EmploymentRepo) SearchJobsByInternship(isInternship bool, page, limit int) ([]*models.JobListing, int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "listings")

	filter := bson.M{"is_internship": isInternship}

	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	skip := (page - 1) * limit
	cursor, err := collection.Find(ctx, filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var jobs []*models.JobListing
	if err := cursor.All(ctx, &jobs); err != nil {
		return nil, 0, err
	}

	return jobs, total, nil
}

func (er *EmploymentRepo) SearchUsersByText(query string, page, limit int) ([]*models.User, int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "users")

	filter := bson.M{
		"$or": []bson.M{
			{"first_name": bson.M{"$regex": query, "$options": "i"}},
			{"last_name": bson.M{"$regex": query, "$options": "i"}},
			{"email": bson.M{"$regex": query, "$options": "i"}},
		},
	}

	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	skip := (page - 1) * limit
	cursor, err := collection.Find(ctx, filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "first_name", Value: 1}}))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var users []*models.User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (er *EmploymentRepo) SearchEmployersByText(query string, page, limit int) ([]*models.Employer, int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "employers")

	filter := bson.M{
		"$or": []bson.M{
			{"firm_name": bson.M{"$regex": query, "$options": "i"}},
			{"delatnost": bson.M{"$regex": query, "$options": "i"}},
			{"firm_address": bson.M{"$regex": query, "$options": "i"}},
		},
	}

	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	skip := (page - 1) * limit
	cursor, err := collection.Find(ctx, filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "firm_name", Value: 1}}))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var employers []*models.Employer
	if err := cursor.All(ctx, &employers); err != nil {
		return nil, 0, err
	}

	return employers, total, nil
}

func (er *EmploymentRepo) SearchCandidatesByText(query string, page, limit int) ([]*models.Candidate, int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "candidates")

	filter := bson.M{
		"$or": []bson.M{
			{"first_name": bson.M{"$regex": query, "$options": "i"}},
			{"last_name": bson.M{"$regex": query, "$options": "i"}},
			{"email": bson.M{"$regex": query, "$options": "i"}},
			{"skills": bson.M{"$in": []string{query}}},
		},
	}

	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	skip := (page - 1) * limit
	cursor, err := collection.Find(ctx, filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "first_name", Value: 1}}))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var candidates []*models.Candidate
	if err := cursor.All(ctx, &candidates); err != nil {
		return nil, 0, err
	}

	return candidates, total, nil
}

func (er *EmploymentRepo) SearchApplicationsByStatus(status string, page, limit int) ([]*models.Application, int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "applications")

	filter := bson.M{"status": bson.M{"$regex": status, "$options": "i"}}

	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	skip := (page - 1) * limit
	cursor, err := collection.Find(ctx, filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "submitted_at", Value: -1}}))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var applications []*models.Application
	if err := cursor.All(ctx, &applications); err != nil {
		return nil, 0, err
	}

	return applications, total, nil
}

func (er *EmploymentRepo) GetRecentJobs(limit int) ([]*models.JobListing, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "listings")

	filter := bson.M{
		"created_at": bson.M{"$gte": time.Now().AddDate(0, 0, -7)},
	}

	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	cursor, err := collection.Find(ctx, filter, options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var jobs []*models.JobListing
	if err := cursor.All(ctx, &jobs); err != nil {
		return nil, err
	}

	return jobs, nil
}

func (er *EmploymentRepo) GetActiveJobs(limit int) ([]*models.JobListing, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "listings")

	filter := bson.M{
		"expire_at": bson.M{"$gt": time.Now()},
	}

	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	cursor, err := collection.Find(ctx, filter, options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var jobs []*models.JobListing
	if err := cursor.All(ctx, &jobs); err != nil {
		return nil, err
	}

	return jobs, nil
}

// GetInternships returns all job listings with position "Internship"
func (er *EmploymentRepo) GetInternships(limit int) ([]*models.JobListing, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "listings")

	filter := bson.M{
		"position":  "Internship",
		"expire_at": bson.M{"$gt": time.Now()}, // Only active internships
	}

	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	cursor, err := collection.Find(ctx, filter, options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var internships []*models.JobListing
	if err := cursor.All(ctx, &internships); err != nil {
		return nil, err
	}

	return internships, nil
}

// GetInternshipsForStudent returns internships for a specific student (with pagination)
func (er *EmploymentRepo) GetInternshipsForStudent(studentId string, page, limit int) ([]*models.JobListing, int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "listings")

	filter := bson.M{
		"position":  "Internship",
		"expire_at": bson.M{"$gt": time.Now()}, // Only active internships
	}

	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	skip := (page - 1) * limit
	cursor, err := collection.Find(ctx, filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var internships []*models.JobListing
	if err := cursor.All(ctx, &internships); err != nil {
		return nil, 0, err
	}

	return internships, total, nil
}
