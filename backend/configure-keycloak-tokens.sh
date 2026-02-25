#!/bin/bash

# Script to configure Keycloak with very long token lifetimes
# This makes tokens last much longer (24 hours) for development

echo "🔧 Configuring Keycloak for Extended Token Lifetime..."

# Keycloak admin credentials
KEYCLOAK_URL="http://localhost:8090"
REALM="euprava"
ADMIN_USER="admin"
ADMIN_PASSWORD="admin"

# Step 1: Get admin access token
echo "📝 Getting admin access token..."
ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${ADMIN_USER}" \
  -d "password=${ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  | grep -o '"access_token":"[^"]*' \
  | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Failed to get admin token. Make sure Keycloak is running on ${KEYCLOAK_URL}"
  exit 1
fi

echo "✅ Admin token obtained"

# Step 2: Update realm settings with very long token lifetimes
echo "⏰ Updating token lifetimes..."

# Token configuration (in seconds):
# 86400 seconds = 24 hours
# 604800 seconds = 7 days
# 2592000 seconds = 30 days

curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "accessTokenLifespan": 86400,
    "accessTokenLifespanForImplicitFlow": 86400,
    "ssoSessionIdleTimeout": 604800,
    "ssoSessionMaxLifespan": 2592000,
    "offlineSessionIdleTimeout": 2592000,
    "offlineSessionMaxLifespan": 5184000,
    "accessCodeLifespan": 300,
    "accessCodeLifespanUserAction": 600,
    "accessCodeLifespanLogin": 1800,
    "actionTokenGeneratedByAdminLifespan": 43200,
    "actionTokenGeneratedByUserLifespan": 600
  }'

echo ""
echo "✅ Token lifetimes updated!"
echo ""
echo "📋 New Configuration:"
echo "  ✓ Access Token Lifespan: 24 hours (86400 seconds)"
echo "  ✓ SSO Session Idle: 7 days (604800 seconds)"
echo "  ✓ SSO Session Max: 30 days (2592000 seconds)"
echo "  ✓ Offline Session Idle: 30 days"
echo "  ✓ Offline Session Max: 60 days"
echo ""
echo "🎉 Keycloak configured! Your tokens will now last much longer."
echo ""
echo "⚠️  Note: You need to LOG OUT and LOG IN AGAIN for the new settings to take effect!"
echo ""
