package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	"employment-service/data"
	helper "employment-service/helpers"
	"employment-service/internal/handlers"
	"employment-service/internal/routes"
	"employment-service/internal/services"
	"employment-service/messaging"

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
	router.Use(cors.Middleware(cors.Config{
		Origins:         "http://localhost:3000",
		Methods:         "GET, PUT, POST, DELETE, OPTIONS, PATCH",
		RequestHeaders:  "Origin, Authorization, Content-Type, Accept, X-Requested-With",
		ExposedHeaders:  "",
		MaxAge:          50 * time.Second,
		Credentials:     true,
		ValidateHeaders: false,
	}))

	timeoutContext, cancel := context.WithTimeout(context.Background(), 50*time.Second)
	defer cancel()

	logger := log.New(os.Stdout, "[employment-api] ", log.LstdFlags)
	storeLogger := log.New(os.Stdout, "[employment-store] ", log.LstdFlags)

	store, err := data.NewEmploymentRepo(timeoutContext, storeLogger)
	if err != nil {
		logger.Fatal(err)
	}
	defer store.DisconnectMongo(timeoutContext)
	store.Ping()

	helper.InitializeTokenHelper(store.GetClient())

	// ── RabbitMQ broker ──────────────────────────────────────────────────────
	broker, err := messaging.NewBroker(logger)
	if err != nil {
		logger.Printf("[main] RabbitMQ unavailable (%v) – chat will fall back to direct DB writes", err)
		broker = nil
	} else {
		defer broker.Close()
	}

	// ── WebSocket hub ─────────────────────────────────────────────────────────
	hub := messaging.NewHub(logger)

	// ── RabbitMQ consumer: persist → push via WebSocket ───────────────────────
	if broker != nil {
		broker.Consume(func(p messaging.MessagePayload) {
			// 1. Persist to MongoDB
			if dbErr := store.PersistMessagePayload(p); dbErr != nil {
				logger.Printf("[consumer] persist error: %v", dbErr)
			}
			// 2. Push to receiver's WebSocket connection(s)
			hub.Deliver(p)
		})
	}

	// ── Wire services / handlers / routes ─────────────────────────────────────
	svcs := services.NewServices(store, broker, hub, logger)
	hdlrs := handlers.NewHandlers(svcs, hub, logger)
	routes.SetupRoutes(router, hdlrs)

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

	ctx, cancel2 := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel2()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatalf("Server shutdown failed: %v", err)
	}

	logger.Println("Server gracefully stopped")
}
