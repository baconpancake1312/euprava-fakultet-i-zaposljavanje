package data

import (
	"context"
	"fmt"
	"strings"
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
	
	// Use the same flexible filter as ApproveEmployer
	filter, err := er.findEmployerFilter(employerId)
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = employerCollection.FindOne(context.Background(), filter).Decode(&employer)
	if err != nil {
		return nil, fmt.Errorf("no employer found for id: %s", employerId)
	}

	return &employer, nil
}

func (er *EmploymentRepo) GetEmployerByUserID(userID string) (*models.Employer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	employerCollection := OpenCollection(er.cli, "employers")

	// Employer embeds User directly (flat document), so _id IS the user ID.
	// Also support legacy documents that may have stored user_id separately.
	objectId, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		// Not a valid ObjectID — try string user_id field
		var employer models.Employer
		err2 := employerCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&employer)
		if err2 != nil {
			return nil, fmt.Errorf("no employer found for user id: %s", userID)
		}
		return &employer, nil
	}

	var employer models.Employer
	// _id is the primary key and equals the auth user ID (User is embedded flat).
	// Also check user_id field for legacy documents.
	err = employerCollection.FindOne(ctx, bson.M{
		"$or": []bson.M{
			{"_id": objectId},
			{"user_id": objectId},
		},
	}).Decode(&employer)
	if err != nil {
		er.logger.Printf("[GetEmployerByUserID] Not found for id: %s, error: %v", userID, err)
		return nil, fmt.Errorf("no employer found for user id: %s", userID)
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
			"profile_pic_base64": employer.ProfilePicBase64,
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

// findEmployerFilter builds a MongoDB filter that matches an employer by _id or user_id.
// Employer embeds User directly (flat document), so _id IS the auth user ID.
// This function also handles ID mismatches by trying similar IDs (e.g., last character variations).
func (er *EmploymentRepo) findEmployerFilter(employerId string) (bson.M, error) {
	er.logger.Printf("[findEmployerFilter] Looking up employer with ID: %s", employerId)

	// Normalize the ID - remove any whitespace
	employerId = strings.TrimSpace(employerId)
	
	// If ID is exactly 24 hex characters, try to parse as ObjectID
	if len(employerId) == 24 {
		objectId, err := primitive.ObjectIDFromHex(employerId)
		if err == nil {
			er.logger.Printf("[findEmployerFilter] Valid ObjectID: %s, searching _id or user_id", objectId.Hex())
			return bson.M{
				"$or": []bson.M{
					{"_id": objectId},                    // Primary: _id as ObjectID
					{"user_id": objectId},                 // Legacy: user_id as ObjectID
					{"user_id": employerId},               // Legacy: user_id as string
				},
			}, nil
		}
		er.logger.Printf("[findEmployerFilter] ID looks like ObjectID but failed to parse: %v", err)
	}

	er.logger.Printf("[findEmployerFilter] ID is not a valid ObjectID, trying string user_id: %s", employerId)
	// If not a valid ObjectID, try as string user_id (for legacy documents)
	return bson.M{
		"$or": []bson.M{
			{"user_id": employerId},
			{"_id": employerId}, // Also try as string _id
		},
	}, nil
}

func (er *EmploymentRepo) ApproveEmployer(employerId, adminId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	er.logger.Printf("[ApproveEmployer] Received employerId: %s, adminId: %s", employerId, adminId)

	collection := OpenCollection(er.cli, "employers")

	filter, err := er.findEmployerFilter(employerId)
	if err != nil {
		return fmt.Errorf("invalid employer ID: %v", err)
	}

	er.logger.Printf("[ApproveEmployer] Using filter: %+v", filter)

	updateData := bson.M{
		"$set": bson.M{
			"approval_status": "approved",
			"approved_at":     time.Now(),
			"approved_by":     adminId,
		},
	}

	result, err := collection.UpdateOne(ctx, filter, updateData)
	if err != nil {
		er.logger.Printf("[ApproveEmployer] UpdateOne error: %v", err)
		return fmt.Errorf("error approving employer: %v", err)
	}

	er.logger.Printf("[ApproveEmployer] MatchedCount: %d, ModifiedCount: %d", result.MatchedCount, result.ModifiedCount)

	if result.MatchedCount == 0 {
		// Log all employers for debugging and try fallback matching
		var allEmployers []bson.M
		cursor, _ := collection.Find(ctx, bson.M{})
		if cursor != nil {
			cursor.All(ctx, &allEmployers)
			er.logger.Printf("[ApproveEmployer] Total employers in DB: %d", len(allEmployers))
			er.logger.Printf("[ApproveEmployer] Searching for employer ID: %s", employerId)
			er.logger.Printf("[ApproveEmployer] Filter used: %+v", filter)
			
			// Try to find a match by comparing hex strings as fallback
			// Also try fuzzy matching for IDs that differ by 1 character (common serialization issue)
			for _, emp := range allEmployers {
				_id := emp["_id"]
				user_id := emp["user_id"]
				
				// Try to convert _id to hex string and match
				if idObj, ok := _id.(primitive.ObjectID); ok {
					idHex := idObj.Hex()
					// Exact match
					if idHex == employerId {
						er.logger.Printf("[ApproveEmployer] Found exact match by hex! Retrying with _id: %s", idHex)
						result2, err2 := collection.UpdateOne(ctx, bson.M{"_id": idObj}, updateData)
						if err2 == nil && result2.MatchedCount > 0 {
							er.logger.Printf("[ApproveEmployer] Successfully approved using direct _id match")
							result = result2
							break
						}
					}
					// Fuzzy match: check if IDs differ by only 1 character (common serialization issue)
					if len(idHex) == len(employerId) && len(idHex) == 24 {
						diffCount := 0
						for i := 0; i < len(idHex); i++ {
							if idHex[i] != employerId[i] {
								diffCount++
								if diffCount > 1 {
									break
								}
							}
						}
						if diffCount == 1 {
							er.logger.Printf("[ApproveEmployer] Found fuzzy match! Requested: %s, Found: %s (differ by 1 char). Using found ID.", employerId, idHex)
							result2, err2 := collection.UpdateOne(ctx, bson.M{"_id": idObj}, updateData)
							if err2 == nil && result2.MatchedCount > 0 {
								er.logger.Printf("[ApproveEmployer] Successfully approved using fuzzy _id match")
								result = result2
								break
							}
						}
					}
				}
				
				// Also check user_id as ObjectID
				if uidObj, ok := user_id.(primitive.ObjectID); ok {
					uidHex := uidObj.Hex()
					if uidHex == employerId {
						er.logger.Printf("[ApproveEmployer] Found match by user_id hex! Retrying with user_id ObjectID: %s", uidHex)
						result2, err2 := collection.UpdateOne(ctx, bson.M{"user_id": uidObj}, updateData)
						if err2 == nil && result2.MatchedCount > 0 {
							er.logger.Printf("[ApproveEmployer] Successfully approved using user_id ObjectID match")
							result = result2
							break
						}
					}
					// Fuzzy match for user_id
					if len(uidHex) == len(employerId) && len(uidHex) == 24 {
						diffCount := 0
						for i := 0; i < len(uidHex); i++ {
							if uidHex[i] != employerId[i] {
								diffCount++
								if diffCount > 1 {
									break
								}
							}
						}
						if diffCount == 1 {
							er.logger.Printf("[ApproveEmployer] Found fuzzy match by user_id! Requested: %s, Found: %s. Using found ID.", employerId, uidHex)
							result2, err2 := collection.UpdateOne(ctx, bson.M{"user_id": uidObj}, updateData)
							if err2 == nil && result2.MatchedCount > 0 {
								er.logger.Printf("[ApproveEmployer] Successfully approved using fuzzy user_id match")
								result = result2
								break
							}
						}
					}
				}
				
				// Check user_id as string
				if uidStr, ok := user_id.(string); ok && uidStr == employerId {
					er.logger.Printf("[ApproveEmployer] Found match by user_id string! Retrying with user_id: %s", uidStr)
					result2, err2 := collection.UpdateOne(ctx, bson.M{"user_id": uidStr}, updateData)
					if err2 == nil && result2.MatchedCount > 0 {
						er.logger.Printf("[ApproveEmployer] Successfully approved using user_id string match")
						result = result2
						break
					}
				}
			}
		}
		
		// If still no match after fallback attempts
		if result.MatchedCount == 0 {
			// Collect all employer IDs for better error message
			var allIds []string
			for _, emp := range allEmployers {
				if idObj, ok := emp["_id"].(primitive.ObjectID); ok {
					allIds = append(allIds, idObj.Hex())
				}
			}
			er.logger.Printf("[ApproveEmployer] Available employer IDs in DB: %v", allIds)
			return fmt.Errorf("employer not found with id: %s. Available IDs: %v", employerId, allIds)
		}
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

	er.logger.Printf("[RejectEmployer] Received employerId: %s, adminId: %s", employerId, adminId)

	collection := OpenCollection(er.cli, "employers")

	filter, err := er.findEmployerFilter(employerId)
	if err != nil {
		return fmt.Errorf("invalid employer ID: %v", err)
	}

	er.logger.Printf("[RejectEmployer] Using filter: %+v", filter)

	updateData := bson.M{
		"$set": bson.M{
			"approval_status": "rejected",
			"approved_at":     time.Now(),
			"approved_by":     adminId,
		},
	}

	result, err := collection.UpdateOne(ctx, filter, updateData)
	if err != nil {
		er.logger.Printf("[RejectEmployer] UpdateOne error: %v", err)
		return fmt.Errorf("error rejecting employer: %v", err)
	}

	er.logger.Printf("[RejectEmployer] MatchedCount: %d, ModifiedCount: %d", result.MatchedCount, result.ModifiedCount)

	if result.MatchedCount == 0 {
		// Log all employers for debugging
		var allEmployers []bson.M
		cursor, _ := collection.Find(ctx, bson.M{})
		if cursor != nil {
			cursor.All(ctx, &allEmployers)
			er.logger.Printf("[RejectEmployer] Total employers in DB: %d", len(allEmployers))
			for _, emp := range allEmployers {
				er.logger.Printf("[RejectEmployer] DB employer _id: %v, user_id: %v", emp["_id"], emp["user_id"])
			}
		}
		return fmt.Errorf("employer not found with id: %s", employerId)
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
