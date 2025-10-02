#!/bin/bash

echo "Stopping all services..."

pkill -f "go run main.go" 2>/dev/null
pkill -f "backend.exe" 2>/dev/null

echo "Waiting for services to stop..."
sleep 2

echo "Starting Auth Service..."
cd auth-service
gnome-terminal -- bash -c "go run main.go; exec bash" &
cd ..

echo "Starting University Service..."
cd university-service
gnome-terminal -- bash -c "go run main.go; exec bash" &
cd ..

echo "Starting Employment Service..."
cd employment-service
gnome-terminal -- bash -c "go run main.go; exec bash" &
cd ..

echo "All services started with updated CORS configuration!"
echo "Frontend should now be able to connect to all services."
