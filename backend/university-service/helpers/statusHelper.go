package helper

import (
	"log"
	"time"
	repositories "university-service/repository"
)

// Add to main.go
func StartExamStatusUpdater(repo *repositories.Repository, logger *log.Logger) {
	err := repo.UpdateExamSessionsToPending()
	if err != nil {
		logger.Printf("Error updating exam sessions to pending on startup: %v", err)
	}

	ticker := time.NewTicker(1 * time.Hour)
	go func() {
		for {
			select {
			case <-ticker.C:
				err := repo.UpdateExamSessionsToPending()
				if err != nil {
					logger.Printf("Error updating exam sessions to pending: %v", err)
				}
			}
		}
	}()
}
