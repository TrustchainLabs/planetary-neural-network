#!/usr/bin/env python3
"""
Test Script for DHT11 Sensor Integration
This script simulates DHT11 sensor data and sends it to the smart-app API
for testing purposes when no physical sensor is available.

Usage:
    python3 test_dht11_integration.py [--api-url URL] [--device-id ID] [--interval SECONDS]
"""

import requests
import json
import time
import random
import argparse
import logging
from datetime import datetime
import sys

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DHT11Simulator:
    def __init__(self, api_url, device_id, interval):
        self.api_url = api_url
        self.device_id = device_id
        self.interval = interval
        self.session = requests.Session()
        
    def generate_realistic_data(self):
        """Generate realistic temperature and humidity data"""
        # Base values with realistic variations
        base_temp = 22  # Room temperature
        base_humidity = 45  # Room humidity
        
        # Add time-based variation (simulate day/night cycle)
        hour = datetime.now().hour
        temp_variation = 3 * math.sin((hour - 6) * math.pi / 12)  # Day/night cycle
        humidity_variation = -10 * math.sin((hour - 6) * math.pi / 12)  # Inverse to temp
        
        # Add random noise
        temp_noise = random.uniform(-0.5, 0.5)
        humidity_noise = random.uniform(-1, 1)
        
        temperature = base_temp + temp_variation + temp_noise
        humidity = base_humidity + humidity_variation + humidity_noise
        
        # Ensure values are within realistic ranges
        temperature = max(-10, min(50, temperature))
        humidity = max(20, min(80, humidity))
        
        return round(temperature, 1), round(humidity, 1)
    
    def send_data(self, temperature, humidity):
        """Send simulated sensor data to API"""
        payload = {
            'deviceId': self.device_id,
            'temperature': temperature,
            'humidity': humidity,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'gpioPin': 4,
            'sensorType': 'DHT11',
            'location': {
                'latitude': -23.5505,
                'longitude': -46.6333
            }
        }
        
        try:
            response = self.session.post(
                f"{self.api_url}/dht11-sensor/readings",
                json=payload,
                timeout=10,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 201:
                logger.info(f"✅ Data sent successfully: Temp: {temperature}°C, Humidity: {humidity}%")
                return True
            else:
                logger.error(f"❌ API request failed: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to send data to API: {e}")
            return False
    
    def test_api_connection(self):
        """Test if the API is accessible"""
        try:
            response = self.session.get(f"{self.api_url}/dht11-sensor/health", timeout=5)
            if response.status_code == 200:
                logger.info("✅ API connection successful")
                return True
            else:
                logger.error(f"❌ API health check failed: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Cannot connect to API: {e}")
            return False
    
    def get_latest_reading(self):
        """Get the latest reading from API"""
        try:
            response = self.session.get(
                f"{self.api_url}/dht11-sensor/readings/latest/{self.device_id}",
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                logger.info(f"📊 Latest reading: Temp: {data.get('temperature')}°C, Humidity: {data.get('humidity')}%")
                return data
            else:
                logger.warning(f"⚠️ Could not get latest reading: {response.status_code}")
                return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to get latest reading: {e}")
            return None
    
    def get_stats(self):
        """Get statistics from API"""
        try:
            response = self.session.get(
                f"{self.api_url}/dht11-sensor/stats/{self.device_id}?hours=1",
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                logger.info(f"📈 Stats: {data.get('count', 0)} readings in last hour")
                return data
            else:
                logger.warning(f"⚠️ Could not get stats: {response.status_code}")
                return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to get stats: {e}")
            return None
    
    def run(self):
        """Main simulation loop"""
        logger.info("🚀 Starting DHT11 sensor simulation...")
        logger.info(f"📡 API URL: {self.api_url}")
        logger.info(f"🆔 Device ID: {self.device_id}")
        logger.info(f"⏱️ Interval: {self.interval} seconds")
        
        # Test API connection first
        if not self.test_api_connection():
            logger.error("❌ Cannot connect to API. Exiting.")
            return
        
        # Get initial stats
        self.get_stats()
        
        try:
            while True:
                # Generate realistic data
                temperature, humidity = self.generate_realistic_data()
                
                # Send data to API
                success = self.send_data(temperature, humidity)
                
                if success:
                    # Occasionally get latest reading and stats
                    if random.random() < 0.1:  # 10% chance
                        self.get_latest_reading()
                        self.get_stats()
                
                # Wait for next reading
                time.sleep(self.interval)
                
        except KeyboardInterrupt:
            logger.info("🛑 Simulation stopped by user")
        except Exception as e:
            logger.error(f"❌ Unexpected error: {e}")

def main():
    parser = argparse.ArgumentParser(description='DHT11 Sensor Integration Test')
    parser.add_argument('--api-url', default='http://localhost:3000',
                       help='API base URL (default: http://localhost:3000)')
    parser.add_argument('--device-id', default='pi4-dht11-001',
                       help='Device ID (default: pi4-dht11-001)')
    parser.add_argument('--interval', type=int, default=2,
                       help='Reading interval in seconds (default: 2)')
    
    args = parser.parse_args()
    
    # Import math for realistic data generation
    import math
    
    # Create simulator and run
    simulator = DHT11Simulator(args.api_url, args.device_id, args.interval)
    simulator.run()

if __name__ == "__main__":
    main() 