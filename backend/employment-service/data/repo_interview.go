package data

import (
	"context"
	"fmt"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

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
