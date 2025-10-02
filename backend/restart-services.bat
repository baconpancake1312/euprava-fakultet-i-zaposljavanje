@echo off
echo Stopping all services...

taskkill /f /im go.exe 2>nul
taskkill /f /im backend.exe 2>nul

echo Waiting for services to stop...
timeout /t 2 /nobreak >nul

echo Starting Auth Service...
cd auth-service
start "Auth Service" cmd /k "go run main.go"
cd ..

echo Starting University Service...
cd university-service
start "University Service" cmd /k "go run main.go"
cd ..

echo Starting Employment Service...
cd employment-service
start "Employment Service" cmd /k "go run main.go"
cd ..

echo All services started with updated CORS configuration!
echo Frontend should now be able to connect to all services.
pause
