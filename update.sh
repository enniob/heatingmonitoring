#!/bin/bash
# This script updates the Heating Monitoring application with the latest code from GitHub.

# --- Configuration ---
PROJECT_PARENT_DIR="/home/pi"
# --- End of Configuration ---

# --- Do not edit below this line ---
PROJECT_DIR="$PROJECT_PARENT_DIR/heatingmonitoring"
WEB_ROOT="/var/www/heatingmonitoring"

echo "Starting update process..."

# Pull latest code
echo "Pulling latest code from GitHub..."
cd "$PROJECT_DIR"
git pull origin main  # Change 'main' to 'master' if that's your branch name

# Update backend dependencies
echo "Updating backend dependencies..."
cd "$PROJECT_DIR/backend"
npm install

# Setup .env file if it doesn't exist
if [ ! -f ".env" ]; then
  echo "Creating .env from sample.env..."
  cp sample.env .env
fi

# Update frontend dependencies and rebuild
echo "Updating frontend dependencies and rebuilding..."
cd "$PROJECT_DIR/frontend"
npm install
npm run build

# Copy new build to web root
echo "Deploying new frontend build..."
sudo rm -rf "$WEB_ROOT"/*
sudo cp -r "$PROJECT_DIR/frontend/dist/"* "$WEB_ROOT/"

# Fix permissions
echo "Setting proper permissions..."
sudo chown -R www-data:www-data "$WEB_ROOT"
sudo chmod -R 755 "$WEB_ROOT"

# Restart backend service
echo "Restarting backend service..."
sudo systemctl restart heatingmonitoring-backend.service

# Reload nginx (usually not needed, but just in case)
sudo systemctl reload nginx

echo "Update complete!"
echo "Backend status:"
sudo systemctl status heatingmonitoring-backend.service --no-pager -l