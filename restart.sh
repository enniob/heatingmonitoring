#!/bin/bash
echo "Restarting heatingmonitoring-backend service..."
sudo systemctl restart heatingmonitoring-backend.service
echo "Service restarted."
sudo systemctl status heatingmonitoring-backend.service --no-pager
