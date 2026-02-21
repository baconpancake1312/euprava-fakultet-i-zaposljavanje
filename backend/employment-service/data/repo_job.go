package data

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (er *EmploymentRepo) CalculateJobMatchScore(candidate *models.Candidate, job *models.JobListing) int {
	if candidate == nil || job == nil {
		return 0
	}

	score := 0
	candidateSkills := make(map[string]bool)
	for _, skill := range candidate.Skills {
		candidateSkills[strings.ToLower(strings.TrimSpace(skill))] = true
	}

	jobText := strings.ToLower(job.Description + " " + job.Position)

	matchedSkills := 0
	for skill := range candidateSkills {
		if strings.Contains(jobText, skill) {
			matchedSkills++
		}
	}

	if len(candidate.Skills) > 0 {
		score = (matchedSkills * 100) / len(candidate.Skills)
	}

	if job.IsInternship && candidate.Year > 0 {
		score += 10
	}

	if score > 100 {
		score = 100
	}

	return score
}

func (er *EmploymentRepo) GetJobRecommendationsForCandidate(candidateId string, limit int) ([]map[string]interface{}, error) {
	candidate, err := er.GetCandidate(candidateId)
	if err != nil {
		return nil, fmt.Errorf("candidate not found: %v", err)
	}

	jobs, err := er.GetActiveJobs(limit * 2)
	if err != nil {
		return nil, err
	}

	recommendations := make([]map[string]interface{}, 0)
	for _, job := range jobs {
		matchScore := er.CalculateJobMatchScore(candidate, job)
		recommendations = append(recommendations, map[string]interface{}{
			"job":        job,
			"match_score": matchScore,
		})
	}

	sort.Slice(recommendations, func(i, j int) bool {
		return recommendations[i]["match_score"].(int) > recommendations[j]["match_score"].(int)
	})

	if len(recommendations) > limit {
		recommendations = recommendations[:limit]
	}

	return recommendations, nil
}

func (er *EmploymentRepo) CreateJobListing(listing *models.JobListing) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	lisCollection := OpenCollection(er.cli, "listings")
	listing.ID = primitive.NewObjectID()

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

func (er *EmploymentRepo) GetInternships(limit int) ([]*models.JobListing, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "listings")

	filter := bson.M{
		"is_internship":   "true",
		"expire_at":       bson.M{"$gt": time.Now()},
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

func (er *EmploymentRepo) GetInternshipsForStudent(studentId string, page, limit int) ([]*models.JobListing, int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "listings")

	filter := bson.M{
		"is_internship": "Internship",
		"expire_at":     bson.M{"$gt": time.Now()},
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
