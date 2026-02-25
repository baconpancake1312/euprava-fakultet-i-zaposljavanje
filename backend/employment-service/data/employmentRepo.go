package data

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

type EmploymentRepo struct {
	cli    *mongo.Client
	logger *log.Logger
	client *http.Client
}

func NewEmploymentRepo(ctx context.Context, logger *log.Logger) (*EmploymentRepo, error) {
	dburi := os.Getenv("MONGO_DB_URI")
	if dburi == "" {
		dburi = "mongodb://root:pass@employment_data_base:27017/employmentDB?authSource=admin"
	}

	client, err := mongo.NewClient(options.Client().ApplyURI(dburi))
	if err != nil {
		return nil, err
	}

	err = client.Connect(ctx)
	if err != nil {
		return nil, err
	}

	httpClient := &http.Client{
		Transport: &http.Transport{
			MaxIdleConns:        10,
			MaxIdleConnsPerHost: 10,
			MaxConnsPerHost:     10,
		},
	}

	return &EmploymentRepo{
		logger: logger,
		cli:    client,
		client: httpClient,
	}, nil
}

func (er *EmploymentRepo) DisconnectMongo(ctx context.Context) error {
	err := er.cli.Disconnect(ctx)
	if err != nil {
		return err
	}
	return nil
}

func (er *EmploymentRepo) Ping() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := er.cli.Ping(ctx, readpref.Primary())
	if err != nil {
		er.logger.Println(err)
	}

	databases, err := er.cli.ListDatabaseNames(ctx, bson.M{})
	if err != nil {
		er.logger.Println(err)
	}
	fmt.Println(databases)
}

func (er *EmploymentRepo) GetClient() *mongo.Client {
	return er.cli
}

func OpenCollection(client *mongo.Client, collectionName string) *mongo.Collection {
	dbName := os.Getenv("EMPLOYMENT_DB_HOST")
	if dbName == "" {
		dbName = "employmentDB"
	}
	var collection *mongo.Collection = client.Database(dbName).Collection(collectionName)
	return collection
}
