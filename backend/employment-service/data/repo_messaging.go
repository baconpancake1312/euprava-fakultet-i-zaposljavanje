package data

import (
	"context"
	"fmt"
	"time"

	"employment-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (er *EmploymentRepo) SendMessage(message *models.Message) (primitive.ObjectID, error) {
	collection := OpenCollection(er.cli, "messages")
	message.ID = primitive.NewObjectID()
	message.SentAt = time.Now()
	message.Read = false
	res, err := collection.InsertOne(context.Background(), message)
	if err != nil {
		return primitive.NilObjectID, err
	}
	oid, ok := res.InsertedID.(primitive.ObjectID)
	if !ok {
		return primitive.NilObjectID, fmt.Errorf("failed to get inserted message ID")
	}
	return oid, nil
}

func (er *EmploymentRepo) GetMessagesBetweenUsers(userAId, userBId string) ([]*models.Message, error) {
	collection := OpenCollection(er.cli, "messages")
	oidA, err := primitive.ObjectIDFromHex(userAId)
	if err != nil {
		return nil, err
	}
	oidB, err := primitive.ObjectIDFromHex(userBId)
	if err != nil {
		return nil, err
	}
	filter := bson.M{
		"$or": []bson.M{
			{"sender_id": oidA, "receiver_id": oidB},
			{"sender_id": oidB, "receiver_id": oidA},
		},
	}
	cursor, err := collection.Find(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	var messages []*models.Message
	if err := cursor.All(context.Background(), &messages); err != nil {
		return nil, err
	}
	return messages, nil
}

func (er *EmploymentRepo) MarkMessagesAsRead(senderId, receiverId string) error {
	collection := OpenCollection(er.cli, "messages")
	oidSender, err := primitive.ObjectIDFromHex(senderId)
	if err != nil {
		return err
	}
	oidReceiver, err := primitive.ObjectIDFromHex(receiverId)
	if err != nil {
		return err
	}
	filter := bson.M{"sender_id": oidSender, "receiver_id": oidReceiver, "read": false}
	_, err = collection.UpdateMany(context.Background(), filter, bson.M{"$set": bson.M{"read": true}})
	return err
}
