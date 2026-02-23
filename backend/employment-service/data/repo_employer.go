package data

import (
	"context"
	"fmt"
	"strings"
	"time"
	"unicode"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// isHexString checks if a string contains only hexadecimal characters
func isHexString(s string) bool {
	for _, r := range s {
		if !unicode.Is(unicode.ASCII_Hex_Digit, r) {
			return false
		}
	}
	return true
}

func (er *EmploymentRepo) CreateEmployer(employer *models.Employer) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	employerCollection := OpenCollection(er.cli, "employers")

	er.logger.Printf("[CreateEmployer] Creating employer with User.ID: %v", employer.User.ID)

	// If User.ID is set, use it as the _id (employer embeds User, so _id = user_id)
	if !employer.User.ID.IsZero() {
		er.logger.Printf("[CreateEmployer] Using provided User.ID as _id: %s", employer.User.ID.Hex())
		
		// Check if employer already exists with this ID
		var existingEmployer models.Employer
		err := employerCollection.FindOne(ctx, bson.M{"_id": employer.User.ID}).Decode(&existingEmployer)
		if err == nil {
			// Employer already exists, return the existing ID
			er.logger.Printf("[CreateEmployer] Employer already exists with _id: %s, returning existing ID", employer.User.ID.Hex())
			return employer.User.ID, nil
		} else if err != mongo.ErrNoDocuments {
			// Some other error occurred
			er.logger.Printf("[CreateEmployer] Error checking for existing employer: %v", err)
			return primitive.NewObjectID(), err
		}
		// No existing employer found, proceed with insert
	} else {
		// Generate new ID and set both
		employer.User.ID = primitive.NewObjectID()
		er.logger.Printf("[CreateEmployer] Generated new ID: %s", employer.User.ID.Hex())
	}

	// Ensure ApprovalStatus is set
	if employer.ApprovalStatus == "" {
		employer.ApprovalStatus = "pending"
	}

	// Create a BSON document explicitly setting _id to ensure MongoDB uses it
	// Since Employer embeds User, we need to ensure _id is properly set
	employerDoc := bson.M{
		"_id":             employer.User.ID,
		"first_name":      employer.FirstName,
		"last_name":       employer.LastName,
		"email":           employer.Email,
		"phone":           employer.Phone,
		"address":         employer.Address,
		"jmbg":            employer.JMBG,
		"user_type":       employer.UserType,
		"firm_name":       employer.FirmName,
		"pib":             employer.PIB,
		"maticni_broj":    employer.MatBr,
		"delatnost":       employer.Delatnost,
		"firm_address":    employer.FirmAddress,
		"firm_phone":      employer.FirmPhone,
		"approval_status": employer.ApprovalStatus,
	}
	if employer.ProfilePicBase64 != "" {
		employerDoc["profile_pic_base64"] = employer.ProfilePicBase64
	}

	// Use ReplaceOne with upsert to handle both insert and update cases
	// This ensures the _id is properly set from User.ID
	filter := bson.M{"_id": employer.User.ID}
	result, err := employerCollection.ReplaceOne(ctx, filter, employerDoc, 
		options.Replace().SetUpsert(true))
	if err != nil {
		er.logger.Printf("[CreateEmployer] ReplaceOne error: %v", err)
		// Check if it's a duplicate key error (MongoDB error code 11000)
		if writeErr, ok := err.(mongo.WriteException); ok {
			for _, we := range writeErr.WriteErrors {
				if we.Code == 11000 {
					er.logger.Printf("[CreateEmployer] Duplicate key error - employer with _id %s already exists", employer.User.ID.Hex())
					return employer.User.ID, nil // Return the ID anyway since it exists
				}
			}
		}
		return primitive.NewObjectID(), fmt.Errorf("failed to save employer: %v", err)
	}
	
	if result.UpsertedID != nil {
		er.logger.Printf("[CreateEmployer] Successfully created employer with _id: %v", result.UpsertedID)
		// Verify the inserted ID matches what we wanted
		if insertedID, ok := result.UpsertedID.(primitive.ObjectID); ok {
			if insertedID != employer.User.ID {
				er.logger.Printf("[CreateEmployer] WARNING: Inserted ID %s does not match requested ID %s", insertedID.Hex(), employer.User.ID.Hex())
				return insertedID, nil // Return the actual inserted ID
			}
		}
	} else {
		er.logger.Printf("[CreateEmployer] Employer already existed, updated with _id: %s", employer.User.ID.Hex())
	}
	
	return employer.User.ID, nil
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
		return nil, fmt.Errorf("no employer found for id: %s. The employer profile must exist in MongoDB. If this ID is from Keycloak, ensure an employer document was created in MongoDB with this user_id.", employerId)
	}

	return &employer, nil
}

func (er *EmploymentRepo) GetEmployerByUserID(userID string) (*models.Employer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	employerCollection := OpenCollection(er.cli, "employers")

	er.logger.Printf("[GetEmployerByUserID] Looking up employer for user ID: %s", userID)

	// Normalize the ID - remove any whitespace
	userID = strings.TrimSpace(userID)

	// Try to parse as ObjectID first
	objectId, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		er.logger.Printf("[GetEmployerByUserID] User ID is not a valid ObjectID, trying string user_id: %v", err)
		// Not a valid ObjectID — try string user_id field
		var employer models.Employer
		err2 := employerCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&employer)
		if err2 != nil {
			er.logger.Printf("[GetEmployerByUserID] Not found with string user_id, trying fallback")
			// Try fallback: search all employers and match by hex string
			return er.findEmployerByUserIDFallback(ctx, employerCollection, userID)
		}
		er.logger.Printf("[GetEmployerByUserID] Found employer with string user_id: %s", userID)
		// Ensure ID is set - try to get it from _id if available
		if employer.ID.IsZero() {
			// Try to find the document again to get _id
			var rawDoc bson.M
			if err := employerCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&rawDoc); err == nil {
				if idObj, ok := rawDoc["_id"].(primitive.ObjectID); ok {
					employer.ID = idObj
					employer.User.ID = idObj
					er.logger.Printf("[GetEmployerByUserID] Set employer.ID from _id: %s", idObj.Hex())
				}
			}
		}
		return &employer, nil
	}

	// Try ObjectID lookup - employer embeds User, so _id IS the user_id
	// Since Employer embeds User, the fields are flattened in MongoDB
	// So _id should equal the user's ID from the auth service
	var employer models.Employer
	err = employerCollection.FindOne(ctx, bson.M{
		"$or": []bson.M{
			{"_id": objectId},                    // Primary: _id as ObjectID (employer embeds User flat, so _id = user_id)
			{"user_id": objectId},                 // Legacy: user_id as ObjectID
			{"user_id": userID},                   // Legacy: user_id as string
		},
	}).Decode(&employer)
	if err != nil {
		er.logger.Printf("[GetEmployerByUserID] Not found with ObjectID lookup, trying fallback. Error: %v", err)
		// Try fallback: search all employers and match by hex string
		return er.findEmployerByUserIDFallback(ctx, employerCollection, userID)
	}

	// Ensure the ID field is set from _id (since Employer embeds User, _id should map to User.ID)
	if employer.ID.IsZero() && !objectId.IsZero() {
		employer.ID = objectId
		employer.User.ID = objectId
		er.logger.Printf("[GetEmployerByUserID] Set employer.ID and User.ID from _id: %s", objectId.Hex())
	}
	
	er.logger.Printf("[GetEmployerByUserID] Found employer with ObjectID: %s, employer._id: %s", userID, employer.ID.Hex())
	return &employer, nil
}

// findEmployerByUserIDFallback searches all employers and tries to match by hex string comparison
func (er *EmploymentRepo) findEmployerByUserIDFallback(ctx context.Context, collection *mongo.Collection, userID string) (*models.Employer, error) {
	er.logger.Printf("[GetEmployerByUserID] Fallback: Searching all employers for user ID: %s", userID)
	
	var allEmployers []bson.M
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, fmt.Errorf("error querying employers: %v", err)
	}
	defer cursor.Close(ctx)
	
	if err := cursor.All(ctx, &allEmployers); err != nil {
		return nil, fmt.Errorf("error decoding employers: %v", err)
	}
	
	er.logger.Printf("[GetEmployerByUserID] Found %d total employers in database", len(allEmployers))
	
	// Log first few employer IDs for debugging
	if len(allEmployers) > 0 {
		for i, emp := range allEmployers {
			if i >= 3 {
				break
			}
			if idObj, ok := emp["_id"].(primitive.ObjectID); ok {
				er.logger.Printf("[GetEmployerByUserID] Sample employer _id[%d]: %s", i, idObj.Hex())
			}
		}
	}
	
	// Try to match by comparing hex strings (exact and fuzzy)
	for _, emp := range allEmployers {
		_id := emp["_id"]
		user_id := emp["user_id"]
		
		// Check _id as ObjectID (primary - employer embeds User, so _id = user_id)
		if idObj, ok := _id.(primitive.ObjectID); ok {
			idHex := idObj.Hex()
			er.logger.Printf("[GetEmployerByUserID] Comparing requested: %s with _id: %s", userID, idHex)
			// Exact match
			if idHex == userID {
				er.logger.Printf("[GetEmployerByUserID] Found exact match by _id hex: %s", idHex)
				var employer models.Employer
				if err := collection.FindOne(ctx, bson.M{"_id": idObj}).Decode(&employer); err == nil {
					// Ensure ID is set
					if employer.ID.IsZero() {
						employer.ID = idObj
						employer.User.ID = idObj
					}
					return &employer, nil
				}
			}
			// Fuzzy match: check if IDs differ by only 1 character
			if len(idHex) == len(userID) && len(idHex) == 24 {
				diffCount := 0
				for i := 0; i < len(idHex); i++ {
					if idHex[i] != userID[i] {
						diffCount++
						if diffCount > 1 {
							break
						}
					}
				}
				if diffCount == 1 {
					er.logger.Printf("[GetEmployerByUserID] Found fuzzy match by _id! Requested: %s, Found: %s (differ by 1 char)", userID, idHex)
					var employer models.Employer
					if err := collection.FindOne(ctx, bson.M{"_id": idObj}).Decode(&employer); err == nil {
						return &employer, nil
					}
				}
			}
		}
		
		// Check user_id as ObjectID
		if uidObj, ok := user_id.(primitive.ObjectID); ok {
			uidHex := uidObj.Hex()
			// Exact match
			if uidHex == userID {
				er.logger.Printf("[GetEmployerByUserID] Found exact match by user_id hex: %s", uidHex)
				var employer models.Employer
				if err := collection.FindOne(ctx, bson.M{"user_id": uidObj}).Decode(&employer); err == nil {
					// Ensure ID is set - try to get from _id
					if employer.ID.IsZero() {
						var rawDoc bson.M
						if err2 := collection.FindOne(ctx, bson.M{"user_id": uidObj}).Decode(&rawDoc); err2 == nil {
							if idObj, ok := rawDoc["_id"].(primitive.ObjectID); ok {
								employer.ID = idObj
								employer.User.ID = idObj
							}
						}
					}
					return &employer, nil
				}
			}
			// Fuzzy match
			if len(uidHex) == len(userID) && len(uidHex) == 24 {
				diffCount := 0
				for i := 0; i < len(uidHex); i++ {
					if uidHex[i] != userID[i] {
						diffCount++
						if diffCount > 1 {
							break
						}
					}
				}
				if diffCount == 1 {
					er.logger.Printf("[GetEmployerByUserID] Found fuzzy match by user_id! Requested: %s, Found: %s", userID, uidHex)
					var employer models.Employer
					if err := collection.FindOne(ctx, bson.M{"user_id": uidObj}).Decode(&employer); err == nil {
						return &employer, nil
					}
				}
			}
		}
		
		// Check user_id as string
		if uidStr, ok := user_id.(string); ok && uidStr == userID {
			er.logger.Printf("[GetEmployerByUserID] Found match by user_id string: %s", uidStr)
			var employer models.Employer
			if err := collection.FindOne(ctx, bson.M{"user_id": uidStr}).Decode(&employer); err == nil {
				// Ensure ID is set - try to get from _id
				if employer.ID.IsZero() {
					var rawDoc bson.M
					if err2 := collection.FindOne(ctx, bson.M{"user_id": uidStr}).Decode(&rawDoc); err2 == nil {
						if idObj, ok := rawDoc["_id"].(primitive.ObjectID); ok {
							employer.ID = idObj
							employer.User.ID = idObj
						}
					}
				}
				return &employer, nil
			}
		}
	}
	
	er.logger.Printf("[GetEmployerByUserID] No employer found for user ID: %s after fallback search", userID)
	return nil, fmt.Errorf("no employer found for user id: %s", userID)
}

func (er *EmploymentRepo) GetAllEmployers() ([]*models.Employer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	employerCollection := OpenCollection(er.cli, "employers")

	// First, clean up zero-ID documents by querying raw documents
	er.logger.Printf("[GetAllEmployers] Checking for zero-ID documents to clean up...")
	rawCursor, rawErr := employerCollection.Find(ctx, bson.M{})
	if rawErr == nil && rawCursor != nil {
		defer rawCursor.Close(ctx)
		var allRawDocs []bson.M
		if err := rawCursor.All(ctx, &allRawDocs); err == nil {
			er.logger.Printf("[GetAllEmployers] Found %d raw documents in collection", len(allRawDocs))
			deletedCount := int64(0)
			for i, doc := range allRawDocs {
				if _id, ok := doc["_id"]; ok {
					// Log the actual _id value and type for debugging
					er.logger.Printf("[GetAllEmployers] Document[%d] _id: type=%T, value=%v", i, _id, _id)
					
					var shouldDelete bool
					var idType string
					var idHex string
					
					if idObj, ok := _id.(primitive.ObjectID); ok {
						idHex = idObj.Hex()
						er.logger.Printf("[GetAllEmployers] Document[%d] _id as ObjectID: hex=%s, isZero=%v", i, idHex, idObj.IsZero())
						if idObj.IsZero() || idHex == "000000000000000000000000" {
							shouldDelete = true
							idType = "ObjectID"
							er.logger.Printf("[GetAllEmployers] Document[%d] MARKED FOR DELETION: zero ObjectID", i)
						}
					} else if idStr, ok := _id.(string); ok {
						idHex = idStr
						er.logger.Printf("[GetAllEmployers] Document[%d] _id as string: %s", i, idStr)
						if idStr == "000000000000000000000000" || idStr == "" {
							shouldDelete = true
							idType = "string"
							er.logger.Printf("[GetAllEmployers] Document[%d] MARKED FOR DELETION: zero string ID", i)
						}
					} else {
						// Try to convert to string and check
						idStr := fmt.Sprintf("%v", _id)
						er.logger.Printf("[GetAllEmployers] Document[%d] _id as other type: %T, string representation: %s", i, _id, idStr)
						if idStr == "000000000000000000000000" || idStr == "" || idStr == "<nil>" {
							shouldDelete = true
							idType = "other"
							er.logger.Printf("[GetAllEmployers] Document[%d] MARKED FOR DELETION: zero/empty other type", i)
						}
					}
					
					if shouldDelete {
						er.logger.Printf("[GetAllEmployers] Attempting to delete document[%d] with _id: %v (type: %T)", i, _id, _id)
						deleteResult, delErr := employerCollection.DeleteOne(ctx, bson.M{"_id": _id})
						if delErr != nil {
							er.logger.Printf("[GetAllEmployers] Error deleting zero-ID document[%d] (%s): %v", i, idType, delErr)
						} else if deleteResult.DeletedCount > 0 {
							deletedCount += deleteResult.DeletedCount
							er.logger.Printf("[GetAllEmployers] Successfully deleted zero-ID document[%d] (%s)", i, idType)
						} else {
							er.logger.Printf("[GetAllEmployers] DeleteOne returned 0 deleted for document[%d]", i)
						}
					} else {
						er.logger.Printf("[GetAllEmployers] Document[%d] has valid _id, keeping it", i)
					}
				} else {
					er.logger.Printf("[GetAllEmployers] Document[%d] has no _id field!", i)
				}
			}
			if deletedCount > 0 {
				er.logger.Printf("[GetAllEmployers] Cleaned up %d zero-ID employer document(s)", deletedCount)
			} else {
				er.logger.Printf("[GetAllEmployers] No zero-ID documents found to delete")
			}
		} else {
			er.logger.Printf("[GetAllEmployers] Error decoding raw documents: %v", err)
		}
	} else {
		er.logger.Printf("[GetAllEmployers] Error querying raw documents: %v", rawErr)
	}

	// Query and decode employers
	var employers []*models.Employer
	cursor, err := employerCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Printf("[GetAllEmployers] Error querying employers: %v", err)
		return nil, err
	}
	defer cursor.Close(ctx)
	
	// Decode all employers - use raw documents to manually set IDs if needed
	var allRawDocsForDecode []bson.M
	rawCursor2, _ := employerCollection.Find(ctx, bson.M{})
	if rawCursor2 != nil {
		defer rawCursor2.Close(ctx)
		rawCursor2.All(ctx, &allRawDocsForDecode)
	}
	
	// Decode all employers
	if err = cursor.All(ctx, &employers); err != nil {
		er.logger.Printf("[GetAllEmployers] Error decoding employers: %v", err)
		return nil, err
	}
	
	er.logger.Printf("[GetAllEmployers] Decoded %d employers from database", len(employers))
	
	// Fix IDs by matching raw documents with decoded employers
	for i, emp := range employers {
		if emp == nil {
			continue
		}
		// If User.ID is zero, try to get it from raw document
		if emp.User.ID.IsZero() && len(allRawDocsForDecode) > 0 {
			// Try to match by index or by email
			if i < len(allRawDocsForDecode) {
				rawDoc := allRawDocsForDecode[i]
				if _id, ok := rawDoc["_id"]; ok {
					if idObj, ok := _id.(primitive.ObjectID); ok && !idObj.IsZero() {
						emp.User.ID = idObj
						er.logger.Printf("[GetAllEmployers] Fixed Employer[%d] ID from raw doc: %s", i, idObj.Hex())
					}
				}
			}
			// If still zero, try matching by email
			if emp.User.ID.IsZero() && emp.Email != nil && *emp.Email != "" {
				for _, rawDoc := range allRawDocsForDecode {
					if rawEmail, ok := rawDoc["email"].(string); ok && rawEmail == *emp.Email {
						if _id, ok := rawDoc["_id"]; ok {
							if idObj, ok := _id.(primitive.ObjectID); ok && !idObj.IsZero() {
								emp.User.ID = idObj
								er.logger.Printf("[GetAllEmployers] Fixed Employer[%d] ID from raw doc by email: %s", i, idObj.Hex())
								break
							}
						}
					}
				}
			}
		}
	}
	
	// Filter out only truly invalid employers (zero IDs)
	// Note: We don't filter by profile completeness here - admins should see all employers
	// Profile completeness filtering is only applied to GetPendingEmployers()
	validEmployers := make([]*models.Employer, 0, len(employers))
	for i, emp := range employers {
		if emp == nil {
			er.logger.Printf("[GetAllEmployers] Employer[%d] is nil, skipping", i)
			continue
		}
		
		// Employer embeds User, so the ID is in emp.User.ID (which maps to _id in MongoDB)
		// Only skip if ID is truly zero (invalid document)
		if emp.User.ID.IsZero() {
			er.logger.Printf("[GetAllEmployers] WARNING: Employer[%d] has zero User.ID after fix attempt, skipping", i)
			er.logger.Printf("[GetAllEmployers] Employer[%d] details: Email=%v, FirmName=%s", i, emp.Email, emp.FirmName)
			continue
		}
		
		validEmployers = append(validEmployers, emp)
		if i < 10 {
			er.logger.Printf("[GetAllEmployers] Employer[%d] ID: %s, FirmName: %s", i, emp.User.ID.Hex(), emp.FirmName)
		}
	}
	
	er.logger.Printf("[GetAllEmployers] Returning %d valid employers (filtered from %d)", len(validEmployers), len(employers))
	return validEmployers, nil
}

func (er *EmploymentRepo) UpdateEmployer(employerId string, employer *models.Employer) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	employerCollection := OpenCollection(er.cli, "employers")
	
	er.logger.Printf("[UpdateEmployer] Updating employer with ID: %s", employerId)
	
	// Use the same flexible filter as ApproveEmployer to find the employer
	filter, err := er.findEmployerFilter(employerId)
	if err != nil {
		return fmt.Errorf("invalid employer ID: %v", err)
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

	er.logger.Printf("[UpdateEmployer] Using filter: %+v", filter)
	result, err := employerCollection.UpdateOne(ctx, filter, updateData)
	if err != nil {
		er.logger.Printf("[UpdateEmployer] UpdateOne error: %v", err)
		return fmt.Errorf("could not update employer with id: %s, error: %v", employerId, err)
	}
	if result.MatchedCount == 0 {
		er.logger.Printf("[UpdateEmployer] No employer found with filter: %+v", filter)
		return fmt.Errorf("no employer found with id: %s", employerId)
	}

	er.logger.Printf("[UpdateEmployer] Successfully updated employer with id: %s (MatchedCount: %d, ModifiedCount: %d)", employerId, result.MatchedCount, result.ModifiedCount)
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
	er.logger.Printf("[findEmployerFilter] Looking up employer with ID: %s (length: %d)", employerId, len(employerId))

	// Normalize the ID - remove any whitespace and convert to lowercase for consistency
	employerId = strings.TrimSpace(employerId)
	employerIdLower := strings.ToLower(employerId)
	
	// If ID is exactly 24 hex characters, try to parse as ObjectID
	if len(employerId) == 24 {
		// Try parsing the original ID
		objectId, err := primitive.ObjectIDFromHex(employerId)
		if err == nil {
			er.logger.Printf("[findEmployerFilter] Valid ObjectID: %s, searching _id or user_id", objectId.Hex())
			return bson.M{
				"$or": []bson.M{
					{"_id": objectId},                    // Primary: _id as ObjectID
					{"user_id": objectId},                 // Legacy: user_id as ObjectID
					{"user_id": employerId},               // Legacy: user_id as string
					{"user_id": employerIdLower},         // Legacy: user_id as lowercase string
				},
			}, nil
		}
		
		// Try parsing lowercase version
		objectIdLower, errLower := primitive.ObjectIDFromHex(employerIdLower)
		if errLower == nil && employerIdLower != employerId {
			er.logger.Printf("[findEmployerFilter] Valid ObjectID (lowercase): %s, searching _id or user_id", objectIdLower.Hex())
			return bson.M{
				"$or": []bson.M{
					{"_id": objectIdLower},                    // Primary: _id as ObjectID
					{"user_id": objectIdLower},                 // Legacy: user_id as ObjectID
					{"user_id": employerId},               // Legacy: user_id as string
					{"user_id": employerIdLower},         // Legacy: user_id as lowercase string
				},
			}, nil
		}
		
		er.logger.Printf("[findEmployerFilter] ID looks like ObjectID but failed to parse (original: %v, lowercase: %v)", err, errLower)
	}

	er.logger.Printf("[findEmployerFilter] ID is not a valid ObjectID, trying string user_id: %s", employerId)
	// If not a valid ObjectID, try as string user_id (for legacy documents)
	return bson.M{
		"$or": []bson.M{
			{"user_id": employerId},
			{"user_id": employerIdLower},
			{"_id": employerId}, // Also try as string _id (unlikely but possible)
		},
	}, nil
}

// isEmployerProfileComplete checks if an employer has all required company profile fields filled
func (er *EmploymentRepo) isEmployerProfileComplete(emp *models.Employer) bool {
	if emp == nil {
		return false
	}
	// Check if all required company profile fields are filled
	return emp.FirmName != "" &&
		emp.PIB != "" &&
		emp.MatBr != "" &&
		emp.Delatnost != "" &&
		emp.FirmAddress != "" &&
		emp.FirmPhone != ""
}

func (er *EmploymentRepo) ApproveEmployer(employerId, adminId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Normalize the employer ID first
	employerId = strings.TrimSpace(employerId)
	er.logger.Printf("[ApproveEmployer] Received employerId: %s (length: %d), adminId: %s", employerId, len(employerId), adminId)

	collection := OpenCollection(er.cli, "employers")

	// Declare result variable at function scope
	var result *mongo.UpdateResult

	updateData := bson.M{
		"$set": bson.M{
			"approval_status": "approved",
			"approved_at":     time.Now(),
			"approved_by":     adminId,
		},
	}

	// First, try a direct lookup with the ID as ObjectID if it's 24 hex characters
	if len(employerId) == 24 {
		if objectId, err := primitive.ObjectIDFromHex(employerId); err == nil {
			er.logger.Printf("[ApproveEmployer] Attempting direct ObjectID _id lookup: %s", objectId.Hex())
			directResult, err := collection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
			if err == nil && directResult.MatchedCount > 0 {
				er.logger.Printf("[ApproveEmployer] Successfully approved using direct ObjectID _id lookup")
				err = er.CreateCompanyProfile(employerId, adminId)
				if err != nil {
					er.logger.Printf("Failed to create company profile for employer %s: %v", employerId, err)
				}
				return nil
			}
			if err != nil {
				er.logger.Printf("[ApproveEmployer] Direct ObjectID _id lookup error: %v", err)
			} else {
				er.logger.Printf("[ApproveEmployer] Direct ObjectID _id lookup failed. MatchedCount: %d, trying user_id...", directResult.MatchedCount)
			}
			
			// Try user_id lookup if _id lookup failed
			er.logger.Printf("[ApproveEmployer] Attempting user_id lookup with ObjectID: %s", objectId.Hex())
			userResult, err := collection.UpdateOne(ctx, bson.M{"user_id": objectId}, updateData)
			if err == nil && userResult.MatchedCount > 0 {
				er.logger.Printf("[ApproveEmployer] Successfully approved using user_id ObjectID lookup")
				err = er.CreateCompanyProfile(employerId, adminId)
				if err != nil {
					er.logger.Printf("Failed to create company profile for employer %s: %v", employerId, err)
				}
				return nil
			}
			if err != nil {
				er.logger.Printf("[ApproveEmployer] user_id ObjectID lookup error: %v", err)
			} else {
				er.logger.Printf("[ApproveEmployer] user_id ObjectID lookup failed. MatchedCount: %d", userResult.MatchedCount)
			}
			
			// Try user_id as string
			er.logger.Printf("[ApproveEmployer] Attempting user_id lookup as string: %s", employerId)
			userStrResult, err := collection.UpdateOne(ctx, bson.M{"user_id": employerId}, updateData)
			if err == nil && userStrResult.MatchedCount > 0 {
				er.logger.Printf("[ApproveEmployer] Successfully approved using user_id string lookup")
				err = er.CreateCompanyProfile(employerId, adminId)
				if err != nil {
					er.logger.Printf("Failed to create company profile for employer %s: %v", employerId, err)
				}
				return nil
			}
			if err != nil {
				er.logger.Printf("[ApproveEmployer] user_id string lookup error: %v", err)
			} else {
				er.logger.Printf("[ApproveEmployer] user_id string lookup failed. MatchedCount: %d", userStrResult.MatchedCount)
			}
		}
	}

	filter, err := er.findEmployerFilter(employerId)
	if err != nil {
		return fmt.Errorf("invalid employer ID: %v", err)
	}

	er.logger.Printf("[ApproveEmployer] Using filter: %+v", filter)

	result, err = collection.UpdateOne(ctx, filter, updateData)
	if err != nil {
		er.logger.Printf("[ApproveEmployer] UpdateOne error: %v", err)
		return fmt.Errorf("error approving employer: %v", err)
	}

	er.logger.Printf("[ApproveEmployer] MatchedCount: %d, ModifiedCount: %d", result.MatchedCount, result.ModifiedCount)

	// If we found a match, verify it was actually updated
	if result.MatchedCount > 0 && result.ModifiedCount > 0 {
		er.logger.Printf("[ApproveEmployer] Successfully approved employer: %s", employerId)
		err = er.CreateCompanyProfile(employerId, adminId)
		if err != nil {
			er.logger.Printf("Failed to create company profile for employer %s: %v", employerId, err)
		}
		return nil
	}

	// Declare allEmployers at function scope so it can be used in multiple if blocks
	var allEmployers []bson.M

	if result.MatchedCount == 0 {
		er.logger.Printf("[ApproveEmployer] Initial filter did not match any employer. Filter used: %+v", filter)
		er.logger.Printf("[ApproveEmployer] Attempting fallback matching for ID: %s (length: %d)", employerId, len(employerId))
		
		// Log all employers for debugging and try fallback matching
		cursor, err := collection.Find(ctx, bson.M{})
		if err != nil {
			er.logger.Printf("[ApproveEmployer] Error fetching all employers: %v", err)
		} else if cursor != nil {
			defer cursor.Close(ctx)
			if err := cursor.All(ctx, &allEmployers); err != nil {
				er.logger.Printf("[ApproveEmployer] Error decoding all employers: %v", err)
			} else {
				er.logger.Printf("[ApproveEmployer] Total employers in DB: %d", len(allEmployers))
				er.logger.Printf("[ApproveEmployer] Searching for employer ID: %s", employerId)
				er.logger.Printf("[ApproveEmployer] Filter used: %+v", filter)
				
				// Log first 5 employer IDs for debugging
				if len(allEmployers) > 0 {
					er.logger.Printf("[ApproveEmployer] Sample employer IDs from DB:")
					for i, emp := range allEmployers {
						if i >= 5 {
							break
						}
						if idObj, ok := emp["_id"].(primitive.ObjectID); ok {
							er.logger.Printf("[ApproveEmployer]   [%d] _id: %s", i, idObj.Hex())
						}
						if uidObj, ok := emp["user_id"].(primitive.ObjectID); ok {
							er.logger.Printf("[ApproveEmployer]   [%d] user_id (ObjectID): %s", i, uidObj.Hex())
						}
						if uidStr, ok := emp["user_id"].(string); ok {
							er.logger.Printf("[ApproveEmployer]   [%d] user_id (string): %s", i, uidStr)
						}
					}
				}
			
				// Try to find a match by comparing hex strings as fallback
				// Use case-insensitive matching since ObjectID hex should be case-insensitive
				employerIdLower := strings.ToLower(employerId)
				er.logger.Printf("[ApproveEmployer] Attempting case-insensitive matching. Original: %s, Lowercase: %s", employerId, employerIdLower)
				
				for _, emp := range allEmployers {
					_id := emp["_id"]
					user_id := emp["user_id"]
					
					// Try to convert _id to hex string and match
					if idObj, ok := _id.(primitive.ObjectID); ok {
						idHex := idObj.Hex()
						idHexLower := strings.ToLower(idHex)
						
						// Exact match (case-sensitive)
						if idHex == employerId {
							er.logger.Printf("[ApproveEmployer] Found exact case-sensitive match by hex! Retrying with _id: %s", idHex)
							result2, err2 := collection.UpdateOne(ctx, bson.M{"_id": idObj}, updateData)
							if err2 == nil && result2.MatchedCount > 0 {
								er.logger.Printf("[ApproveEmployer] Successfully approved using direct _id match")
								result = result2
								break
							}
						}
						
						// Case-insensitive exact match
						if idHexLower == employerIdLower {
							er.logger.Printf("[ApproveEmployer] Found exact case-insensitive match by hex! Requested: %s, Found: %s. Retrying with _id: %s", employerId, idHex, idHex)
							result2, err2 := collection.UpdateOne(ctx, bson.M{"_id": idObj}, updateData)
							if err2 == nil && result2.MatchedCount > 0 {
								er.logger.Printf("[ApproveEmployer] Successfully approved using case-insensitive _id match")
								result = result2
								break
							}
						}
						
						// Fuzzy match: check if IDs differ by only 1 character (common serialization issue)
						if len(idHex) == len(employerId) && len(idHex) == 24 {
							diffCount := 0
							for i := 0; i < len(idHex); i++ {
								if strings.ToLower(string(idHex[i])) != strings.ToLower(string(employerId[i])) {
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
					uidHexLower := strings.ToLower(uidHex)
					
					// Case-sensitive exact match
					if uidHex == employerId {
						er.logger.Printf("[ApproveEmployer] Found match by user_id hex! Retrying with user_id ObjectID: %s", uidHex)
						result2, err2 := collection.UpdateOne(ctx, bson.M{"user_id": uidObj}, updateData)
						if err2 == nil && result2.MatchedCount > 0 {
							er.logger.Printf("[ApproveEmployer] Successfully approved using user_id ObjectID match")
							result = result2
							break
						}
					}
					
					// Case-insensitive exact match
					if uidHexLower == employerIdLower {
						er.logger.Printf("[ApproveEmployer] Found case-insensitive match by user_id hex! Requested: %s, Found: %s. Retrying with user_id ObjectID: %s", employerId, uidHex, uidHex)
						result2, err2 := collection.UpdateOne(ctx, bson.M{"user_id": uidObj}, updateData)
						if err2 == nil && result2.MatchedCount > 0 {
							er.logger.Printf("[ApproveEmployer] Successfully approved using case-insensitive user_id ObjectID match")
							result = result2
							break
						}
					}
					
					// Fuzzy match for user_id (case-insensitive)
					if len(uidHex) == len(employerId) && len(uidHex) == 24 {
						diffCount := 0
						for i := 0; i < len(uidHex); i++ {
							if strings.ToLower(string(uidHex[i])) != strings.ToLower(string(employerId[i])) {
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
				
				// Check user_id as string (case-insensitive)
				if uidStr, ok := user_id.(string); ok {
					uidStrLower := strings.ToLower(uidStr)
					if uidStr == employerId || uidStrLower == employerIdLower {
						er.logger.Printf("[ApproveEmployer] Found match by user_id string! Requested: %s, Found: %s. Retrying with user_id: %s", employerId, uidStr, uidStr)
						result2, err2 := collection.UpdateOne(ctx, bson.M{"user_id": uidStr}, updateData)
						if err2 == nil && result2.MatchedCount > 0 {
							er.logger.Printf("[ApproveEmployer] Successfully approved using user_id string match")
							result = result2
							break
						}
					}
				}
				} // Close the for loop from line 496
			} // Close the else block from line 467 (cursor.All succeeded)
		} // Close the else if cursor != nil block from line 463
		
		// If still no match after fallback attempts, try prefix matching as last resort
		if result.MatchedCount == 0 && len(allEmployers) > 0 {
			er.logger.Printf("[ApproveEmployer] Fallback matching failed. Trying prefix matching for ID: %s", employerId)
			employerIdLower := strings.ToLower(employerId)
			
			// Try matching by first 20 characters (in case of truncation)
			if len(employerId) >= 20 {
				prefix := employerIdLower[:20]
				er.logger.Printf("[ApproveEmployer] Trying prefix match with first 20 chars: %s", prefix)
				for _, emp := range allEmployers {
					if idObj, ok := emp["_id"].(primitive.ObjectID); ok {
						idHexLower := strings.ToLower(idObj.Hex())
						if len(idHexLower) >= 20 && idHexLower[:20] == prefix {
							er.logger.Printf("[ApproveEmployer] Found prefix match! Requested prefix: %s, Found ID: %s", prefix, idObj.Hex())
							result2, err2 := collection.UpdateOne(ctx, bson.M{"_id": idObj}, updateData)
							if err2 == nil && result2.MatchedCount > 0 {
								er.logger.Printf("[ApproveEmployer] Successfully approved using prefix match")
								result = result2
								break
							}
						}
					}
				}
			}
		}
		
		// If still no match after all attempts
		if result.MatchedCount == 0 {
			er.logger.Printf("[ApproveEmployer] All matching attempts failed. No employer found with ID: %s", employerId)
			// Collect all employer IDs for better error message
			var allIds []string
			if len(allEmployers) == 0 {
				// Fetch all employers if we haven't already
				cursor, err := collection.Find(ctx, bson.M{})
				if err == nil && cursor != nil {
					defer cursor.Close(ctx)
					cursor.All(ctx, &allEmployers)
				}
			}
			for _, emp := range allEmployers {
				if idObj, ok := emp["_id"].(primitive.ObjectID); ok {
					allIds = append(allIds, idObj.Hex())
				}
			}
			
			// Also fetch using GetAllEmployers to see what IDs it returns
			var getAllEmployersIds []string
			if allEmployersFromRepo, err := er.GetAllEmployers(); err == nil {
				for _, emp := range allEmployersFromRepo {
					if emp != nil {
						getAllEmployersIds = append(getAllEmployersIds, emp.ID.Hex())
						if emp.ID.Hex() == employerId {
							er.logger.Printf("[ApproveEmployer] CRITICAL: Found requested ID %s in GetAllEmployers but not in database!", employerId)
						}
					}
				}
			}
			
			er.logger.Printf("[ApproveEmployer] Available employer IDs in DB (from raw query): %d IDs", len(allIds))
			er.logger.Printf("[ApproveEmployer] Available employer IDs from GetAllEmployers: %d IDs", len(getAllEmployersIds))
			er.logger.Printf("[ApproveEmployer] Requested ID: %s (length=%d, hex_chars_only=%v)", employerId, len(employerId), isHexString(employerId))
			
			// Check if requested ID exists in GetAllEmployers but not in raw query
			requestedInGetAll := false
			for _, id := range getAllEmployersIds {
				if id == employerId {
					requestedInGetAll = true
					break
				}
			}
			requestedInRaw := false
			for _, id := range allIds {
				if id == employerId {
					requestedInRaw = true
					break
				}
			}
			er.logger.Printf("[ApproveEmployer] Requested ID in GetAllEmployers: %v, in raw query: %v", requestedInGetAll, requestedInRaw)
			
			// Check if requested ID is similar to any available ID (for debugging)
			employerIdLower := strings.ToLower(employerId)
			similarIds := []string{}
			for _, availableId := range allIds {
				availableIdLower := strings.ToLower(availableId)
				if len(employerIdLower) == len(availableIdLower) && len(employerIdLower) == 24 {
					similarity := 0
					for i := 0; i < len(employerIdLower); i++ {
						if employerIdLower[i] == availableIdLower[i] {
							similarity++
						}
					}
					if similarity >= 20 {
						similarIds = append(similarIds, fmt.Sprintf("%s (similarity: %d/24)", availableId, similarity))
					}
				}
			}
			if len(similarIds) > 0 {
				er.logger.Printf("[ApproveEmployer] Similar IDs found: %v", similarIds)
			}
			
			// Limit the error message to first 50 IDs to avoid huge responses
			errorIds := allIds
			if len(errorIds) > 50 {
				errorIds = errorIds[:50]
			}
			errorMsg := fmt.Sprintf("employer not found with id: %s. This ID might be from Keycloak (authentication service), but the employer profile must exist in MongoDB. Available employer IDs in database (showing first 50 of %d): %v", employerId, len(allIds), errorIds)
			if len(allIds) == 0 {
				errorMsg = fmt.Sprintf("employer not found with id: %s. No employers found in database. The employer profile must be created in MongoDB before it can be approved. Keycloak is only for authentication - employer data must exist in MongoDB.", employerId)
			}
			return fmt.Errorf(errorMsg)
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
		// Log all employers for debugging and try fallback matching
		var allEmployers []bson.M
		cursor, _ := collection.Find(ctx, bson.M{})
		if cursor != nil {
			cursor.All(ctx, &allEmployers)
			er.logger.Printf("[RejectEmployer] Total employers in DB: %d", len(allEmployers))
			er.logger.Printf("[RejectEmployer] Searching for employer ID: %s", employerId)
			er.logger.Printf("[RejectEmployer] Filter used: %+v", filter)
			
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
						er.logger.Printf("[RejectEmployer] Found exact match by hex! Retrying with _id: %s", idHex)
						result2, err2 := collection.UpdateOne(ctx, bson.M{"_id": idObj}, updateData)
						if err2 == nil && result2.MatchedCount > 0 {
							er.logger.Printf("[RejectEmployer] Successfully rejected using direct _id match")
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
							er.logger.Printf("[RejectEmployer] Found fuzzy match! Requested: %s, Found: %s (differ by 1 char). Using found ID.", employerId, idHex)
							result2, err2 := collection.UpdateOne(ctx, bson.M{"_id": idObj}, updateData)
							if err2 == nil && result2.MatchedCount > 0 {
								er.logger.Printf("[RejectEmployer] Successfully rejected using fuzzy _id match")
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
						er.logger.Printf("[RejectEmployer] Found match by user_id hex! Retrying with user_id ObjectID: %s", uidHex)
						result2, err2 := collection.UpdateOne(ctx, bson.M{"user_id": uidObj}, updateData)
						if err2 == nil && result2.MatchedCount > 0 {
							er.logger.Printf("[RejectEmployer] Successfully rejected using user_id ObjectID match")
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
							er.logger.Printf("[RejectEmployer] Found fuzzy match by user_id! Requested: %s, Found: %s. Using found ID.", employerId, uidHex)
							result2, err2 := collection.UpdateOne(ctx, bson.M{"user_id": uidObj}, updateData)
							if err2 == nil && result2.MatchedCount > 0 {
								er.logger.Printf("[RejectEmployer] Successfully rejected using fuzzy user_id match")
								result = result2
								break
							}
						}
					}
				}
				
				// Check user_id as string
				if uidStr, ok := user_id.(string); ok && uidStr == employerId {
					er.logger.Printf("[RejectEmployer] Found match by user_id string! Retrying with user_id: %s", uidStr)
					result2, err2 := collection.UpdateOne(ctx, bson.M{"user_id": uidStr}, updateData)
					if err2 == nil && result2.MatchedCount > 0 {
						er.logger.Printf("[RejectEmployer] Successfully rejected using user_id string match")
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
			er.logger.Printf("[RejectEmployer] Available employer IDs in DB: %v", allIds)
			return fmt.Errorf("employer not found with id: %s. Available IDs: %v", employerId, allIds)
		}
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

	// Filter out incomplete profiles - only return employers with complete company information
	completeEmployers := make([]*models.Employer, 0, len(employers))
	for i, emp := range employers {
		if er.isEmployerProfileComplete(emp) {
			completeEmployers = append(completeEmployers, emp)
		} else {
			empId := "unknown"
			if emp != nil && !emp.ID.IsZero() {
				empId = emp.ID.Hex()
			}
			er.logger.Printf("GetPendingEmployers: Employer[%d] with ID %s has incomplete profile (missing required fields). Skipping.", i, empId)
		}
	}

	er.logger.Printf("GetPendingEmployers: Found %d employers with complete profiles (filtered from %d pending)", len(completeEmployers), len(employers))
	return completeEmployers, nil
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
