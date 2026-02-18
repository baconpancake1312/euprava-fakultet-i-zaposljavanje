package data

import (
	"context"
	"fmt"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (er *EmploymentRepo) CreateDocument(document *models.Document) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	documentCollection := OpenCollection(er.cli, "documents")
	document.ID = primitive.NewObjectID()
	result, err := documentCollection.InsertOne(ctx, &document)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return document.ID, nil
}

func (er *EmploymentRepo) GetDocument(documentId string) (*models.Document, error) {
	var document models.Document
	documentCollection := OpenCollection(er.cli, "documents")
	objectId, err := primitive.ObjectIDFromHex(documentId)
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = documentCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&document)
	if err != nil {
		return nil, fmt.Errorf("no document found for id: %s", documentId)
	}

	return &document, nil
}

func (er *EmploymentRepo) GetAllDocuments() ([]*models.Document, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	documentCollection := OpenCollection(er.cli, "documents")

	var documents []*models.Document
	cursor, err := documentCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &documents); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return documents, nil
}

func (er *EmploymentRepo) UpdateDocument(documentId string, document *models.Document) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	documentCollection := OpenCollection(er.cli, "documents")
	objectId, err := primitive.ObjectIDFromHex(documentId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"request_id": document.RequestId,
			"name":       document.Name,
			"file_path":  document.FilePath,
		},
	}

	result, err := documentCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update document with id: %s, error: %v", documentId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no document found with id: %s", documentId)
	}

	er.logger.Printf("Updated document with id: %s", documentId)
	return nil
}

func (er *EmploymentRepo) DeleteDocument(documentId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	documentCollection := OpenCollection(er.cli, "documents")
	objectId, err := primitive.ObjectIDFromHex(documentId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	result, err := documentCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete document with id: %s, error: %v", documentId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no document found with id: %s", documentId)
	}

	er.logger.Printf("Deleted document with id: %s", documentId)
	return nil
}
