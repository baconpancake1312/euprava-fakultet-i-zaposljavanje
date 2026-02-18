package data

import (
	"context"
	"fmt"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (er *EmploymentRepo) CreateEmployer(employer *models.Employer) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	employerCollection := OpenCollection(er.cli, "employers")

	if employer.User.ID.IsZero() {
		employer.ID = primitive.NewObjectID()
		employer.User.ID = employer.ID
	} else {
		employer.ID = employer.User.ID
	}

	if employer.ApprovalStatus == "" {
		employer.ApprovalStatus = "pending"
	}

	result, err := employerCollection.InsertOne(ctx, &employer)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return employer.ID, nil
}

func (er *EmploymentRepo) GetEmployer(employerId string) (*models.Employer, error) {
	var employer models.Employer
	employerCollection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = employerCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&employer)
	if err != nil {
		return nil, fmt.Errorf("no employer found for id: %s", employerId)
	}

	return &employer, nil
}

func (er *EmploymentRepo) GetEmployerByUserID(userID string) (*models.Employer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	employerCollection := OpenCollection(er.cli, "employers")

	objectId, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %v", err)
	}

	var employer models.Employer
	err = employerCollection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&employer)
	if err != nil {
		err2 := employerCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&employer)
		if err2 != nil {
			return nil, fmt.Errorf("no employer found for user id: %s", userID)
		}
	}

	return &employer, nil
}

func (er *EmploymentRepo) GetAllEmployers() ([]*models.Employer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	employerCollection := OpenCollection(er.cli, "employers")

	var employers []*models.Employer
	cursor, err := employerCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &employers); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return employers, nil
}

func (er *EmploymentRepo) UpdateEmployer(employerId string, employer *models.Employer) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	employerCollection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"first_name":   employer.FirstName,
			"last_name":    employer.LastName,
			"email":        employer.Email,
			"phone":        employer.Phone,
			"address":      employer.Address,
			"jmbg":         employer.JMBG,
			"firm_name":    employer.FirmName,
			"pib":          employer.PIB,
			"maticni_broj": employer.MatBr,
			"delatnost":    employer.Delatnost,
			"firm_address": employer.FirmAddress,
			"firm_phone":   employer.FirmPhone,
		},
	}

	result, err := employerCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update employer with id: %s, error: %v", employerId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no employer found with id: %s", employerId)
	}

	er.logger.Printf("Updated employer with id: %s", employerId)
	return nil
}

func (er *EmploymentRepo) DeleteEmployer(employerId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	employerCollection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	result, err := employerCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete employer with id: %s, error: %v", employerId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no employer found with id: %s", employerId)
	}

	er.logger.Printf("Deleted employer with id: %s", employerId)
	return nil
}

func (er *EmploymentRepo) ApproveEmployer(employerId, adminId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return fmt.Errorf("invalid employer ID: %v", err)
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
		return fmt.Errorf("error approving employer: %v", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("employer not found")
	}

	er.logger.Printf("Employer %s approved by admin %s", employerId, adminId)

	err = er.CreateCompanyProfile(employerId, adminId)
	if err != nil {
		er.logger.Printf("Failed to create company profile for employer %s: %v", employerId, err)
	}

	return nil
}

func (er *EmploymentRepo) RejectEmployer(employerId, adminId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return fmt.Errorf("invalid employer ID: %v", err)
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
		return fmt.Errorf("error rejecting employer: %v", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("employer not found")
	}

	er.logger.Printf("Employer %s rejected by admin %s", employerId, adminId)
	return nil
}

func (er *EmploymentRepo) GetPendingEmployers() ([]*models.Employer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "employers")

	filter := bson.M{
		"$or": []bson.M{
			{"approval_status": "pending"},
			{"approval_status": bson.M{"$exists": false}},
		},
	}

	er.logger.Printf("GetPendingEmployers: Filter: %+v", filter)

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		er.logger.Printf("GetPendingEmployers: Error finding employers: %v", err)
		return nil, err
	}
	defer cursor.Close(ctx)

	var employers []*models.Employer
	if err := cursor.All(ctx, &employers); err != nil {
		er.logger.Printf("GetPendingEmployers: Error decoding employers: %v", err)
		return nil, err
	}

	er.logger.Printf("GetPendingEmployers: Found %d employers", len(employers))
	return employers, nil
}

func (er *EmploymentRepo) GetEmployerStats() (map[string]int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "employers")
	stats := make(map[string]int64)

	total, err := collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	stats["total"] = total

	pending, err := collection.CountDocuments(ctx, bson.M{"approval_status": "pending"})
	if err != nil {
		return nil, err
	}
	stats["pending"] = pending

	approved, err := collection.CountDocuments(ctx, bson.M{"approval_status": "approved"})
	if err != nil {
		return nil, err
	}
	stats["approved"] = approved

	rejected, err := collection.CountDocuments(ctx, bson.M{"approval_status": "rejected"})
	if err != nil {
		return nil, err
	}
	stats["rejected"] = rejected

	suspended, err := collection.CountDocuments(ctx, bson.M{"approval_status": "suspended"})
	if err != nil {
		return nil, err
	}
	stats["suspended"] = suspended

	return stats, nil
}

func (er *EmploymentRepo) SuspendEmployer(employerId, adminId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return fmt.Errorf("invalid employer ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"approval_status": "suspended",
			"approved_at":     time.Now(),
			"approved_by":     adminId,
		},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("error suspending employer: %v", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("employer not found")
	}

	er.logger.Printf("Employer %s suspended by admin %s", employerId, adminId)
	return nil
}
