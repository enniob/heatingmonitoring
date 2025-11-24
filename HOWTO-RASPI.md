# How to run Oiltank on a Raspberry Pi

This guide will walk you through setting up the Oiltank application on a Raspberry Pi. The backend will be configured to run as a service, and the frontend will be served by a web server.

## Prerequisites

*   A Raspberry Pi with Raspberry Pi OS (or any other Debian-based Linux distribution).
*   Node.js and npm installed.
*   Git installed.

## Installation

### 1. Install Node.js and npm

It is recommended to use the NodeSource repository to install a recent version of Node.js.

```bash
# Download and import the NodeSource GPG key
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

# Create deb repository
NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

# Run update and install
sudo apt-get update
sudo apt-get install nodejs -y
```

### 2. Clone the Repository

```bash
git clone https://github.com/your-username/oiltank.git
cd oiltank
```

### 3. Install Dependencies

**Backend:**

```bash
cd backend
npm install
cd ..
```

**Frontend:**

```bash
cd frontend
npm install
npm run build
cd ..
```

## Backend Service Setup (systemd)

We will use `systemd` to manage the backend service.

### 1. Create the Service File

Create a new service file for the backend:

```bash
sudo nano /etc/systemd/system/oiltank-backend.service
```

Add the following content to the file. **Remember to replace `/path/to/oiltank` with the actual path to the `oiltank` directory on your Raspberry Pi.**

```ini
[Unit]
Description=Oiltank Backend Service
After=network.target

[Service]
User=pi
Group=pi
WorkingDirectory=/path/to/oiltank/backend
ExecStart=/usr/bin/node src/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

### 2. Enable and Start the Service

Now, enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable oiltank-backend.service
sudo systemctl start oiltank-backend.service
```

You can check the status of the service with:

```bash
sudo systemctl status oiltank-backend.service
```

## Web Server Setup (nginx)

We will use `nginx` to serve the frontend and proxy API requests to the backend.

### 1. Install nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

### 2. Configure nginx

Create a new nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/oiltank
```

Add the following content to the file. **Remember to replace `/path/to/oiltank` with the actual path to the `oiltank` directory on your Raspberry Pi.**

```nginx
server {
    listen 80;
    server_name your_raspberry_pi_ip;

    root /path/to/oiltank/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Enable the new configuration

```bash
sudo ln -s /etc/nginx/sites-available/oiltank /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## Conclusion

You should now be able to access the Oiltank application by navigating to your Raspberry Pi's IP address in a web browser.
