package data

import (
	"context"
	"fmt"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (er *EmploymentRepo) CreateUser(user *models.User) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()
	userCollection := OpenCollection(er.cli, "users")
	user.ID = primitive.NewObjectID()
	result, err := userCollection.InsertOne(ctx, &user)
	if err != nil {
		er.logger.Println(err)
		return primitive.NewObjectID(), err
	}
	er.logger.Printf("Documents ID: %v\n", result.InsertedID)
	return user.ID, nil
}

func (er *EmploymentRepo) GetUser(userId string) (*models.User, error) {
	var user models.User
	userCollection := OpenCollection(er.cli, "users")
	objectId, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return nil, fmt.Errorf("invalid ID: %v", err)
	}

	err = userCollection.FindOne(context.Background(), bson.M{"_id": objectId}).Decode(&user)
	if err != nil {
		return nil, fmt.Errorf("no user found for id: %s", userId)
	}

	return &user, nil
}

func (er *EmploymentRepo) GetAllUsers() ([]*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	userCollection := OpenCollection(er.cli, "users")

	var users []*models.User
	cursor, err := userCollection.Find(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
		return nil, err
	}
	if err = cursor.All(ctx, &users); err != nil {
		er.logger.Println(err)
		return nil, err
	}
	return users, nil
}

func (er *EmploymentRepo) UpdateUser(userId string, user *models.User) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	userCollection := OpenCollection(er.cli, "users")
	objectId, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	updateData := bson.M{
		"$set": bson.M{
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"email":      user.Email,
			"phone":      user.Phone,
			"address":    user.Address,
			"jmbg":       user.JMBG,
		},
	}

	result, err := userCollection.UpdateOne(ctx, bson.M{"_id": objectId}, updateData)
	if err != nil {
		return fmt.Errorf("could not update user with id: %s, error: %v", userId, err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no user found with id: %s", userId)
	}

	er.logger.Printf("Updated user with id: %s", userId)
	return nil
}

func (er *EmploymentRepo) DeleteUser(userId string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	userCollection := OpenCollection(er.cli, "users")
	objectId, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return fmt.Errorf("invalid ID: %v", err)
	}

	result, err := userCollection.DeleteOne(ctx, bson.M{"_id": objectId})
	if err != nil {
		return fmt.Errorf("could not delete user with id: %s, error: %v", userId, err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("no user found with id: %s", userId)
	}

	er.logger.Printf("Deleted user with id: %s", userId)
	return nil
}
