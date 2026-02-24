package data

import (
	"context"
	"fmt"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

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

	jobCollection := OpenCollection(er.cli, "job_listings")

	// poster_id in job_listings may be stored either as an ObjectID or as a string.
	// To be robust, try matching against both representations.
	filter := bson.M{"poster_id": employerId}
	if employerObjectId, err := primitive.ObjectIDFromHex(employerId); err == nil {
		filter = bson.M{
			"$or": []bson.M{
				{"poster_id": employerObjectId},
				{"poster_id": employerId},
			},
		}
	}

	cursor, err := jobCollection.Find(ctx, filter)
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

	var jobListingIds []primitive.ObjectID
	for _, job := range jobListings {
		jobListingIds = append(jobListingIds, job.ID)
	}

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

	var application models.Application
	err = appCollection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&application)
	if err != nil {
		return fmt.Errorf("application not found: %v", err)
	}

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

func (er *EmploymentRepo) GetCandidateApplicationStats(candidateId string) (map[string]interface{}, error) {
	applications, err := er.GetApplicationsByCandidateId(candidateId)
	if err != nil {
		return nil, err
	}

	pending := 0
	accepted := 0
	rejected := 0
	for _, app := range applications {
		switch app.Status {
		case "pending":
			pending++
		case "accepted":
			accepted++
		case "rejected":
			rejected++
		}
	}

	return map[string]interface{}{
		"total":              len(applications),
		"pending":            pending,
		"accepted":           accepted,
		"rejected":           rejected,
		"recent_applications": 0,
	}, nil
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
