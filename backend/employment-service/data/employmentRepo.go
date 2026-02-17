package data

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"employment-service/models"

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
	dburi := os.Getenv("MONGO_DB_URI")
	if dburi == "" {
		dburi = "mongodb://root:pass@employment_data_base:27017/employmentDB?authSource=admin"
	}

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
	dbName := os.Getenv("EMPLOYMENT_DB_HOST")
	if dbName == "" {
		dbName = "employmentDB" // fallback
	}
	var collection *mongo.Collection = client.Database(dbName).Collection(collectionName)
	return collection
}

// Messaging CRUD operations
func (er *EmploymentRepo) SendMessage(message *models.Message) (primitive.ObjectID, error) {
	collection := OpenCollection(er.cli, "messages")
	message.ID = primitive.NewObjectID()
	message.SentAt = time.Now()
	message.Read = false
	res, err := collection.InsertOne(context.Background(), message)
	if err != nil {
		return primitive.NilObjectID, err
	}
	oid, ok := res.InsertedID.(primitive.ObjectID)
	if !ok {
		return primitive.NilObjectID, fmt.Errorf("failed to get inserted message ID")
	}
	return oid, nil
}

func (er *EmploymentRepo) GetMessagesBetweenUsers(userAId, userBId string) ([]*models.Message, error) {
	collection := OpenCollection(er.cli, "messages")
	oidA, err := primitive.ObjectIDFromHex(userAId)
	if err != nil {
		return nil, err
	}
	oidB, err := primitive.ObjectIDFromHex(userBId)
	if err != nil {
		return nil, err
	}
	filter := bson.M{
		"$or": []bson.M{
			{"sender_id": oidA, "receiver_id": oidB},
			{"sender_id": oidB, "receiver_id": oidA},
		},
	}
	cursor, err := collection.Find(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	var messages []*models.Message
	if err := cursor.All(context.Background(), &messages); err != nil {
		return nil, err
	}
	return messages, nil
}

func (er *EmploymentRepo) MarkMessagesAsRead(senderId, receiverId string) error {
	collection := OpenCollection(er.cli, "messages")
	oidSender, err := primitive.ObjectIDFromHex(senderId)
	if err != nil {
		return err
	}
	oidReceiver, err := primitive.ObjectIDFromHex(receiverId)
	if err != nil {
		return err
	}
	filter := bson.M{"sender_id": oidSender, "receiver_id": oidReceiver, "read": false}
	_, err = collection.UpdateMany(context.Background(), filter, bson.M{"$set": bson.M{"read": true}})
	return err
}
// SavedJob CRUD operations

// Interview CRUD operations
func (er *EmploymentRepo) CreateInterview(interview *models.Interview) (primitive.ObjectID, error) {
	collection := OpenCollection(er.cli, "interviews")
	interview.ID = primitive.NewObjectID()
	interview.CreatedAt = time.Now()
	interview.UpdatedAt = time.Now()
	res, err := collection.InsertOne(context.Background(), interview)
	if err != nil {
		return primitive.NilObjectID, err
	}
	oid, ok := res.InsertedID.(primitive.ObjectID)
	if !ok {
		return primitive.NilObjectID, fmt.Errorf("failed to get inserted interview ID")
	}
	return oid, nil
}

func (er *EmploymentRepo) UpdateInterview(interviewId string, update bson.M) error {
	collection := OpenCollection(er.cli, "interviews")
	oid, err := primitive.ObjectIDFromHex(interviewId)
	if err != nil {
		return err
	}
	update["updated_at"] = time.Now()
	_, err = collection.UpdateOne(context.Background(), bson.M{"_id": oid}, bson.M{"$set": update})
	return err
}

func (er *EmploymentRepo) GetInterviewsByCandidate(candidateId string) ([]*models.Interview, error) {
	collection := OpenCollection(er.cli, "interviews")
	oid, err := primitive.ObjectIDFromHex(candidateId)
	if err != nil {
		return nil, err
	}
	cursor, err := collection.Find(context.Background(), bson.M{"candidate_id": oid})
	if err != nil {
		return nil, err
	}
	var interviews []*models.Interview
	if err := cursor.All(context.Background(), &interviews); err != nil {
		return nil, err
	}
	return interviews, nil
}

func (er *EmploymentRepo) GetInterviewsByEmployer(employerId string) ([]*models.Interview, error) {
	collection := OpenCollection(er.cli, "interviews")
	oid, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return nil, err
	}
	cursor, err := collection.Find(context.Background(), bson.M{"employer_id": oid})
	if err != nil {
		return nil, err
	}
	var interviews []*models.Interview
	if err := cursor.All(context.Background(), &interviews); err != nil {
		return nil, err
	}
	return interviews, nil
}
func (er *EmploymentRepo) SaveJob(candidateId, jobId primitive.ObjectID) error {
	collection := OpenCollection(er.cli, "saved_jobs")
	savedJob := models.SavedJob{
		ID: primitive.NewObjectID(),
		CandidateId: candidateId,
		JobId: jobId,
		SavedAt: time.Now(),
	}
	_, err := collection.InsertOne(context.Background(), savedJob)
	return err
}

func (er *EmploymentRepo) UnsaveJob(candidateId, jobId primitive.ObjectID) error {
	collection := OpenCollection(er.cli, "saved_jobs")
	_, err := collection.DeleteOne(context.Background(), bson.M{"candidate_id": candidateId, "job_id": jobId})
	return err
}

func (er *EmploymentRepo) GetSavedJobs(candidateId primitive.ObjectID) ([]models.SavedJob, error) {
	collection := OpenCollection(er.cli, "saved_jobs")
	cursor, err := collection.Find(context.Background(), bson.M{"candidate_id": candidateId})
	if err != nil {
		return nil, err
	}
	var savedJobs []models.SavedJob
	if err := cursor.All(context.Background(), &savedJobs); err != nil {
		return nil, err
	}
	return savedJobs, nil
}

// GetSavedJobsWithDetails returns saved jobs with full job listing details
func (er *EmploymentRepo) GetSavedJobsWithDetails(candidateId primitive.ObjectID) ([]*models.JobListing, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	savedJobsCollection := OpenCollection(er.cli, "saved_jobs")
	listingsCollection := OpenCollection(er.cli, "listings")

	// Get all saved job IDs
	cursor, err := savedJobsCollection.Find(ctx, bson.M{"candidate_id": candidateId})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var savedJobs []models.SavedJob
	if err := cursor.All(ctx, &savedJobs); err != nil {
		return nil, err
	}

	if len(savedJobs) == 0 {
		return []*models.JobListing{}, nil
	}

	// Extract job IDs
	jobIds := make([]primitive.ObjectID, len(savedJobs))
	for i, savedJob := range savedJobs {
		jobIds[i] = savedJob.JobId
	}

	// Get full job listings
	listingsCursor, err := listingsCollection.Find(ctx, bson.M{"_id": bson.M{"$in": jobIds}})
	if err != nil {
		return nil, err
	}
	defer listingsCursor.Close(ctx)

	var listings []*models.JobListing
	if err := listingsCursor.All(ctx, &listings); err != nil {
		return nil, err
	}

	return listings, nil
}

// CalculateJobMatchScore calculates how well a job matches a candidate's skills
// Returns a score from 0-100
func (er *EmploymentRepo) CalculateJobMatchScore(candidate *models.Candidate, job *models.JobListing) int {
	if candidate == nil || job == nil {
		return 0
	}

	score := 0
	candidateSkills := make(map[string]bool)
	for _, skill := range candidate.Skills {
		candidateSkills[strings.ToLower(strings.TrimSpace(skill))] = true
	}

	// Extract keywords from job description and position
	jobText := strings.ToLower(job.Description + " " + job.Position)

	// Count matching skills
	matchedSkills := 0
	for skill := range candidateSkills {
		if strings.Contains(jobText, skill) {
			matchedSkills++
		}
	}

	// Calculate score based on matched skills
	if len(candidate.Skills) > 0 {
		score = (matchedSkills * 100) / len(candidate.Skills)
	}

	// Bonus points for internship match
	if job.IsInternship && candidate.Year > 0 {
		score += 10
	}

	// Cap at 100
	if score > 100 {
		score = 100
	}

	return score
}

// GetJobRecommendationsForCandidate returns job recommendations with match scores
func (er *EmploymentRepo) GetJobRecommendationsForCandidate(candidateId string, limit int) ([]map[string]interface{}, error) {
	// Get candidate
	candidate, err := er.GetCandidate(candidateId)
	if err != nil {
		return nil, fmt.Errorf("candidate not found: %v", err)
	}

	// Get active approved jobs
	jobs, err := er.GetActiveJobs(limit * 2) // Get more to filter
	if err != nil {
		return nil, err
	}

	// Calculate match scores and create recommendations
	recommendations := make([]map[string]interface{}, 0)
	for _, job := range jobs {
		matchScore := er.CalculateJobMatchScore(candidate, job)
		recommendations = append(recommendations, map[string]interface{}{
			"job":        job,
			"match_score": matchScore,
		})
	}

	// Sort by match score (descending)
	sort.Slice(recommendations, func(i, j int) bool {
		return recommendations[i]["match_score"].(int) > recommendations[j]["match_score"].(int)
	})

	// Limit results
	if len(recommendations) > limit {
		recommendations = recommendations[:limit]
	}

	return recommendations, nil
}

// JobListing CRUD operations

func (er *EmploymentRepo) CreateJobListing(listing *models.JobListing) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	lisCollection := OpenCollection(er.cli, "listings")
	listing.ID = primitive.NewObjectID()

	// Set default approval status if not provided
	if listing.ApprovalStatus == "" {
		listing.ApprovalStatus = "pending"
	}

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
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

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
		err := er.DeleteApplication(app.ID.Hex())
		if err != nil {
			er.logger.Printf("Error deleting application: %s from listing: %s, error: %v", app.ID.Hex(), listingId, err)
		} else {
			er.logger.Printf("Deleting application: %s from listing: %s", app.ID.Hex(), listingId)
		}
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
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = appCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&application)
	if err != nil {
		return nil, fmt.Errorf("no applications not found for id: %s", applicationId)
	}

	return &application, nil
}

func (er *EmploymentRepo) GetApplicationsForJob(client *mongo.Client, listingID string) ([]*models.Application, error) {
	listingObjID, err := primitive.ObjectIDFromHex(listingID)
	if err != nil {
		return nil, fmt.Errorf("invalid listing ID: %v", err)
	}

	appCollection := OpenCollection(client, "applications")

	filter := bson.M{"listing_id": listingObjID}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := appCollection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("error querying applications: %v", err)
	}
	defer cursor.Close(ctx)

	var applications []*models.Application
	if err := cursor.All(ctx, &applications); err != nil {
		return nil, fmt.Errorf("error decoding applications: %v", err)
	}

	return applications, nil
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
	
	// If User already has an ID (from embedded User struct), use it as the employer's _id
	// Otherwise, generate a new ID
	if employer.User.ID.IsZero() {
		employer.ID = primitive.NewObjectID()
		employer.User.ID = employer.ID // Set User's ID to match employer's ID
	} else {
		employer.ID = employer.User.ID // Use User's ID as employer's ID
	}

	// Set default approval status if not provided
	if employer.ApprovalStatus == "" {
		employer.ApprovalStatus = "pending"
	}

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

// ClearTestData removes test employers and job listings
func (er *EmploymentRepo) ClearTestData() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Clear test employers (those with test email patterns)
	employerCollection := OpenCollection(er.cli, "employers")
	testEmployerFilter := bson.M{
		"$or": []bson.M{
			{"email": bson.M{"$regex": ".*@company\\.com$"}},
			{"email": bson.M{"$regex": ".*@test\\.com$"}},
			{"firm_name": bson.M{"$regex": ".*Tech Solutions.*"}},
			{"firm_name": bson.M{"$regex": ".*Test.*"}},
		},
	}

	employerResult, err := employerCollection.DeleteMany(ctx, testEmployerFilter)
	if err != nil {
		er.logger.Printf("Error clearing test employers: %v", err)
	} else {
		er.logger.Printf("Cleared %d test employers", employerResult.DeletedCount)
	}

	// Clear test job listings
	listingCollection := OpenCollection(er.cli, "listings")
	testListingFilter := bson.M{
		"$or": []bson.M{
			{"position": bson.M{"$regex": ".*Test.*"}},
			{"position": bson.M{"$regex": ".*Software Development Intern.*"}},
		},
	}

	listingResult, err := listingCollection.DeleteMany(ctx, testListingFilter)
	if err != nil {
		er.logger.Printf("Error clearing test job listings: %v", err)
	} else {
		er.logger.Printf("Cleared %d test job listings", listingResult.DeletedCount)
	}

	return nil
}

// Candidate CRUD operations

func (er *EmploymentRepo) CreateCandidate(candidate *models.Candidate) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	candidateCollection := OpenCollection(er.cli, "candidates")
	
	// If User already has an ID (from embedded User struct), use it as the candidate's _id
	// Otherwise, generate a new ID
	if candidate.User.ID.IsZero() {
		candidate.ID = primitive.NewObjectID()
		candidate.User.ID = candidate.ID // Set User's ID to match candidate's ID
	} else {
		candidate.ID = candidate.User.ID // Use User's ID as candidate's ID
	}

	// Set default values for new fields if not provided
	if candidate.Major == "" {
		candidate.Major = ""
	}
	if candidate.Year == 0 {
		candidate.Year = 1 // Default to first year
	}
	if candidate.GPA == 0 {
		candidate.GPA = 0.0
	}
	if candidate.HighschoolGPA == 0 {
		candidate.HighschoolGPA = 0.0
	}
	if candidate.ESBP == 0 {
		candidate.ESBP = 0
	}

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

func (er *EmploymentRepo) GetCandidateByUserID(userID string) (*models.Candidate, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	candidateCollection := OpenCollection(er.cli, "candidates")

	// Convert userID to ObjectID
	objectId, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %v", err)
	}

	var candidate models.Candidate
	// Since Candidate embeds User, and User has _id, search by _id directly
	// Also try searching by user_id field in case it exists
	err = candidateCollection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&candidate)
	if err != nil {
		// Fallback: try searching by user_id field if _id doesn't match
		err2 := candidateCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&candidate)
		if err2 != nil {
			return nil, fmt.Errorf("no candidate found for user id: %s", userID)
		}
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
		"$and": []bson.M{
			{
				"$or": []bson.M{
					{"position": bson.M{"$regex": query, "$options": "i"}},
					{"description": bson.M{"$regex": query, "$options": "i"}},
				},
			},
			{"approval_status": bson.M{"$regex": "^approved$", "$options": "i"}},
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
	cursor, err := collection.Find(ctx, filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{"created_at", -1}}))
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

	filter := bson.M{
		"$and": []bson.M{
			{"is_internship": isInternship},
			{"approval_status": bson.M{"$regex": "^approved$", "$options": "i"}},
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
	cursor, err := collection.Find(ctx, filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{"created_at", -1}}))
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
	cursor, err := collection.Find(ctx, filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{"first_name", 1}}))
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
	cursor, err := collection.Find(ctx, filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{"firm_name", 1}}))
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
	cursor, err := collection.Find(ctx, filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{"first_name", 1}}))
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
	cursor, err := collection.Find(ctx, filter, options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{"submitted_at", -1}}))
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
		"$and": []bson.M{
			{"created_at": bson.M{"$gte": time.Now().AddDate(0, 0, -7)}},
			{"approval_status": bson.M{"$regex": "^approved$", "$options": "i"}},
		},
	}

	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	cursor, err := collection.Find(ctx, filter, options.Find().SetLimit(int64(limit)).SetSort(bson.D{{"created_at", -1}}))
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
		"$and": []bson.M{
			{"expire_at": bson.M{"$gt": time.Now()}},
			{"approval_status": bson.M{"$regex": "^approved$", "$options": "i"}},
		},
	}

	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	cursor, err := collection.Find(ctx, filter, options.Find().SetLimit(int64(limit)).SetSort(bson.D{{"created_at", -1}}))
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

func (er *EmploymentRepo) ApproveEmployer(employerId, adminId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return fmt.Errorf("invalid employer ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"approval_status": "approved",
			"approved_at":     time.Now(),
			"approved_by":     adminId,
		},
	}

	// Find the employer by the ID (User is embedded, so _id is at top level)
	result, err := collection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("error approving employer: %v", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("employer not found")
	}

	er.logger.Printf("Employer %s approved by admin %s", employerId, adminId)

	// Create company profile for approved employer
	err = er.CreateCompanyProfile(employerId, adminId)
	if err != nil {
		er.logger.Printf("Failed to create company profile for employer %s: %v", employerId, err)
		// Don't fail the approval if company creation fails
	}

	return nil
}

func (er *EmploymentRepo) RejectEmployer(employerId, adminId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return fmt.Errorf("invalid employer ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"approval_status": "rejected",
			"approved_at":     time.Now(),
			"approved_by":     adminId,
		},
	}

	// Find the employer by the ID (User is embedded, so _id is at top level)
	result, err := collection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("error rejecting employer: %v", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("employer not found")
	}

	er.logger.Printf("Employer %s rejected by admin %s", employerId, adminId)
	return nil
}

func (er *EmploymentRepo) GetPendingEmployers() ([]*models.Employer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "employers")
	filter := bson.M{
		"$or": []bson.M{
			{"approval_status": "pending"},
			{"approval_status": "Pending"},
			{"approval_status": ""},
		},
	}

	er.logger.Printf("GetPendingEmployers: Filter: %+v", filter)

	cursor, err := collection.Find(ctx, filter, options.Find().SetSort(bson.D{{"created_at", -1}}))
	if err != nil {
		er.logger.Printf("GetPendingEmployers: Error finding employers: %v", err)
		return nil, err
	}
	defer cursor.Close(ctx)

	var employers []*models.Employer
	if err := cursor.All(ctx, &employers); err != nil {
		er.logger.Printf("GetPendingEmployers: Error decoding employers: %v", err)
		return nil, err
	}

	er.logger.Printf("GetPendingEmployers: Found %d employers", len(employers))
	return employers, nil
}

func (er *EmploymentRepo) ApproveJobListing(jobId, adminId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "listings")
	objectId, err := primitive.ObjectIDFromHex(jobId)
	if err != nil {
		return fmt.Errorf("invalid job ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"approval_status": "approved",
			"approved_at":     time.Now(),
			"approved_by":     adminId,
		},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("error approving job listing: %v", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("job listing not found")
	}

	er.logger.Printf("Job listing %s approved by admin %s", jobId, adminId)
	return nil
}

func (er *EmploymentRepo) RejectJobListing(jobId, adminId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "listings")
	objectId, err := primitive.ObjectIDFromHex(jobId)
	if err != nil {
		return fmt.Errorf("invalid job ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"approval_status": "rejected",
			"approved_at":     time.Now(),
			"approved_by":     adminId,
		},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("error rejecting job listing: %v", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("job listing not found")
	}

	er.logger.Printf("Job listing %s rejected by admin %s", jobId, adminId)
	return nil
}

func (er *EmploymentRepo) GetPendingJobListings() ([]*models.JobListing, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "listings")
	filter := bson.M{
		"$or": []bson.M{
			{"approval_status": "pending"},
			{"approval_status": "Pending"},
			{"approval_status": ""},
		},
	}

	cursor, err := collection.Find(ctx, filter, options.Find().SetSort(bson.D{{"created_at", -1}}))
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

func (er *EmploymentRepo) SuspendEmployer(employerId, adminId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return fmt.Errorf("invalid employer ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"approval_status": "suspended",
			"approved_at":     time.Now(),
			"approved_by":     adminId,
		},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("error suspending employer: %v", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("employer not found")
	}

	er.logger.Printf("Employer %s suspended by admin %s", employerId, adminId)
	return nil
}

func (er *EmploymentRepo) GetEmployerStats() (map[string]int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "employers")
	stats := make(map[string]int64)

	total, err := collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	stats["total"] = total

	pending, err := collection.CountDocuments(ctx, bson.M{"approval_status": "pending"})
	if err != nil {
		return nil, err
	}
	stats["pending"] = pending

	approved, err := collection.CountDocuments(ctx, bson.M{"approval_status": "approved"})
	if err != nil {
		return nil, err
	}
	stats["approved"] = approved

	rejected, err := collection.CountDocuments(ctx, bson.M{"approval_status": "rejected"})
	if err != nil {
		return nil, err
	}
	stats["rejected"] = rejected

	suspended, err := collection.CountDocuments(ctx, bson.M{"approval_status": "suspended"})
	if err != nil {
		return nil, err
	}
	stats["suspended"] = suspended

	return stats, nil
}

func (er *EmploymentRepo) CreateUnemployedRecord(record *models.UnemployedRecord) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	recordCollection := OpenCollection(er.cli, "unemployed_records")
	record.ID = primitive.NewObjectID()
	result, err := recordCollection.InsertOne(ctx, &record)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return record.ID, nil
}

func (er *EmploymentRepo) GetUnemployedRecord(recordId string) (*models.UnemployedRecord, error) {
	var record models.UnemployedRecord
	recordCollection := OpenCollection(er.cli, "unemployed_records")
	objectId, err := primitive.ObjectIDFromHex(recordId)
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = recordCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&record)
	if err != nil {
		return nil, fmt.Errorf("no unemployed record found for id: %s", recordId)
	}

	return &record, nil
}

func (er *EmploymentRepo) GetAllUnemployedRecords() ([]*models.UnemployedRecord, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	recordCollection := OpenCollection(er.cli, "unemployed_records")

	var records []*models.UnemployedRecord
	cursor, err := recordCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &records); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return records, nil
}

func (er *EmploymentRepo) UpdateUnemployedRecord(recordId string, record *models.UnemployedRecord) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	recordCollection := OpenCollection(er.cli, "unemployed_records")
	objectId, err := primitive.ObjectIDFromHex(recordId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"status":  record.Status,
			"updated": record.Updated,
			"office":  record.Office,
		},
	}

	result, err := recordCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update unemployed record with id: %s, error: %v", recordId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no unemployed record found with id: %s", recordId)
	}

	er.logger.Printf("Updated unemployed record with id: %s", recordId)
	return nil
}

func (er *EmploymentRepo) DeleteUnemployedRecord(recordId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	recordCollection := OpenCollection(er.cli, "unemployed_records")
	objectId, err := primitive.ObjectIDFromHex(recordId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	result, err := recordCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete unemployed record with id: %s, error: %v", recordId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no unemployed record found with id: %s", recordId)
	}

	er.logger.Printf("Deleted unemployed record with id: %s", recordId)
	return nil
}

func (er *EmploymentRepo) GetInternships(limit int) ([]*models.JobListing, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "listings")

	filter := bson.M{
		"is_internship":   "true",
		"expire_at":       bson.M{"$gt": time.Now()}, // Only active internships
		"approval_status": models.Approved,
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
		"is_internship": "Internship",
		"expire_at":     bson.M{"$gt": time.Now()}, // Only active internships
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

// Company CRUD operations

func (er *EmploymentRepo) CreateCompanyProfile(employerId, adminId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Get employer data
	employerCollection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return fmt.Errorf("invalid employer ID: %v", err)
	}

	var employer models.Employer
	err = employerCollection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&employer)
	if err != nil {
		return fmt.Errorf("employer not found: %v", err)
	}

	// Create company profile
	companyCollection := OpenCollection(er.cli, "companies")
	company := models.Company{
		ID:          primitive.NewObjectID(),
		EmployerId:  objectId,
		Name:        employer.FirmName,
		Description: employer.Delatnost,
		Address:     employer.FirmAddress,
		Phone:       employer.FirmPhone,
		PIB:         employer.PIB,
		MatBr:       employer.MatBr,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	_, err = companyCollection.InsertOne(ctx, &company)
	if err != nil {
		return fmt.Errorf("failed to create company profile: %v", err)
	}

	er.logger.Printf("Company profile created for employer %s", employerId)
	return nil
}

func (er *EmploymentRepo) GetCompanyByEmployerId(employerId string) (*models.Company, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	companyCollection := OpenCollection(er.cli, "companies")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return nil, fmt.Errorf("invalid employer ID: %v", err)
	}

	var company models.Company
	err = companyCollection.FindOne(ctx, bson.M{"employer_id": objectId}).Decode(&company)
	if err != nil {
		return nil, fmt.Errorf("company not found: %v", err)
	}

	return &company, nil
}

func (er *EmploymentRepo) UpdateCompany(companyId string, company *models.Company) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	companyCollection := OpenCollection(er.cli, "companies")
	objectId, err := primitive.ObjectIDFromHex(companyId)
	if err != nil {
		return fmt.Errorf("invalid company ID: %v", err)
	}

	company.UpdatedAt = time.Now()
	updateData := bson.M{
		"$set": bson.M{
			"name":         company.Name,
			"description":  company.Description,
			"website":      company.Website,
			"industry":     company.Industry,
			"size":         company.Size,
			"founded":      company.Founded,
			"logo":         company.Logo,
			"address":      company.Address,
			"phone":        company.Phone,
			"email":        company.Email,
			"pib":          company.PIB,
			"maticni_broj": company.MatBr,
			"updated_at":   company.UpdatedAt,
		},
	}

	result, err := companyCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("error updating company: %v", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("company not found")
	}

	return nil
}

func (er *EmploymentRepo) GetAllCompanies() ([]*models.Company, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	companyCollection := OpenCollection(er.cli, "companies")
	var companies []*models.Company
	cursor, err := companyCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &companies); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return companies, nil
}

func (er *EmploymentRepo) GetCompanyById(companyId string) (*models.Company, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	companyCollection := OpenCollection(er.cli, "companies")
	objectId, err := primitive.ObjectIDFromHex(companyId)
	if err != nil {
		return nil, fmt.Errorf("invalid company ID: %v", err)
	}

	var company models.Company
	err = companyCollection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&company)
	if err != nil {
		return nil, fmt.Errorf("company not found: %v", err)
	}

	return &company, nil
}

func (er *EmploymentRepo) GetApplicationsByCandidateId(candidateId string) ([]*models.Application, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	appCollection := OpenCollection(er.cli, "applications")
	objectId, err := primitive.ObjectIDFromHex(candidateId)
	if err != nil {
		return nil, fmt.Errorf("invalid candidate ID: %v", err)
	}

	var applications []*models.Application
	cursor, err := appCollection.Find(ctx, bson.M{"applicant_id": objectId})
	if err != nil {
		return nil, fmt.Errorf("error querying applications: %v", err)
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &applications); err != nil {
		return nil, fmt.Errorf("error decoding applications: %v", err)
	}

	return applications, nil
}

func (er *EmploymentRepo) GetApplicationsByEmployerId(employerId string) ([]*models.Application, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// First get all job listings by this employer
	jobCollection := OpenCollection(er.cli, "job_listings")
	employerObjectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return nil, fmt.Errorf("invalid employer ID: %v", err)
	}

	// Find all job listings by this employer
	cursor, err := jobCollection.Find(ctx, bson.M{"poster_id": employerObjectId})
	if err != nil {
		return nil, fmt.Errorf("error querying job listings: %v", err)
	}
	defer cursor.Close(ctx)

	var jobListings []*models.JobListing
	if err := cursor.All(ctx, &jobListings); err != nil {
		return nil, fmt.Errorf("error decoding job listings: %v", err)
	}

	if len(jobListings) == 0 {
		return []*models.Application{}, nil
	}

	// Get all job listing IDs
	var jobListingIds []primitive.ObjectID
	for _, job := range jobListings {
		jobListingIds = append(jobListingIds, job.ID)
	}

	// Find all applications for these job listings
	appCollection := OpenCollection(er.cli, "applications")
	appCursor, err := appCollection.Find(ctx, bson.M{"listing_id": bson.M{"$in": jobListingIds}})
	if err != nil {
		return nil, fmt.Errorf("error querying applications: %v", err)
	}
	defer appCursor.Close(ctx)

	var applications []*models.Application
	if err := appCursor.All(ctx, &applications); err != nil {
		return nil, fmt.Errorf("error decoding applications: %v", err)
	}

	return applications, nil
}

func (er *EmploymentRepo) UpdateApplicationStatus(applicationId, status, employerId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	appCollection := OpenCollection(er.cli, "applications")
	objectId, err := primitive.ObjectIDFromHex(applicationId)
	if err != nil {
		return fmt.Errorf("invalid application ID: %v", err)
	}

	// First verify that the application belongs to a job posted by this employer
	var application models.Application
	err = appCollection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&application)
	if err != nil {
		return fmt.Errorf("application not found: %v", err)
	}

	// Check if the job belongs to this employer
	jobCollection := OpenCollection(er.cli, "job_listings")
	employerObjectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return fmt.Errorf("invalid employer ID: %v", err)
	}

	var jobListing models.JobListing
	err = jobCollection.FindOne(ctx, bson.M{"_id": application.ListingId, "poster_id": employerObjectId}).Decode(&jobListing)
	if err != nil {
		return fmt.Errorf("application does not belong to this employer's job")
	}

	// Update the application status
	updateData := bson.M{
		"$set": bson.M{
			"status":     status,
			"updated_at": time.Now(),
		},
	}

	result, err := appCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("error updating application status: %v", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("application not found")
	}

	er.logger.Printf("Application %s %s by employer %s", applicationId, status, employerId)
	return nil
}

func (er *EmploymentRepo) UpdateApplicationStatusByAdmin(applicationId, status string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	appCollection := OpenCollection(er.cli, "applications")
	objectId, err := primitive.ObjectIDFromHex(applicationId)
	if err != nil {
		return fmt.Errorf("invalid application ID: %v", err)
	}

	// Update the application status (admin can update any application)
	updateData := bson.M{
		"$set": bson.M{
			"status":     status,
			"updated_at": time.Now(),
		},
	}

	result, err := appCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("error updating application status: %v", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("application not found")
	}

	er.logger.Printf("Application %s %s by admin", applicationId, status)
	return nil
}
