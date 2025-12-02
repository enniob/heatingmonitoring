#!/bin/bash
echo "Stopping heatingmonitoring-backend service..."
sudo systemctl stop heatingmonitoring-backend.service
echo "Service stopped."
sudo systemctl status heatingmonitoring-backend.service --no-pager
