#!/bin/bash
echo "Starting heatingmonitoring-backend service..."
sudo systemctl start heatingmonitoring-backend.service
echo "Service started."
sudo systemctl status heatingmonitoring-backend.service --no-pager
