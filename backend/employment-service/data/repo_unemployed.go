package data

import (
	"context"
	"fmt"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

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
			"user_id":  record.UserId,
			"status":   record.Status,
			"updated":  time.Now(),
			"office":   record.Office,
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
