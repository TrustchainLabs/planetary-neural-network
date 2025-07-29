#!/usr/bin/env python3
"""
Raspberry Pi 4 DHT11 Sensor Script
This script reads temperature and humidity data from a DHT11 sensor
connected to GPIO4 (physical pin 7) and sends it to the smart-app API.

Requirements:
- adafruit-circuitpython-dht
- requests
- board

Installation:
pip3 install adafruit-circuitpython-dht requests

Hardware Setup:
- Connect DHT11 sensor to GPIO4 (physical pin 7)
- VCC to 3.3V
- GND to GND
- Data to GPIO4
"""

import adafruit_dht
import board
import time
import requests
import json
import logging
from datetime import datetime
import sys
import os

# Configuration
API_BASE_URL = "http://localhost:3000"  # Change to your API URL
DEVICE_ID = "pi4-dht11-001"
GPIO_PIN = board.D4  # GPIO4
READING_INTERVAL = 2  # seconds
MAX_RETRIES = 3
API_TIMEOUT = 10  # seconds

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/dht11_sensor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class DHT11Sensor:
    def __init__(self, gpio_pin, device_id, api_url):
        self.gpio_pin = gpio_pin
        self.device_id = device_id
        self.api_url = api_url
        self.dht_device = None
        self.session = requests.Session()
        
    def initialize_sensor(self):
        """Initialize the DHT11 sensor"""
        try:
            self.dht_device = adafruit_dht.DHT11(self.gpio_pin)
            logger.info("DHT11 sensor initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize DHT11 sensor: {e}")
            return False
    
    def read_sensor_data(self):
        """Read temperature and humidity from the sensor"""
        if not self.dht_device:
            logger.error("Sensor not initialized")
            return None
            
        for attempt in range(MAX_RETRIES):
            try:
                temperature = self.dht_device.temperature
                humidity = self.dht_device.humidity
                
                # Validate readings
                if temperature is None or humidity is None:
                    logger.warning(f"Invalid readings (attempt {attempt + 1}/{MAX_RETRIES})")
                    time.sleep(1)
                    continue
                    
                if temperature < -100 or temperature > 100:
                    logger.warning(f"Temperature out of range: {temperature}°C")
                    continue
                    
                if humidity < 0 or humidity > 100:
                    logger.warning(f"Humidity out of range: {humidity}%")
                    continue
                
                logger.info(f"Temp: {temperature}°C, Humidity: {humidity}%")
                return {
                    'temperature': temperature,
                    'humidity': humidity,
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }
                
            except Exception as e:
                logger.error(f"Error reading sensor (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(1)
                    
        logger.error("Failed to read sensor data after all attempts")
        return None
    
    def send_to_api(self, sensor_data):
        """Send sensor data to the API"""
        if not sensor_data:
            return False
            
        payload = {
            'deviceId': self.device_id,
            'temperature': sensor_data['temperature'],
            'humidity': sensor_data['humidity'],
            'timestamp': sensor_data['timestamp'],
            'gpioPin': 4,
            'sensorType': 'DHT11',
            'location': {
                'latitude': -23.5505,  # São Paulo coordinates - change as needed
                'longitude': -46.6333
            }
        }
        
        try:
            response = self.session.post(
                f"{self.api_url}/dht11-sensor/readings",
                json=payload,
                timeout=API_TIMEOUT,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 201:
                logger.info("Data sent to API successfully")
                return True
            else:
                logger.error(f"API request failed: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send data to API: {e}")
            return False
    
    def run(self):
        """Main loop to continuously read and send sensor data"""
        logger.info("Starting DHT11 sensor monitoring...")
        
        if not self.initialize_sensor():
            logger.error("Failed to initialize sensor. Exiting.")
            return
        
        logger.info(f"Monitoring started. Sending data to: {self.api_url}")
        logger.info(f"Device ID: {self.device_id}")
        logger.info(f"Reading interval: {READING_INTERVAL} seconds")
        
        try:
            while True:
                sensor_data = self.read_sensor_data()
                
                if sensor_data:
                    success = self.send_to_api(sensor_data)
                    if not success:
                        logger.warning("Failed to send data to API, but continuing...")
                
                time.sleep(READING_INTERVAL)
                
        except KeyboardInterrupt:
            logger.info("Monitoring stopped by user")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
        finally:
            logger.info("DHT11 sensor monitoring stopped")

def main():
    """Main function"""
    # Check if running as root (required for GPIO access)
    if os.geteuid() != 0:
        logger.error("This script must be run as root (sudo) for GPIO access")
        sys.exit(1)
    
    # Create sensor instance
    sensor = DHT11Sensor(GPIO_PIN, DEVICE_ID, API_BASE_URL)
    
    # Start monitoring
    sensor.run()

if __name__ == "__main__":
    main() 