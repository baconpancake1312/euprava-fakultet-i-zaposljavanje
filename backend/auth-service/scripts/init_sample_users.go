package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type User struct {
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Email        string    `json:"email"`
	Password     string    `json:"password"`
	Phone        string    `json:"phone"`
	Address      string    `json:"address"`
	JMBG         string    `json:"jmbg"`
	DateOfBirth  time.Time `json:"date_of_birth"`
	UserType     string    `json:"user_type"`
}

func main() {
	// Sample users to create
	sampleUsers := []User{
		// Employers
		{
			FirstName:   "Marko",
			LastName:    "Petrovic",
			Email:       "marko.petrovic@company.com",
			Password:    "password123",
			Phone:       "+38160123456",
			Address:     "Bulevar Kralja Aleksandra 123, Beograd",
			JMBG:        "1234567890123",
			DateOfBirth: time.Date(1985, 5, 15, 0, 0, 0, 0, time.UTC),
			UserType:    "EMPLOYER",
		},
		{
			FirstName:   "Ana",
			LastName:    "Jovanovic",
			Email:       "ana.jovanovic@techcorp.com",
			Password:    "password123",
			Phone:       "+38160765432",
			Address:     "Nemanjina 45, Novi Sad",
			JMBG:        "2345678901234",
			DateOfBirth: time.Date(1982, 8, 22, 0, 0, 0, 0, time.UTC),
			UserType:    "EMPLOYER",
		},
		// Students
		{
			FirstName:   "Nikola",
			LastName:    "Ilic",
			Email:       "nikola.ilic@student.uni.edu",
			Password:    "password123",
			Phone:       "+38161123456",
			Address:     "Studentski trg 1, Beograd",
			JMBG:        "3456789012345",
			DateOfBirth: time.Date(2000, 3, 10, 0, 0, 0, 0, time.UTC),
			UserType:    "STUDENT",
		},
		{
			FirstName:   "Marija",
			LastName:    "Stojanovic",
			Email:       "marija.stojanovic@student.uni.edu",
			Password:    "password123",
			Phone:       "+38162765432",
			Address:     "Cara Dusana 25, Beograd",
			JMBG:        "4567890123456",
			DateOfBirth: time.Date(1999, 7, 5, 0, 0, 0, 0, time.UTC),
			UserType:    "STUDENT",
		},
		// Candidates
		{
			FirstName:   "Petar",
			LastName:    "Djordjevic",
			Email:       "petar.djordjevic@candidate.com",
			Password:    "password123",
			Phone:       "+38163123456",
			Address:     "Knez Mihailova 15, Beograd",
			JMBG:        "5678901234567",
			DateOfBirth: time.Date(1990, 12, 1, 0, 0, 0, 0, time.UTC),
			UserType:    "CANDIDATE",
		},
		{
			FirstName:   "Jelena",
			LastName:    "Nikolic",
			Email:       "jelena.nikolic@candidate.com",
			Password:    "password123",
			Phone:       "+38164765432",
			Address:     "Terazije 12, Beograd",
			JMBG:        "6789012345678",
			DateOfBirth: time.Date(1988, 9, 18, 0, 0, 0, 0, time.UTC),
			UserType:    "CANDIDATE",
		},
	}

	authServiceURL := "http://localhost:8080/users/register"

	for _, user := range sampleUsers {
		jsonData, err := json.Marshal(user)
		if err != nil {
			log.Printf("Error marshaling user %s %s: %v", user.FirstName, user.LastName, err)
			continue
		}

		resp, err := http.Post(authServiceURL, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("Error registering user %s %s: %v", user.FirstName, user.LastName, err)
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusCreated {
			log.Printf("Successfully registered user: %s %s (%s)", user.FirstName, user.LastName, user.UserType)
		} else {
			log.Printf("Failed to register user %s %s, status: %d", user.FirstName, user.LastName, resp.StatusCode)
			// Read response body for error details
			buf := new(bytes.Buffer)
			buf.ReadFrom(resp.Body)
			log.Printf("Response: %s", buf.String())
		}
	}

	fmt.Println("Sample user registration completed!")
	fmt.Println("\nUser Credentials:")
	fmt.Println("=================")
	for _, user := range sampleUsers {
		fmt.Printf("%s %s (%s): %s / %s\n", user.FirstName, user.LastName, user.UserType, user.Email, user.Password)
	}
}