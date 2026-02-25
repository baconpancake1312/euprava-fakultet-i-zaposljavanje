package data

import (
	"context"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Basic NSZ-like persistence helpers

func (er *EmploymentRepo) CreateBenefitClaim(candidateID primitive.ObjectID, reason string) (*models.BenefitClaim, error) {
	col := OpenCollection(er.cli, "benefit_claims")
	claim := &models.BenefitClaim{
		ID:          primitive.NewObjectID(),
		CandidateId: candidateID,
		Reason:      reason,
		Status:      "submitted",
		CreatedAt:   time.Now(),
	}
	_, err := col.InsertOne(context.Background(), claim)
	return claim, err
}

func (er *EmploymentRepo) GetBenefitClaimsByCandidate(candidateID primitive.ObjectID) ([]*models.BenefitClaim, error) {
	col := OpenCollection(er.cli, "benefit_claims")
	cur, err := col.Find(context.Background(), bson.M{"candidate_id": candidateID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(context.Background())

	var claims []*models.BenefitClaim
	if err := cur.All(context.Background(), &claims); err != nil {
		return nil, err
	}
	return claims, nil
}

// Admin helpers

func (er *EmploymentRepo) GetAllBenefitClaims() ([]*models.BenefitClaim, error) {
	col := OpenCollection(er.cli, "benefit_claims")
	cur, err := col.Find(context.Background(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(context.Background())

	var claims []*models.BenefitClaim
	if err := cur.All(context.Background(), &claims); err != nil {
		return nil, err
	}
	return claims, nil
}

func (er *EmploymentRepo) UpdateBenefitClaimStatus(id primitive.ObjectID, status string) error {
	col := OpenCollection(er.cli, "benefit_claims")
	_, err := col.UpdateOne(
		context.Background(),
		bson.M{"_id": id},
		bson.M{
			"$set": bson.M{
				"status":     status,
				"updated_at": time.Now(),
			},
		},
	)
	return err
}

func (er *EmploymentRepo) CreateStateCompetitionApplication(candidateID primitive.ObjectID, title, issuer string) (*models.StateCompetitionApplication, error) {
	col := OpenCollection(er.cli, "state_competition_applications")
	app := &models.StateCompetitionApplication{
		ID:          primitive.NewObjectID(),
		CandidateId: candidateID,
		Title:       title,
		Issuer:      issuer,
		Status:      "submitted",
		SubmittedAt: time.Now(),
	}
	_, err := col.InsertOne(context.Background(), app)
	return app, err
}

func (er *EmploymentRepo) GetCompetitionApplicationsByCandidate(candidateID primitive.ObjectID) ([]*models.StateCompetitionApplication, error) {
	col := OpenCollection(er.cli, "state_competition_applications")
	cur, err := col.Find(context.Background(), bson.M{"candidate_id": candidateID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(context.Background())

	var apps []*models.StateCompetitionApplication
	if err := cur.All(context.Background(), &apps); err != nil {
		return nil, err
	}
	return apps, nil
}

func (er *EmploymentRepo) GetAllCompetitionApplications() ([]*models.StateCompetitionApplication, error) {
	col := OpenCollection(er.cli, "state_competition_applications")
	cur, err := col.Find(context.Background(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(context.Background())

	var apps []*models.StateCompetitionApplication
	if err := cur.All(context.Background(), &apps); err != nil {
		return nil, err
	}
	return apps, nil
}

func (er *EmploymentRepo) UpdateCompetitionApplicationStatus(id primitive.ObjectID, status string) error {
	col := OpenCollection(er.cli, "state_competition_applications")
	_, err := col.UpdateOne(
		context.Background(),
		bson.M{"_id": id},
		bson.M{
			"$set": bson.M{
				"status":     status,
				"updated_at": time.Now(),
			},
		},
	)
	return err
}

func (er *EmploymentRepo) CreateStateCommunication(candidateID primitive.ObjectID, subject, message string) (*models.StateCommunication, error) {
	col := OpenCollection(er.cli, "state_communications")
	com := &models.StateCommunication{
		ID:          primitive.NewObjectID(),
		CandidateId: candidateID,
		Subject:     subject,
		Message:     message,
		Status:      "open",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	_, err := col.InsertOne(context.Background(), com)
	return com, err
}

func (er *EmploymentRepo) GetStateCommunicationsByCandidate(candidateID primitive.ObjectID) ([]*models.StateCommunication, error) {
	col := OpenCollection(er.cli, "state_communications")
	cur, err := col.Find(context.Background(), bson.M{"candidate_id": candidateID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(context.Background())

	var comms []*models.StateCommunication
	if err := cur.All(context.Background(), &comms); err != nil {
		return nil, err
	}
	return comms, nil
}

func (er *EmploymentRepo) GetAllStateCommunications() ([]*models.StateCommunication, error) {
	col := OpenCollection(er.cli, "state_communications")
	cur, err := col.Find(context.Background(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(context.Background())

	var comms []*models.StateCommunication
	if err := cur.All(context.Background(), &comms); err != nil {
		return nil, err
	}
	return comms, nil
}

func (er *EmploymentRepo) UpdateStateCommunication(id primitive.ObjectID, status, response string) error {
	col := OpenCollection(er.cli, "state_communications")

	update := bson.M{
		"status":     status,
		"updated_at": time.Now(),
	}
	if response != "" {
		update["response"] = response
	}

	_, err := col.UpdateOne(
		context.Background(),
		bson.M{"_id": id},
		bson.M{"$set": update},
	)
	return err
}

