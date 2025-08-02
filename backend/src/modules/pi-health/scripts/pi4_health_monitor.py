#!/usr/bin/env python3
"""
Raspberry Pi 4 Health Monitor
This script monitors system health metrics and sends them to the smart-app API.

Monitored metrics:
- CPU temperature
- CPU usage
- Memory usage
- Disk usage
- Network usage
- System load
- Uptime
- CPU voltage and frequency

Requirements:
- psutil
- requests
- gpiozero (for voltage monitoring)

Installation:
pip3 install psutil requests gpiozero
"""

import psutil
import requests
import time
import json
import logging
import argparse
import sys
import os
from datetime import datetime
import subprocess

# Configuration
API_BASE_URL = "http://localhost:3000"  # Change to your API URL
DEVICE_ID = "pi4-device-001"
MONITORING_INTERVAL = 30  # seconds
MAX_RETRIES = 3
API_TIMEOUT = 10  # seconds

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/pi4_health_monitor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class PiHealthMonitor:
    def __init__(self, api_url, device_id, interval):
        self.api_url = api_url
        self.device_id = device_id
        self.interval = interval
        self.session = requests.Session()
        
    def get_cpu_temperature(self):
        """Get CPU temperature in Celsius"""
        try:
            # Read from /sys/class/thermal/thermal_zone0/temp
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temp = int(f.read().strip()) / 1000.0
            return temp
        except Exception as e:
            logger.error(f"Error reading CPU temperature: {e}")
            return 0.0
    
    def get_cpu_usage(self):
        """Get CPU usage percentage"""
        try:
            return psutil.cpu_percent(interval=1)
        except Exception as e:
            logger.error(f"Error reading CPU usage: {e}")
            return 0.0
    
    def get_memory_usage(self):
        """Get memory usage percentage"""
        try:
            memory = psutil.virtual_memory()
            return memory.percent
        except Exception as e:
            logger.error(f"Error reading memory usage: {e}")
            return 0.0
    
    def get_disk_usage(self):
        """Get disk usage percentage"""
        try:
            disk = psutil.disk_usage('/')
            return disk.percent
        except Exception as e:
            logger.error(f"Error reading disk usage: {e}")
            return 0.0
    
    def get_network_usage(self):
        """Get network upload/download in MB/s"""
        try:
            net_io = psutil.net_io_counters()
            return {
                'upload': net_io.bytes_sent / 1024 / 1024,  # Convert to MB
                'download': net_io.bytes_recv / 1024 / 1024
            }
        except Exception as e:
            logger.error(f"Error reading network usage: {e}")
            return {'upload': 0.0, 'download': 0.0}
    
    def get_system_load(self):
        """Get system load averages"""
        try:
            load_avg = os.getloadavg()
            return {
                '1m': load_avg[0],
                '5m': load_avg[1],
                '15m': load_avg[2]
            }
        except Exception as e:
            logger.error(f"Error reading system load: {e}")
            return {'1m': 0.0, '5m': 0.0, '15m': 0.0}
    
    def get_uptime(self):
        """Get system uptime in seconds"""
        try:
            return time.time() - psutil.boot_time()
        except Exception as e:
            logger.error(f"Error reading uptime: {e}")
            return 0.0
    
    def get_cpu_voltage(self):
        """Get CPU voltage (if available)"""
        try:
            # Try to read from vcgencmd
            result = subprocess.run(['vcgencmd', 'measure_volts', 'core'], 
                                 capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                voltage_str = result.stdout.strip()
                voltage = float(voltage_str.split('=')[1].replace('V', ''))
                return voltage
        except Exception as e:
            logger.debug(f"Could not read CPU voltage: {e}")
        return None
    
    def get_cpu_frequency(self):
        """Get CPU frequency in MHz"""
        try:
            # Try to read from vcgencmd
            result = subprocess.run(['vcgencmd', 'measure_clock', 'arm'], 
                                 capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                freq_str = result.stdout.strip()
                freq = int(freq_str.split('=')[1]) / 1000000  # Convert to MHz
                return freq
        except Exception as e:
            logger.debug(f"Could not read CPU frequency: {e}")
        return None
    
    def collect_health_data(self):
        """Collect all health metrics"""
        try:
            # Get basic metrics
            cpu_temp = self.get_cpu_temperature()
            cpu_usage = self.get_cpu_usage()
            memory_usage = self.get_memory_usage()
            disk_usage = self.get_disk_usage()
            network_usage = self.get_network_usage()
            load_avg = self.get_system_load()
            uptime = self.get_uptime()
            voltage = self.get_cpu_voltage()
            frequency = self.get_cpu_frequency()
            
            health_data = {
                'deviceId': self.device_id,
                'cpuTemperature': round(cpu_temp, 2),
                'cpuUsage': round(cpu_usage, 2),
                'memoryUsage': round(memory_usage, 2),
                'diskUsage': round(disk_usage, 2),
                'networkUpload': round(network_usage['upload'], 2),
                'networkDownload': round(network_usage['download'], 2),
                'uptime': round(uptime, 2),
                'loadAverage1m': round(load_avg['1m'], 2),
                'loadAverage5m': round(load_avg['5m'], 2),
                'loadAverage15m': round(load_avg['15m'], 2),
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'location': {
                    'latitude': -23.5505,  # Change to your location
                    'longitude': -46.6333
                }
            }
            
            # Add optional metrics if available
            if voltage is not None:
                health_data['voltage'] = round(voltage, 3)
            if frequency is not None:
                health_data['frequency'] = round(frequency, 0)
            
            logger.info(f"Health data collected: CPU: {cpu_temp}°C, Usage: {cpu_usage}%, Memory: {memory_usage}%, Disk: {disk_usage}%")
            
            return health_data
            
        except Exception as e:
            logger.error(f"Error collecting health data: {e}")
            return None
    
    def send_health_data(self, health_data):
        """Send health data to API"""
        if not health_data:
            return False
            
        try:
            response = self.session.post(
                f"{self.api_url}/pi-health/readings",
                json=health_data,
                timeout=API_TIMEOUT,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 201:
                logger.info("Health data sent to API successfully")
                return True
            else:
                logger.error(f"API request failed: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send health data to API: {e}")
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
    
    def run(self):
        """Main monitoring loop"""
        logger.info("🚀 Starting Raspberry Pi 4 health monitoring...")
        logger.info(f"📡 API URL: {self.api_url}")
        logger.info(f"🆔 Device ID: {self.device_id}")
        logger.info(f"⏱️ Monitoring interval: {self.interval} seconds")
        
        # Test API connection first
        if not self.test_api_connection():
            logger.error("❌ Cannot connect to API. Exiting.")
            return
        
        # Get initial status and recommendations
        self.get_device_status()
        self.get_recommendations()
        
        try:
            while True:
                # Collect health data
                health_data = self.collect_health_data()
                
                if health_data:
                    # Send data to API
                    success = self.send_health_data(health_data)
                    
                    if success:
                        # Occasionally get status and recommendations
                        if time.time() % 300 < self.interval:  # Every 5 minutes
                            self.get_device_status()
                            self.get_recommendations()
                    else:
                        logger.warning("Failed to send health data to API, but continuing...")
                
                # Wait for next monitoring cycle
                time.sleep(self.interval)
                
        except KeyboardInterrupt:
            logger.info("🛑 Health monitoring stopped by user")
        except Exception as e:
            logger.error(f"❌ Unexpected error: {e}")
        finally:
            logger.info("Health monitoring stopped")

def main():
    parser = argparse.ArgumentParser(description='Raspberry Pi 4 Health Monitor')
    parser.add_argument('--api-url', default=API_BASE_URL,
                       help='API base URL (default: http://localhost:3000)')
    parser.add_argument('--device-id', default=DEVICE_ID,
                       help='Device ID (default: pi4-device-001)')
    parser.add_argument('--interval', type=int, default=MONITORING_INTERVAL,
                       help='Monitoring interval in seconds (default: 30)')
    
    args = parser.parse_args()
    
    # Check if running as root (recommended for system monitoring)
    if os.geteuid() != 0:
        logger.warning("⚠️ This script should be run as root for full system access")
    
    # Create monitor and run
    monitor = PiHealthMonitor(args.api_url, args.device_id, args.interval)
    monitor.run()

if __name__ == "__main__":
    main() 