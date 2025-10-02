package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

func main() {
	// Service accounts to create
	serviceAccounts := []map[string]string{
		{
			"service_name": "auth-service",
			"password":     "auth-service-password",
			"user_type":    "AUTH_SERVICE",
		},
		{
			"service_name": "university-service",
			"password":     "university-service-password",
			"user_type":    "UNIVERSITY_SERVICE",
		},
		{
			"service_name": "employment-service",
			"password":     "employment-service-password",
			"user_type":    "EMPLOYMENT_SERVICE",
		},
	}

	authServiceURL := "http://localhost:8080/service-accounts"

	for _, account := range serviceAccounts {
		jsonData, err := json.Marshal(account)
		if err != nil {
			log.Printf("Error marshaling account %s: %v", account["service_name"], err)
			continue
		}

		resp, err := http.Post(authServiceURL, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("Error creating service account %s: %v", account["service_name"], err)
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusCreated {
			log.Printf("Successfully created service account: %s", account["service_name"])
		} else {
			log.Printf("Failed to create service account %s, status: %d", account["service_name"], resp.StatusCode)
		}
	}

	fmt.Println("Service account initialization completed!")
}
