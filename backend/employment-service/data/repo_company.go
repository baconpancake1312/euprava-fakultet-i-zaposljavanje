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

func (er *EmploymentRepo) CreateCompanyProfile(employerId, adminId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	employerCollection := OpenCollection(er.cli, "employers")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return fmt.Errorf("invalid employer ID: %v", err)
	}

	var employer models.Employer
	err = employerCollection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&employer)
	if err != nil {
		return fmt.Errorf("employer not found: %v", err)
	}

	companyCollection := OpenCollection(er.cli, "companies")
	company := models.Company{
		ID:          primitive.NewObjectID(),
		EmployerId:  objectId,
		Name:        employer.FirmName,
		Description: employer.Delatnost,
		Address:     employer.FirmAddress,
		Phone:       employer.FirmPhone,
		PIB:         employer.PIB,
		MatBr:       employer.MatBr,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	_, err = companyCollection.InsertOne(ctx, &company)
	if err != nil {
		return fmt.Errorf("failed to create company profile: %v", err)
	}

	er.logger.Printf("Company profile created for employer %s", employerId)
	return nil
}

func (er *EmploymentRepo) GetCompanyByEmployerId(employerId string) (*models.Company, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	companyCollection := OpenCollection(er.cli, "companies")
	objectId, err := primitive.ObjectIDFromHex(employerId)
	if err != nil {
		return nil, fmt.Errorf("invalid employer ID: %v", err)
	}

	var company models.Company
	err = companyCollection.FindOne(ctx, bson.M{"employer_id": objectId}).Decode(&company)
	if err != nil {
		return nil, fmt.Errorf("company not found: %v", err)
	}

	return &company, nil
}

func (er *EmploymentRepo) UpdateCompany(companyId string, company *models.Company) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	companyCollection := OpenCollection(er.cli, "companies")
	objectId, err := primitive.ObjectIDFromHex(companyId)
	if err != nil {
		return fmt.Errorf("invalid company ID: %v", err)
	}

	// Check if company exists first
	var existingCompany models.Company
	err = companyCollection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&existingCompany)
	companyExists := err == nil
	
	// If company doesn't exist but EmployerId is set, create it
	if !companyExists && !company.EmployerId.IsZero() {
		er.logger.Printf("[UpdateCompany] Company not found, creating new company with EmployerId: %s", company.EmployerId.Hex())
		company.ID = objectId
		company.CreatedAt = time.Now()
		company.UpdatedAt = time.Now()
		_, err = companyCollection.InsertOne(ctx, company)
		if err != nil {
			return fmt.Errorf("error creating company: %v", err)
		}
		er.logger.Printf("Created company with id: %s", companyId)
	} else if !companyExists {
		return fmt.Errorf("company not found and no EmployerId provided")
	} else {
		// Company exists, update it
		company.UpdatedAt = time.Now()
		updateData := bson.M{
			"$set": bson.M{
				"name":         company.Name,
				"description":  company.Description,
				"website":      company.Website,
				"industry":    company.Industry,
				"size":         company.Size,
				"founded":      company.Founded,
				"logo":         company.Logo,
				"address":      company.Address,
				"phone":        company.Phone,
				"email":        company.Email,
				"pib":          company.PIB,
				"maticni_broj": company.MatBr,
				"updated_at":   company.UpdatedAt,
			},
		}
		
		// If EmployerId is provided and different from existing, update it
		if !company.EmployerId.IsZero() && company.EmployerId != existingCompany.EmployerId {
			updateData["$set"].(bson.M)["employer_id"] = company.EmployerId
		}

		result, err := companyCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
		if err != nil {
			return fmt.Errorf("error updating company: %v", err)
		}
		if result.MatchedCount == 0 {
			return fmt.Errorf("company not found")
		}
		er.logger.Printf("Updated company with id: %s", companyId)
	}

	// Get the final company state to get EmployerId for syncing
	var finalCompany models.Company
	err = companyCollection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&finalCompany)
	if err != nil {
		er.logger.Printf("Warning: Could not fetch company after update to get EmployerId: %v", err)
		return nil // Don't fail the update if we can't sync
	}

	// Sync company data to employer document and set approval_status to pending for admin review
	if !finalCompany.EmployerId.IsZero() {
		employerCollection := OpenCollection(er.cli, "employers")
		
		// Check if profile is complete before setting to pending
		profileComplete := finalCompany.Name != "" && finalCompany.PIB != "" && finalCompany.MatBr != "" && 
		                   finalCompany.Description != "" && finalCompany.Address != "" && finalCompany.Phone != ""
		
		employerUpdate := bson.M{
			"$set": bson.M{
				"firm_name":    finalCompany.Name,
				"pib":          finalCompany.PIB,
				"maticni_broj": finalCompany.MatBr,
				"delatnost":    finalCompany.Description,
				"firm_address": finalCompany.Address,
				"firm_phone":   finalCompany.Phone,
			},
		}
		
		// Only set to pending if profile is complete
		if profileComplete {
			employerUpdate["$set"].(bson.M)["approval_status"] = "pending"
		}
		
		// Use the flexible filter to find the employer (handles _id = EmployerId case)
		employerIdStr := finalCompany.EmployerId.Hex()
		filter, filterErr := er.findEmployerFilter(employerIdStr)
		if filterErr != nil {
			er.logger.Printf("Warning: Could not create employer filter: %v", filterErr)
		} else {
			// First try to update existing employer
			employerResult, err := employerCollection.UpdateOne(ctx, filter, employerUpdate)
			if err != nil {
				er.logger.Printf("Warning: Failed to sync company data to employer document: %v", err)
			} else if employerResult.MatchedCount > 0 {
				if profileComplete {
					er.logger.Printf("Synced company data to employer document and set approval_status to pending for employer: %s", employerIdStr)
				} else {
					er.logger.Printf("Synced company data to employer document (profile incomplete, not setting to pending) for employer: %s", employerIdStr)
				}
			} else {
				// No employer found - create one with the correct ID
				er.logger.Printf("No employer found to sync company data. Creating new employer document with ID: %s", employerIdStr)
				employerDoc := bson.M{
					"_id":             finalCompany.EmployerId,
					"firm_name":       finalCompany.Name,
					"pib":             finalCompany.PIB,
					"maticni_broj":    finalCompany.MatBr,
					"delatnost":       finalCompany.Description,
					"firm_address":    finalCompany.Address,
					"firm_phone":       finalCompany.Phone,
					"approval_status": "pending",
				}
				if profileComplete {
					employerDoc["approval_status"] = "pending"
				} else {
					employerDoc["approval_status"] = "pending" // Still set to pending even if incomplete
				}
				
				// Use upsert to create if doesn't exist
				upsertFilter := bson.M{"_id": finalCompany.EmployerId}
				upsertResult, upsertErr := employerCollection.ReplaceOne(ctx, upsertFilter, employerDoc, options.Replace().SetUpsert(true))
				if upsertErr != nil {
					er.logger.Printf("Warning: Failed to create employer document: %v", upsertErr)
				} else {
					er.logger.Printf("Created employer document with ID: %s (Upserted: %v, Matched: %d)", employerIdStr, upsertResult.UpsertedID != nil, upsertResult.MatchedCount)
				}
			}
		}
	} else {
		er.logger.Printf("Warning: Company has no EmployerId set, cannot sync to employer document")
	}

	return nil
}

func (er *EmploymentRepo) GetAllCompanies() ([]*models.Company, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	companyCollection := OpenCollection(er.cli, "companies")

	cursor, err := companyCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	defer cursor.Close(ctx)

	var companies []*models.Company
	if err := cursor.All(ctx, &companies); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return companies, nil
}

func (er *EmploymentRepo) GetCompanyById(companyId string) (*models.Company, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	companyCollection := OpenCollection(er.cli, "companies")
	objectId, err := primitive.ObjectIDFromHex(companyId)
	if err != nil {
		return nil, fmt.Errorf("invalid company ID: %v", err)
	}

	var company models.Company
	err = companyCollection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&company)
	if err != nil {
		return nil, fmt.Errorf("company not found: %v", err)
	}

	return &company, nil
}
