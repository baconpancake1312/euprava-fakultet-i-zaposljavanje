package data

import (
	"context"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (er *EmploymentRepo) SaveJob(candidateId, jobId primitive.ObjectID) error {
	collection := OpenCollection(er.cli, "saved_jobs")
	savedJob := models.SavedJob{
		ID:          primitive.NewObjectID(),
		CandidateId: candidateId,
		JobId:       jobId,
		SavedAt:     time.Now(),
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

func (er *EmploymentRepo) GetSavedJobsWithDetails(candidateId primitive.ObjectID) ([]*models.JobListing, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	savedJobsCollection := OpenCollection(er.cli, "saved_jobs")
	listingsCollection := OpenCollection(er.cli, "listings")

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

	jobIds := make([]primitive.ObjectID, len(savedJobs))
	for i, savedJob := range savedJobs {
		jobIds[i] = savedJob.JobId
	}

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
