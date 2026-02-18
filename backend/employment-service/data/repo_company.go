package data

import (
	"context"
	"fmt"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
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

	result, err := companyCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("error updating company: %v", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("company not found")
	}

	er.logger.Printf("Updated company with id: %s", companyId)
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
