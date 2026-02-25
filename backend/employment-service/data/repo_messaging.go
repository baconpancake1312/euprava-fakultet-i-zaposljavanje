package data

import (
	"context"
	"fmt"
	"time"

	"employment-service/messaging"
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

// GetInboxMessages returns all messages where the user is the receiver (inbox).
func (er *EmploymentRepo) GetInboxMessages(userId string) ([]*models.Message, error) {
	collection := OpenCollection(er.cli, "messages")
	oid, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %v", err)
	}
	filter := bson.M{"receiver_id": oid}
	cursor, err := collection.Find(context.Background(), filter, nil)
	if err != nil {
		return nil, err
	}
	var messages []*models.Message
	if err := cursor.All(context.Background(), &messages); err != nil {
		return nil, err
	}
	return messages, nil
}

// GetSentMessages returns all messages where the user is the sender (sent).
func (er *EmploymentRepo) GetSentMessages(userId string) ([]*models.Message, error) {
	collection := OpenCollection(er.cli, "messages")
	oid, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %v", err)
	}
	filter := bson.M{"sender_id": oid}
	cursor, err := collection.Find(context.Background(), filter, nil)
	if err != nil {
		return nil, err
	}
	var messages []*models.Message
	if err := cursor.All(context.Background(), &messages); err != nil {
		return nil, err
	}
	return messages, nil
}

// PersistMessagePayload is called by the RabbitMQ consumer to write a message
// that was published via the broker into MongoDB.
func (er *EmploymentRepo) PersistMessagePayload(p messaging.MessagePayload) error {
	oid, err := primitive.ObjectIDFromHex(p.ID)
	if err != nil {
		oid = primitive.NewObjectID()
	}
	senderOid, err := primitive.ObjectIDFromHex(p.SenderID)
	if err != nil {
		return fmt.Errorf("invalid sender_id: %v", err)
	}
	receiverOid, err := primitive.ObjectIDFromHex(p.ReceiverID)
	if err != nil {
		return fmt.Errorf("invalid receiver_id: %v", err)
	}
	var jobListingOid primitive.ObjectID
	if p.JobListingID != "" && p.JobListingID != "000000000000000000000000" {
		jobListingOid, _ = primitive.ObjectIDFromHex(p.JobListingID)
	}
	msg := models.Message{
		ID:           oid,
		SenderId:     senderOid,
		ReceiverId:   receiverOid,
		JobListingId: jobListingOid,
		Content:      p.Content,
		SentAt:       p.SentAt,
		Read:         false,
	}
	collection := OpenCollection(er.cli, "messages")
	_, err = collection.InsertOne(context.Background(), msg)
	return err
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
