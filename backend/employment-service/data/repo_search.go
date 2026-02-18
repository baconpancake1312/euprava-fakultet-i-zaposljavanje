package data

import (
	"context"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

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
			{"major": bson.M{"$regex": query, "$options": "i"}},
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
