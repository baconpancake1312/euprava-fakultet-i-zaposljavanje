// Seed mock data: seeds auth, university, and employment services with mock data.
//
// Run after init_service_accounts. Requires auth (8080), university (8088), and
// employment (8089) to be up. Optionally set AUTH_URL, UNIVERSITY_URL, EMPLOYMENT_URL.
//
// Usage: from backend/auth-service: go run ./scripts/seed
//        or: cd scripts/seed && go run .

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

const defaultAuthURL = "http://localhost:8080"
const defaultUniversityURL = "http://localhost:8088"
const defaultEmploymentURL = "http://localhost:8089"
const mockPassword = "password"

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	authURL := getEnv("AUTH_URL", defaultAuthURL)
	uniURL := getEnv("UNIVERSITY_URL", defaultUniversityURL)
	empURL := getEnv("EMPLOYMENT_URL", defaultEmploymentURL)

	log.Println("Seed mock data: starting (auth, university, employment)")
	userIDs := make(map[string]string) // role -> user_id from auth

	// 1. Register mock users (auth + auto-sync to university/employment)
	mockUsers := []struct {
		Email    string
		UserType string
	}{
		{"sluzba@mock.local", "STUDENTSKA_SLUZBA"},
		{"admin@mock.local", "ADMINISTRATOR"},
		{"student1@mock.local", "STUDENT"},
		{"professor1@mock.local", "PROFESSOR"},
		{"employer1@mock.local", "EMPLOYER"},
		{"candidate1@mock.local", "CANDIDATE"},
	}

	for _, u := range mockUsers {
		body := map[string]interface{}{
			"first_name":    "Mock",
			"last_name":     u.UserType,
			"email":         u.Email,
			"password":      mockPassword,
			"phone":         "+381600000000",
			"address":       "Mock Address 1",
			"jmbg":          "0101990800001",
			"date_of_birth": "1990-01-01T00:00:00Z",
			"user_type":     u.UserType,
		}
		jsonData, _ := json.Marshal(body)
		resp, err := http.Post(authURL+"/users/register", "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("Register %s: request error: %v", u.Email, err)
			continue
		}
		if resp.StatusCode == http.StatusConflict {
			log.Printf("Register %s: already exists, skipping", u.Email)
			resp.Body.Close()
			continue
		}
		if resp.StatusCode != http.StatusCreated {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			log.Printf("Register %s: status %d: %s", u.Email, resp.StatusCode, string(body))
			continue
		}
		var result struct {
			UserID string `json:"user_id"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&result)
		resp.Body.Close()
		if result.UserID != "" {
			userIDs[u.UserType] = result.UserID
			log.Printf("Registered %s -> user_id %s", u.Email, result.UserID)
		}
	}

	// 2. Login as STUDENTSKA_SLUZBA for university seeding
	sluzbaToken := ""
	if userIDs["STUDENTSKA_SLUZBA"] != "" {
		loginBody := map[string]string{"email": "sluzba@mock.local", "password": mockPassword}
		jsonData, _ := json.Marshal(loginBody)
		resp, err := http.Post(authURL+"/users/login", "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("Login STUDENTSKA_SLUZBA: %v", err)
		} else {
			var loginResult struct {
				Token string `json:"token"`
			}
			_ = json.NewDecoder(resp.Body).Decode(&loginResult)
			resp.Body.Close()
			sluzbaToken = loginResult.Token
			if sluzbaToken != "" {
				log.Println("Logged in as STUDENTSKA_SLUZBA")
			}
		}
	}

	// 3. Seed university structure (universities -> departments -> majors -> subjects -> exam period)
	var universityID, departmentID, majorID string

	if sluzbaToken != "" {
		client := &http.Client{Timeout: 15 * time.Second}

		// 3a. Create university
		uniPayload := map[string]interface{}{
			"name":             "Mock University",
			"location":         "Belgrade",
			"foundation_year":  1900,
			"student_count":    5000,
			"staff_count":      500,
			"accreditation":    "National",
			"offered_programs": []string{"CS", "EE"},
		}
		jsonData, _ := json.Marshal(uniPayload)
		req, _ := http.NewRequest("POST", uniURL+"/universities/create", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+sluzbaToken)
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("Create university: %v", err)
		} else {
			if resp.StatusCode == http.StatusCreated {
				var uniResp struct {
					ID string `json:"id"`
				}
				if json.NewDecoder(resp.Body).Decode(&uniResp) == nil && uniResp.ID != "" {
					universityID = uniResp.ID
					log.Printf("Created university: %s", universityID)
				}
			} else {
				body, _ := io.ReadAll(resp.Body)
				log.Printf("Create university: status %d: %s", resp.StatusCode, string(body))
			}
			resp.Body.Close()
		}

		// 3b. Create department (head = professor user_id as ObjectID)
		profID := userIDs["PROFESSOR"]
		if profID == "" {
			profID = "000000000000000000000000" // placeholder if no professor
		}
		depPayload := map[string]interface{}{
			"name": "Mock Department",
			"head": profID,
		}
		jsonData, _ = json.Marshal(depPayload)
		req, _ = http.NewRequest("POST", uniURL+"/departments/create", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+sluzbaToken)
		resp, err = client.Do(req)
		if err != nil {
			log.Printf("Create department: %v", err)
		} else {
			if resp.StatusCode == http.StatusCreated {
				var depResp struct {
					ID string `json:"id"`
				}
				if json.NewDecoder(resp.Body).Decode(&depResp) == nil && depResp.ID != "" {
					departmentID = depResp.ID
					log.Printf("Created department: %s", departmentID)
				}
			} else {
				body, _ := io.ReadAll(resp.Body)
				log.Printf("Create department: status %d: %s", resp.StatusCode, string(body))
			}
			resp.Body.Close()
		}

		// 3c. Create major
		if departmentID != "" {
			majorPayload := map[string]interface{}{
				"name":          "Computer Science",
				"department_id": departmentID,
				"duration":      4,
				"description":   "Mock CS major",
			}
			jsonData, _ := json.Marshal(majorPayload)
			req, _ := http.NewRequest("POST", uniURL+"/majors", bytes.NewBuffer(jsonData))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+sluzbaToken)
			resp, err := client.Do(req)
			if err != nil {
				log.Printf("Create major: %v", err)
			} else {
				if resp.StatusCode == http.StatusCreated {
					var majResp struct {
						ID string `json:"id"`
					}
					if json.NewDecoder(resp.Body).Decode(&majResp) == nil && majResp.ID != "" {
						majorID = majResp.ID
						log.Printf("Created major: %s", majorID)
					}
				} else {
					body, _ := io.ReadAll(resp.Body)
					log.Printf("Create major: status %d: %s", resp.StatusCode, string(body))
				}
				resp.Body.Close()
			}
		}

		// 3d. Create subject (major_id, professor_ids)
		if majorID != "" && userIDs["PROFESSOR"] != "" {
			subPayload := map[string]interface{}{
				"name":          "Mock Subject",
				"major_id":      majorID,
				"professor_ids": []string{userIDs["PROFESSOR"]},
				"year":          1,
				"semester":      1,
			}
			jsonData, _ := json.Marshal(subPayload)
			req, _ := http.NewRequest("POST", uniURL+"/subject/create", bytes.NewBuffer(jsonData))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+sluzbaToken)
			resp, err := client.Do(req)
			if err != nil {
				log.Printf("Create subject: %v", err)
			} else {
				if resp.StatusCode == http.StatusCreated {
					log.Println("Created subject")
				} else {
					body, _ := io.ReadAll(resp.Body)
					log.Printf("Create subject: status %d: %s", resp.StatusCode, string(body))
				}
				resp.Body.Close()
			}
		}

		// 3e. Create exam period
		start := time.Now().AddDate(0, 0, 7)
		end := start.AddDate(0, 0, 14)
		examPeriodPayload := map[string]interface{}{
			"name":          "Mock Exam Period",
			"start_date":    start.Format(time.RFC3339),
			"end_date":      end.Format(time.RFC3339),
			"academic_year": start.Year(),
			"semester":      1,
			"is_active":     true,
		}
		jsonData, _ = json.Marshal(examPeriodPayload)
		req, _ = http.NewRequest("POST", uniURL+"/exam-periods", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+sluzbaToken)
		resp, err = client.Do(req)
		if err != nil {
			log.Printf("Create exam period: %v", err)
		} else {
			if resp.StatusCode == http.StatusCreated {
				log.Println("Created exam period")
			} else {
				body, _ := io.ReadAll(resp.Body)
				log.Printf("Create exam period: status %d: %s", resp.StatusCode, string(body))
			}
			resp.Body.Close()
		}
	}

	// 4. Seed employment: job listings (login as employer) and application (login as candidate)
	// 4a. Login as employer, get employer by user_id, create job listing
	var jobListingID string
	if userIDs["EMPLOYER"] != "" {
		loginBody := map[string]string{"email": "employer1@mock.local", "password": mockPassword}
		jsonData, _ := json.Marshal(loginBody)
		resp, err := http.Post(authURL+"/users/login", "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("Login employer: %v", err)
		} else {
			var loginResult struct {
				Token string `json:"token"`
			}
			_ = json.NewDecoder(resp.Body).Decode(&loginResult)
			resp.Body.Close()
			empToken := loginResult.Token
			if empToken != "" {
				client := &http.Client{Timeout: 15 * time.Second}
				req, _ := http.NewRequest("GET", empURL+"/employers/user/"+userIDs["EMPLOYER"], nil)
				req.Header.Set("Authorization", "Bearer "+empToken)
				resp, err := client.Do(req)
				if err != nil {
					log.Printf("Get employer by user_id: %v", err)
				} else {
					if resp.StatusCode == http.StatusOK {
						var emp struct {
							ID string `json:"id"`
						}
						if json.NewDecoder(resp.Body).Decode(&emp) == nil && emp.ID != "" {
							jobPayload := map[string]interface{}{
								"poster_id":     emp.ID,
								"position":      "Mock Developer",
								"description":   "Mock job description",
								"location":      "Belgrade",
								"salary":        "Competitive",
								"requirements":  "Go, REST",
								"work_type":     "Hybrid",
								"is_internship": false,
							}
							jsonData, _ := json.Marshal(jobPayload)
							req2, _ := http.NewRequest("POST", empURL+"/job-listings", bytes.NewBuffer(jsonData))
							req2.Header.Set("Content-Type", "application/json")
							req2.Header.Set("Authorization", "Bearer "+empToken)
							resp2, err2 := client.Do(req2)
							if err2 != nil {
								log.Printf("Create job listing: %v", err2)
							} else {
								if resp2.StatusCode == http.StatusOK || resp2.StatusCode == http.StatusCreated {
									var jobResp struct {
										Listing struct {
											ID string `json:"id"`
										} `json:"listing"`
									}
									if json.NewDecoder(resp2.Body).Decode(&jobResp) == nil && jobResp.Listing.ID != "" {
										jobListingID = jobResp.Listing.ID
										log.Printf("Created job listing: %s", jobListingID)
									}
								} else {
									body, _ := io.ReadAll(resp2.Body)
									log.Printf("Create job listing: status %d: %s", resp2.StatusCode, string(body))
								}
								resp2.Body.Close()
							}
						}
					} else {
						body, _ := io.ReadAll(resp.Body)
						log.Printf("Get employer: status %d: %s", resp.StatusCode, string(body))
					}
					resp.Body.Close()
				}
			}
		}
	}

	// 4b. Login as candidate, get candidate by user_id, create application
	if jobListingID != "" && userIDs["CANDIDATE"] != "" {
		loginBody := map[string]string{"email": "candidate1@mock.local", "password": mockPassword}
		jsonData, _ := json.Marshal(loginBody)
		resp, err := http.Post(authURL+"/users/login", "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("Login candidate: %v", err)
		} else {
			var loginResult struct {
				Token string `json:"token"`
			}
			_ = json.NewDecoder(resp.Body).Decode(&loginResult)
			resp.Body.Close()
			candToken := loginResult.Token
			if candToken != "" {
				client := &http.Client{Timeout: 15 * time.Second}
				req, _ := http.NewRequest("GET", empURL+"/candidates/user/"+userIDs["CANDIDATE"], nil)
				req.Header.Set("Authorization", "Bearer "+candToken)
				resp, err := client.Do(req)
				if err != nil {
					log.Printf("Get candidate by user_id: %v", err)
				} else {
					if resp.StatusCode == http.StatusOK {
						var cand struct {
							ID string `json:"id"`
						}
						if json.NewDecoder(resp.Body).Decode(&cand) == nil && cand.ID != "" {
							appPayload := map[string]interface{}{
								"applicant_id": cand.ID,
								"listing_id":   jobListingID,
								"status":       "pending",
								"submitted_at": time.Now().Format(time.RFC3339),
							}
							jsonData, _ := json.Marshal(appPayload)
							req2, _ := http.NewRequest("POST", empURL+"/applications", bytes.NewBuffer(jsonData))
							req2.Header.Set("Content-Type", "application/json")
							req2.Header.Set("Authorization", "Bearer "+candToken)
							resp2, err2 := client.Do(req2)
							if err2 != nil {
								log.Printf("Create application: %v", err2)
							} else {
								if resp2.StatusCode == http.StatusOK || resp2.StatusCode == http.StatusCreated {
									log.Println("Created application")
								} else {
									body, _ := io.ReadAll(resp2.Body)
									log.Printf("Create application: status %d: %s", resp2.StatusCode, string(body))
								}
								resp2.Body.Close()
							}
						}
					} else {
						body, _ := io.ReadAll(resp.Body)
						log.Printf("Get candidate: status %d: %s", resp.StatusCode, string(body))
					}
					resp.Body.Close()
				}
			}
		}
	}

	fmt.Println("Mock data seeding completed.")
}
