package main

import (
	"context"
	"log"
	"os"
	"time"
	"university-service/controllers"
	repositories "university-service/repository"
	"university-service/routes"

	"github.com/gin-gonic/gin"
	cors "github.com/itsjamie/gin-cors"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}

	logger := log.New(os.Stdout, "INFO: ", log.LstdFlags)

	ctx := context.Background()
	repo, err := repositories.New(ctx, logger)
	if err != nil {
		logger.Fatalf("Failed to initialize repository: %v", err)
	}

	ctrl := controllers.NewControllers(repo)

	router := gin.New()
	router.Use(gin.Logger())

	router.Use(cors.Middleware(cors.Config{
		Origins:         "http://localhost:3000, *",            // Allow local and all origins
		Methods:         "GET, PUT, POST, DELETE, OPTIONS",     // Allowed HTTP methods
		RequestHeaders:  "Origin, Authorization, Content-Type", // Allowed request headers
		ExposedHeaders:  "",                                    // Exposed headers
		MaxAge:          50 * time.Second,                      // CORS preflight cache duration
		Credentials:     true,                                  // Allow credentials
		ValidateHeaders: false,                                 // Do not validate headers
	}))

	routes.RegisterRoutes(router, ctrl)

	router.Run(":" + port)
}
