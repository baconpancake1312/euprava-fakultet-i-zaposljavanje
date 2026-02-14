package main

import (
	"context"
	"log"
	"os"
	"time"
	"university-service/controllers"
	repositories "university-service/repository"
	"university-service/routes"

	helper "university-service/helpers"

	"github.com/gin-gonic/gin"
	cors "github.com/itsjamie/gin-cors"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}

	logger := log.New(os.Stdout, "INFO: ", log.LstdFlags)
	repoLogger := log.New(os.Stdout, "[university-repository] ", log.LstdFlags)
	controllerLogger := log.New(os.Stdout, "[university-api] ", log.LstdFlags)

	ctx := context.Background()
	repo, err := repositories.New(ctx, repoLogger)
	if err != nil {
		logger.Fatalf("Failed to initialize repository: %v", err)
	}

	ctrl := controllers.NewControllers(repo, controllerLogger)
	helper.StartExamStatusUpdater(repo, logger)

	router := gin.New()
	router.Use(gin.Logger())

	router.Use(cors.Middleware(cors.Config{
		Origins:         "http://localhost:4321, http://localhost:3000, http://localhost:4200",
		Methods:         "GET, PUT, POST, DELETE, OPTIONS, PATCH",
		RequestHeaders:  "Origin, Authorization, Content-Type, Accept, X-Requested-With",
		ExposedHeaders:  "",
		MaxAge:          50 * time.Second,
		Credentials:     true,
		ValidateHeaders: false,
	}))

	routes.RegisterRoutes(router, ctrl)

	router.Run(":" + port)
}
