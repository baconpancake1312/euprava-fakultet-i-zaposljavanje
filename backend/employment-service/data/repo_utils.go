package data

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func (er *EmploymentRepo) ClearTestData() error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	candidateCollection := OpenCollection(er.cli, "candidates")
	testCandidateFilter := bson.M{
		"$or": []bson.M{
			{"first_name": bson.M{"$regex": ".*Test.*"}},
			{"email": bson.M{"$regex": ".*test.*"}},
		},
	}

	candidateResult, err := candidateCollection.DeleteMany(ctx, testCandidateFilter)
	if err != nil {
		er.logger.Printf("Error clearing test candidates: %v", err)
	} else {
		er.logger.Printf("Cleared %d test candidates", candidateResult.DeletedCount)
	}

	employerCollection := OpenCollection(er.cli, "employers")
	testEmployerFilter := bson.M{
		"$or": []bson.M{
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
