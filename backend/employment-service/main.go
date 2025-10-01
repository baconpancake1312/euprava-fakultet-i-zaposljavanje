package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	controllers "employment-service/controllers"

	"employment-service/data"
	helper "employment-service/helpers"
	routes "employment-service/routes"

	"github.com/gin-gonic/gin"
	_ "github.com/heroku/x/hmetrics/onload"
	cors "github.com/itsjamie/gin-cors"
)

func main() {
	port := os.Getenv("PORT")

	if port == "" {
		port = "8089"
	}

	router := gin.New()
	router.Use(gin.Logger())
	// CORS
	router.Use(cors.Middleware(cors.Config{
		Origins:         "http://localhost:3000, *",
		Methods:         "GET, PUT, POST, DELETE, OPTIONS",
		RequestHeaders:  "Origin, Content-Type,Authorization",
		ExposedHeaders:  "",
		MaxAge:          50 * time.Second,
		Credentials:     true,
		ValidateHeaders: false,
	}))
	timeoutContext, cancel := context.WithTimeout(context.Background(), 50*time.Second)

	logger := log.New(os.Stdout, "[employment-api] ", log.LstdFlags)
	storeLogger := log.New(os.Stdout, "[employment-store] ", log.LstdFlags)
	store, err := data.NewEmploymentRepo(timeoutContext, storeLogger)
	if err != nil {
		logger.Fatal(err)
	}
	defer store.DisconnectMongo(timeoutContext)
	store.Ping()

	helper.InitializeTokenHelper(store.GetClient())

	if err != nil {
		log.Fatalf("failed to start the database server: %v", err)
	}
	if err != nil {
		logger.Fatal(err)
	}

	employmentController := controllers.NewEmploymentController(logger, store)

	routes.MainRoutes(router, *employmentController)

	server := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	go func() {
		logger.Printf("Server is up and running on port %s:\n", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("ListenAndServe: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit
	logger.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatalf("Server shutdown failed: %v", err)
	}

	logger.Println("Server gracefully stopped")
}
