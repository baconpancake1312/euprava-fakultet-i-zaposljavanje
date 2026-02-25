package data

import (
	"context"
	"fmt"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
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

	if candidate.Year == 0 {
		candidate.Year = 1
	}

	// Build an explicit BSON document so _id is always set correctly.
	// Using ReplaceOne with upsert so that re-submitting the form updates the
	// existing record instead of attempting a duplicate insert.
	doc := bson.M{
		"_id":               candidate.ID,
		"first_name":        candidate.FirstName,
		"last_name":         candidate.LastName,
		"email":             candidate.Email,
		"phone":             candidate.Phone,
		"address":           candidate.Address,
		"date_of_birth":     candidate.DateOfBirth,
		"jmbg":              candidate.JMBG,
		"user_type":         candidate.UserType,
		"major":             candidate.Major,
		"year":              candidate.Year,
		"scholarship":       candidate.Scholarship,
		"highschool_gpa":    candidate.HighschoolGPA,
		"gpa":               candidate.GPA,
		"esbp":              candidate.ESBP,
		"cv_file":           candidate.CVFile,
		"cv_base64":         candidate.CVBase64,
		"skills":            candidate.Skills,
		"profile_pic_base64": candidate.ProfilePicBase64,
	}

	filter := bson.M{"_id": candidate.ID}
	result, err := candidateCollection.ReplaceOne(ctx, filter, doc, options.Replace().SetUpsert(true))
	if err != nil {
		er.logger.Printf("[CreateCandidate] ReplaceOne error: %v", err)
		return primitive.NewObjectID(), fmt.Errorf("failed to save candidate: %v", err)
	}

	if result.UpsertedID != nil {
		er.logger.Printf("[CreateCandidate] Inserted new candidate with _id: %v", result.UpsertedID)
	} else {
		er.logger.Printf("[CreateCandidate] Updated existing candidate with _id: %v", candidate.ID.Hex())
	}
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
			"profile_pic_base64": candidate.ProfilePicBase64,
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
