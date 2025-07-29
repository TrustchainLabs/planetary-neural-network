#!/bin/bash

# Raspberry Pi 4 Health Monitor Installation Script
# This script installs and configures the health monitoring system on Raspberry Pi 4

set -e

echo "=== Raspberry Pi 4 Health Monitor Installation ==="
echo "This script will install and configure the health monitoring system"
echo ""

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo; then
    echo "Warning: This script is designed for Raspberry Pi. Continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 1
    fi
fi

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Python dependencies
echo "Installing Python dependencies..."
sudo apt install -y python3-pip python3-venv python3-dev

# Install required Python packages
echo "Installing Python packages..."
sudo pip3 install psutil requests gpiozero

# Create log directory
echo "Creating log directory..."
sudo mkdir -p /var/log
sudo touch /var/log/pi4_health_monitor.log
sudo chmod 666 /var/log/pi4_health_monitor.log

# Copy health monitor script to /usr/local/bin
echo "Installing health monitor script..."
sudo cp pi4_health_monitor.py /usr/local/bin/pi4_health_monitor.py
sudo chmod +x /usr/local/bin/pi4_health_monitor.py

# Create systemd service
echo "Creating systemd service..."
sudo tee /etc/systemd/system/pi4-health-monitor.service > /dev/null <<EOF
[Unit]
Description=Raspberry Pi 4 Health Monitor
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /usr/local/bin/pi4_health_monitor.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
echo "Enabling and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable pi4-health-monitor.service

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Configuration:"
echo "- Edit /usr/local/bin/pi4_health_monitor.py to change API URL and device ID"
echo "- Default API URL: http://localhost:3000"
echo "- Default Device ID: pi4-device-001"
echo "- Default monitoring interval: 30 seconds"
echo ""
echo "Service Management:"
echo "- Start service: sudo systemctl start pi4-health-monitor"
echo "- Stop service: sudo systemctl stop pi4-health-monitor"
echo "- Check status: sudo systemctl status pi4-health-monitor"
echo "- View logs: sudo journalctl -u pi4-health-monitor -f"
echo ""
echo "Manual Testing:"
echo "- Test monitor: sudo python3 /usr/local/bin/pi4_health_monitor.py"
echo "- Test with custom interval: sudo python3 /usr/local/bin/pi4_health_monitor.py --interval 10"
echo ""
echo "Monitored Metrics:"
echo "- CPU temperature"
echo "- CPU usage percentage"
echo "- Memory usage percentage"
echo "- Disk usage percentage"
echo "- Network upload/download"
echo "- System load averages"
echo "- System uptime"
echo "- CPU voltage and frequency"
echo ""
echo "The service will start automatically on boot."
echo "To start it now, run: sudo systemctl start pi4-health-monitor" 