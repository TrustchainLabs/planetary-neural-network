#!/bin/bash

# Raspberry Pi 4 DHT11 Sensor Installation Script
# This script installs and configures the DHT11 sensor on Raspberry Pi 4

set -e

echo "=== Raspberry Pi 4 DHT11 Sensor Installation ==="
echo "This script will install and configure the DHT11 sensor"
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

# Install CircuitPython DHT library
echo "Installing CircuitPython DHT library..."
sudo pip3 install adafruit-circuitpython-dht

# Install requests library for API communication
echo "Installing requests library..."
sudo pip3 install requests

# Create log directory
echo "Creating log directory..."
sudo mkdir -p /var/log
sudo touch /var/log/dht11_sensor.log
sudo chmod 666 /var/log/dht11_sensor.log

# Copy sensor script to /usr/local/bin
echo "Installing sensor script..."
sudo cp pi4_dht11_sensor.py /usr/local/bin/dht11_sensor.py
sudo chmod +x /usr/local/bin/dht11_sensor.py

# Create systemd service
echo "Creating systemd service..."
sudo tee /etc/systemd/system/dht11-sensor.service > /dev/null <<EOF
[Unit]
Description=DHT11 Temperature and Humidity Sensor
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /usr/local/bin/dht11_sensor.py
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
sudo systemctl enable dht11-sensor.service

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Hardware Setup:"
echo "1. Connect DHT11 sensor to GPIO4 (physical pin 7)"
echo "2. VCC to 3.3V"
echo "3. GND to GND"
echo "4. Data to GPIO4"
echo ""
echo "Configuration:"
echo "- Edit /usr/local/bin/dht11_sensor.py to change API URL and device ID"
echo "- Default API URL: http://localhost:3000"
echo "- Default Device ID: pi4-dht11-001"
echo ""
echo "Service Management:"
echo "- Start service: sudo systemctl start dht11-sensor"
echo "- Stop service: sudo systemctl stop dht11-sensor"
echo "- Check status: sudo systemctl status dht11-sensor"
echo "- View logs: sudo journalctl -u dht11-sensor -f"
echo ""
echo "Manual Testing:"
echo "- Test sensor: sudo python3 /usr/local/bin/dht11_sensor.py"
echo ""
echo "The service will start automatically on boot."
echo "To start it now, run: sudo systemctl start dht11-sensor" 