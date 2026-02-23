package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
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
	// #region agent log
	func() {
		logData := map[string]interface{}{
			"runId":        "route-setup",
			"hypothesisId": "A",
			"location":     "main.go:83",
			"message":      "Before SetupRoutes",
			"data": map[string]interface{}{
				"handlers_nil":      hdlrs == nil,
				"admin_handler_nil": hdlrs != nil && hdlrs.Admin == nil,
			},
			"timestamp": time.Now().UnixMilli(),
		}
		if logJSON, err := json.Marshal(logData); err == nil {
			if wd, err := os.Getwd(); err == nil {
				logPath := filepath.Join(wd, ".cursor", "debug.log")
				if f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
					f.WriteString(string(logJSON) + "\n")
					f.Close()
				}
			}
		}
	}()
	// #endregion
	routes.SetupRoutes(router, hdlrs)
	// #region agent log
	func() {
		logData := map[string]interface{}{
			"runId":        "route-setup",
			"hypothesisId": "B",
			"location":     "main.go:103",
			"message":      "After SetupRoutes - checking registered routes",
			"data": map[string]interface{}{
				"router_routes_count": len(router.Routes()),
			},
			"timestamp": time.Now().UnixMilli(),
		}
		// Check if our route is registered
		adminRouteFound := false
		for _, route := range router.Routes() {
			if route.Method == "PUT" && route.Path == "/admin/employers/:id/approve" {
				adminRouteFound = true
				logData["data"].(map[string]interface{})["admin_route_found"] = true
				break
			}
		}
		if !adminRouteFound {
			logData["data"].(map[string]interface{})["admin_route_found"] = false
			// Log all PUT routes for debugging
			putRoutes := []string{}
			for _, route := range router.Routes() {
				if route.Method == "PUT" {
					putRoutes = append(putRoutes, route.Path)
				}
			}
			logData["data"].(map[string]interface{})["put_routes"] = putRoutes
		}
		if logJSON, err := json.Marshal(logData); err == nil {
			if wd, err := os.Getwd(); err == nil {
				logPath := filepath.Join(wd, ".cursor", "debug.log")
				if f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
					f.WriteString(string(logJSON) + "\n")
					f.Close()
				}
			}
		}
	}()
	// #endregion

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
