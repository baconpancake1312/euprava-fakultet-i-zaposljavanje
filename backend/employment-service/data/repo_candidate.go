package data

import (
	"context"
	"fmt"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (er *EmploymentRepo) CreateCandidate(candidate *models.Candidate) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	candidateCollection := OpenCollection(er.cli, "candidates")

	if !candidate.User.ID.IsZero() {
		candidate.ID = candidate.User.ID
	} else if candidate.ID.IsZero() {
		candidate.ID = primitive.NewObjectID()
		candidate.User.ID = candidate.ID
	}

	if candidate.Major == "" {
		candidate.Major = ""
	}
	if candidate.Year == 0 {
		candidate.Year = 1
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
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var candidate models.Candidate
	candidateCollection := OpenCollection(er.cli, "candidates")

	objectId, err := primitive.ObjectIDFromHex(candidateId)
	if err != nil {
		// Not a valid ObjectID — try matching as string user_id
		err2 := candidateCollection.FindOne(ctx, bson.M{"user_id": candidateId}).Decode(&candidate)
		if err2 != nil {
			return nil, fmt.Errorf("no candidate found for id: %s", candidateId)
		}
		return &candidate, nil
	}

	// Candidate embeds User directly (flat document), so _id IS the auth user ID.
	// Also check user_id for legacy documents.
	err = candidateCollection.FindOne(ctx, bson.M{
		"$or": []bson.M{
			{"_id": objectId},
			{"user_id": objectId},
		},
	}).Decode(&candidate)
	if err != nil {
		return nil, fmt.Errorf("no candidate found for id: %s", candidateId)
	}

	return &candidate, nil
}

func (er *EmploymentRepo) GetCandidateByUserID(userID string) (*models.Candidate, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	candidateCollection := OpenCollection(er.cli, "candidates")

	objectId, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		// Not a valid ObjectID — try string user_id
		var candidate models.Candidate
		err2 := candidateCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&candidate)
		if err2 != nil {
			return nil, fmt.Errorf("no candidate found for user id: %s", userID)
		}
		return &candidate, nil
	}

	var candidate models.Candidate
	// Candidate embeds User directly (flat document), so _id IS the auth user ID.
	// Also check user_id for legacy documents.
	err = candidateCollection.FindOne(ctx, bson.M{
		"$or": []bson.M{
			{"_id": objectId},
			{"user_id": objectId},
		},
	}).Decode(&candidate)
	if err != nil {
		return nil, fmt.Errorf("no candidate found for user id: %s", userID)
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
			"first_name":    candidate.FirstName,
			"last_name":     candidate.LastName,
			"email":         candidate.Email,
			"phone":         candidate.Phone,
			"address":       candidate.Address,
			"jmbg":          candidate.JMBG,
			"major":         candidate.Major,
			"year":          candidate.Year,
			"scholarship":   candidate.Scholarship,
			"highschool_gpa": candidate.HighschoolGPA,
			"gpa":           candidate.GPA,
			"esbp":          candidate.ESBP,
			"cv_file":       candidate.CVFile,
			"cv_base64":     candidate.CVBase64,
			"skills":        candidate.Skills,
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
