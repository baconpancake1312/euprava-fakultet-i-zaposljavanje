package data

import (
	"context"
	"fmt"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

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
			{"approval_status": bson.M{"$exists": false}},
		},
	}

	cursor, err := collection.Find(ctx, filter)
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
