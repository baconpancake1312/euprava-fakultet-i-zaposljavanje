@echo off
REM Script to configure Keycloak with very long token lifetimes (Windows)
REM This makes tokens last much longer (24 hours) for development

echo.
echo ========================================
echo Configuring Keycloak Token Lifetimes
echo ========================================
echo.

REM Keycloak configuration
set KEYCLOAK_URL=http://localhost:8090
set REALM=euprava
set ADMIN_USER=admin
set ADMIN_PASSWORD=admin

echo Step 1: Getting admin access token...
echo.

REM Get admin token (using curl for Windows)
for /f "tokens=*" %%i in ('curl -s -X POST "%KEYCLOAK_URL%/realms/master/protocol/openid-connect/token" -H "Content-Type: application/x-www-form-urlencoded" -d "username=%ADMIN_USER%" -d "password=%ADMIN_PASSWORD%" -d "grant_type=password" -d "client_id=admin-cli"') do set RESPONSE=%%i

REM Parse access token from response (simple extraction)
echo %RESPONSE% > temp_token.txt
for /f "tokens=2 delims=:," %%a in ('findstr /C:"access_token" temp_token.txt') do set TOKEN_PART=%%a
set ADMIN_TOKEN=%TOKEN_PART:"=%
del temp_token.txt

if "%ADMIN_TOKEN%"=="" (
    echo [ERROR] Failed to get admin token
    echo Make sure Keycloak is running at %KEYCLOAK_URL%
    pause
    exit /b 1
)

echo [OK] Admin token obtained
echo.
echo Step 2: Updating realm token lifetimes...
echo.

REM Update realm settings with extended token lifetimes
curl -X PUT "%KEYCLOAK_URL%/admin/realms/%REALM%" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"accessTokenLifespan\": 86400, \"accessTokenLifespanForImplicitFlow\": 86400, \"ssoSessionIdleTimeout\": 604800, \"ssoSessionMaxLifespan\": 2592000, \"offlineSessionIdleTimeout\": 2592000, \"offlineSessionMaxLifespan\": 5184000}"

echo.
echo ========================================
echo Configuration Complete!
echo ========================================
echo.
echo New Token Lifetimes:
echo   - Access Token: 24 hours
echo   - SSO Session Idle: 7 days
echo   - SSO Session Max: 30 days
echo.
echo [IMPORTANT] You must LOG OUT and LOG IN AGAIN
echo             for the new settings to take effect!
echo.
pause
