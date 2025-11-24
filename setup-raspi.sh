#!/bin/bash

# This script automates the setup of the Heating Monitoring application on a Raspberry Pi.

# --- Configuration ---
# Set the project directory. This is where the application will be cloned.
PROJECT_PARENT_DIR="/home/pi"
# Set the IP address of your Raspberry Pi.
RASPI_IP="your_raspberry_pi_ip"
# --- End of Configuration ---

# --- Do not edit below this line ---
PROJECT_DIR="$PROJECT_PARENT_DIR/heatingmonitoring"

# Update and install dependencies
echo "Updating and installing dependencies..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg nodejs nginx

# Install Node.js
# It is recommended to use the NodeSource repository to install a recent version of Node.js.
echo "Setting up Node.js repository..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update
sudo apt-get install -y nodejs

# Clone the repository
echo "Cloning the repository..."
if [ -d "$PROJECT_DIR" ]; then
    echo "Project directory already exists. Skipping clone."
else
    git clone https://github.com/enniob/heatingmonitoring.git "$PROJECT_DIR"
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
npm install

# Install frontend dependencies and build
echo "Installing frontend dependencies and building..."
cd "$PROJECT_DIR/frontend"
npm install
npm run build

# Create systemd service file
echo "Creating systemd service file..."
sudo bash -c "cat > /etc/systemd/system/heatingmonitoring-backend.service" <<EOF
[Unit]
Description=Heating Monitoring Backend Service
After=network.target

[Service]
User=pi
Group=pi
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=/usr/bin/node src/server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the backend service
echo "Enabling and starting the backend service..."
sudo systemctl daemon-reload
sudo systemctl enable heatingmonitoring-backend.service
sudo systemctl start heatingmonitoring-backend.service

# Create nginx configuration file
echo "Creating nginx configuration file..."
sudo bash -c "cat > /etc/nginx/sites-available/heatingmonitoring" <<EOF
server {
    listen 80;
    server_name $RASPI_IP;

    root $PROJECT_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ =404;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the new nginx configuration
echo "Enabling the new nginx configuration..."
if [ -L /etc/nginx/sites-enabled/heatingmonitoring ]; then
    echo "Nginx site already enabled. Skipping."
else
    sudo ln -s /etc/nginx/sites-available/heatingmonitoring /etc/nginx/sites-enabled/
fi

if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

sudo nginx -t
sudo systemctl restart nginx

echo "Setup complete!"
echo "You can now access the application at http://$RASPI_IP"
