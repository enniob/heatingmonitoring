#!/bin/bash
# This script updates the Heating Monitoring application with the latest code from GitHub.

# --- Configuration ---
# Prompt user for PROJECT_PARENT_DIR if not already set or provided
if [ -z "$PROJECT_PARENT_DIR" ]; then
    read -p "Enter the parent directory for the application (e.g., /home/pi): " USER_PROJECT_PARENT_DIR
    if [ -z "$USER_PROJECT_PARENT_DIR" ]; then
        PROJECT_PARENT_DIR="/home/pi" # Default value
        echo "No parent directory entered, using default: $PROJECT_PARENT_DIR"
    else
        PROJECT_PARENT_DIR="$USER_PROJECT_PARENT_DIR"
    fi
fi
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
if [ ! -f ".env" ]; then # This check runs inside $PROJECT_DIR/backend
  echo "Creating .env file for backend..."

  # Prompt for Google Cloud credentials path
  read -p "Enter the path to your Google service account JSON key file (e.g., ../service-account-key.json): " GOOGLE_CRED_PATH
  
  # Use current .env (if it exists) or sample.env as base
  ENV_CONTENT=""
  if [ -f "sample.env" ]; then # sample.env is in the current directory (backend)
    ENV_CONTENT=$(cat "sample.env")
  fi

  # Replace GOOGLE_APPLICATION_CREDENTIALS line if path was provided
  if [ -n "$GOOGLE_CRED_PATH" ]; then
    ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s|^GOOGLE_APPLICATION_CREDENTIALS=.*|GOOGLE_APPLICATION_CREDENTIALS=$GOOGLE_CRED_PATH|")
  fi

  # Default PORT if not in sample.env or not set
  # Note: `grep -q` is for quiet mode, returns 0 if found, 1 if not
  if ! echo "$ENV_CONTENT" | grep -q "^PORT="; then
    ENV_CONTENT="${ENV_CONTENT}"$'\n'"PORT=4000"
  fi

  echo "$ENV_CONTENT" > ".env" # .env is created in the current directory (backend)
  echo ".env file created with your Google credentials path."
else
  echo ".env file already exists in backend/. Skipping .env creation."
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