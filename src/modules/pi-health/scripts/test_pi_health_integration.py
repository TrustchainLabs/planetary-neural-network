#!/usr/bin/env python3
"""
Test Script for Pi Health Integration
This script simulates Raspberry Pi health data and sends it to the smart-app API
for testing purposes when no physical device is available.

Usage:
    python3 test_pi_health_integration.py [--api-url URL] [--device-id ID] [--interval SECONDS]
"""

import requests
import json
import time
import random
import argparse
import logging
import math
from datetime import datetime
import sys

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PiHealthSimulator:
    def __init__(self, api_url, device_id, interval):
        self.api_url = api_url
        self.device_id = device_id
        self.interval = interval
        self.session = requests.Session()
        
    def generate_realistic_health_data(self):
        """Generate realistic Raspberry Pi health data"""
        # Base values with realistic variations
        base_cpu_temp = 45  # Base CPU temperature
        base_cpu_usage = 30  # Base CPU usage
        base_memory_usage = 50  # Base memory usage
        base_disk_usage = 60  # Base disk usage
        
        # Add time-based variation (simulate workload patterns)
        hour = datetime.now().hour
        temp_variation = 10 * math.sin((hour - 6) * math.pi / 12)  # Day/night cycle
        usage_variation = 20 * math.sin((hour - 8) * math.pi / 12)  # Work hours pattern
        
        # Add random noise
        temp_noise = random.uniform(-2, 2)
        usage_noise = random.uniform(-5, 5)
        
        # Generate realistic values
        cpu_temperature = base_cpu_temp + temp_variation + temp_noise
        cpu_usage = base_cpu_usage + usage_variation + usage_noise
        memory_usage = base_memory_usage + (usage_variation * 0.8) + random.uniform(-3, 3)
        disk_usage = base_disk_usage + random.uniform(-2, 2)  # Slower change
        
        # Ensure values are within realistic ranges
        cpu_temperature = max(20, min(85, cpu_temperature))
        cpu_usage = max(5, min(95, cpu_usage))
        memory_usage = max(20, min(90, memory_usage))
        disk_usage = max(40, min(95, disk_usage))
        
        # Generate load averages
        load_1m = max(0.1, cpu_usage / 100 * 2 + random.uniform(-0.5, 0.5))
        load_5m = load_1m * 0.8 + random.uniform(-0.2, 0.2)
        load_15m = load_5m * 0.9 + random.uniform(-0.1, 0.1)
        
        # Generate network usage
        network_upload = random.uniform(0, 10)  # MB/s
        network_download = random.uniform(0, 20)  # MB/s
        
        # Generate uptime (increasing over time)
        uptime = time.time() + random.uniform(-3600, 3600)  # ±1 hour variation
        
        # Generate voltage and frequency
        voltage = 4.8 + random.uniform(-0.2, 0.2)  # 4.6-5.0V
        frequency = 1400 + random.uniform(-100, 100)  # 1300-1500 MHz
        
        return {
            'deviceId': self.device_id,
            'cpuTemperature': round(cpu_temperature, 2),
            'cpuUsage': round(cpu_usage, 2),
            'memoryUsage': round(memory_usage, 2),
            'diskUsage': round(disk_usage, 2),
            'networkUpload': round(network_upload, 2),
            'networkDownload': round(network_download, 2),
            'uptime': round(uptime, 2),
            'loadAverage1m': round(load_1m, 2),
            'loadAverage5m': round(load_5m, 2),
            'loadAverage15m': round(load_15m, 2),
            'voltage': round(voltage, 3),
            'frequency': round(frequency, 0),
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'location': {
                'latitude': -23.5505,
                'longitude': -46.6333
            }
        }
    
    def send_health_data(self, health_data):
        """Send simulated health data to API"""
        try:
            response = self.session.post(
                f"{self.api_url}/pi-health/readings",
                json=health_data,
                timeout=10,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 201:
                logger.info(f"✅ Health data sent successfully: CPU: {health_data['cpuTemperature']}°C, Usage: {health_data['cpuUsage']}%, Memory: {health_data['memoryUsage']}%")
                return True
            else:
                logger.error(f"❌ API request failed: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to send health data to API: {e}")
            return False
    
    def test_api_connection(self):
        """Test if the API is accessible"""
        try:
            response = self.session.get(f"{self.api_url}/pi-health/health", timeout=5)
            if response.status_code == 200:
                logger.info("✅ API connection successful")
                return True
            else:
                logger.error(f"❌ API health check failed: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Cannot connect to API: {e}")
            return False
    
    def get_device_status(self):
        """Get device health status from API"""
        try:
            response = self.session.get(
                f"{self.api_url}/pi-health/status/{self.device_id}",
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                logger.info(f"📊 Device status: {data.get('status')}, Health score: {data.get('healthScore')}")
                return data
            else:
                logger.warning(f"⚠️ Could not get device status: {response.status_code}")
                return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to get device status: {e}")
            return None
    
    def get_recommendations(self):
        """Get system recommendations from API"""
        try:
            response = self.session.get(
                f"{self.api_url}/pi-health/recommendations/{self.device_id}",
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('recommendations'):
                    logger.info("💡 System recommendations:")
                    for rec in data['recommendations']:
                        logger.info(f"   - {rec}")
                return data
            else:
                logger.warning(f"⚠️ Could not get recommendations: {response.status_code}")
                return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to get recommendations: {e}")
            return None
    
    def get_critical_alerts(self):
        """Get critical alerts from API"""
        try:
            response = self.session.get(
                f"{self.api_url}/pi-health/alerts/critical",
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                if data:
                    logger.warning(f"🚨 Found {len(data)} critical alerts")
                    for alert in data[:3]:  # Show first 3 alerts
                        logger.warning(f"   - {alert.get('alertMessage', 'No message')}")
                return data
            else:
                logger.warning(f"⚠️ Could not get critical alerts: {response.status_code}")
                return None
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to get critical alerts: {e}")
            return None
    
    def run(self):
        """Main simulation loop"""
        logger.info("🚀 Starting Pi health simulation...")
        logger.info(f"📡 API URL: {self.api_url}")
        logger.info(f"🆔 Device ID: {self.device_id}")
        logger.info(f"⏱️ Interval: {self.interval} seconds")
        
        # Test API connection first
        if not self.test_api_connection():
            logger.error("❌ Cannot connect to API. Exiting.")
            return
        
        # Get initial status and recommendations
        self.get_device_status()
        self.get_recommendations()
        
        try:
            while True:
                # Generate realistic health data
                health_data = self.generate_realistic_health_data()
                
                # Send data to API
                success = self.send_health_data(health_data)
                
                if success:
                    # Occasionally get status, recommendations, and alerts
                    if random.random() < 0.1:  # 10% chance
                        self.get_device_status()
                        self.get_recommendations()
                        self.get_critical_alerts()
                
                # Wait for next reading
                time.sleep(self.interval)
                
        except KeyboardInterrupt:
            logger.info("🛑 Health simulation stopped by user")
        except Exception as e:
            logger.error(f"❌ Unexpected error: {e}")

def main():
    parser = argparse.ArgumentParser(description='Pi Health Integration Test')
    parser.add_argument('--api-url', default='http://localhost:3000',
                       help='API base URL (default: http://localhost:3000)')
    parser.add_argument('--device-id', default='pi4-device-001',
                       help='Device ID (default: pi4-device-001)')
    parser.add_argument('--interval', type=int, default=30,
                       help='Simulation interval in seconds (default: 30)')
    
    args = parser.parse_args()
    
    # Create simulator and run
    simulator = PiHealthSimulator(args.api_url, args.device_id, args.interval)
    simulator.run()

if __name__ == "__main__":
    main() 