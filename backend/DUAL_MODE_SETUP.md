# Climate DAO Dual-Mode Backend Setup

The Climate DAO backend now supports two distinct operating modes:

## 🚀 Device Mode (Raspberry Pi)
**Purpose**: For IoT devices with climate sensors collecting and processing data

**Features**:
- 🌡️ Temperature sensor monitoring (DHT11/DHT22)
- 💚 Pi health monitoring and ML analysis
- 🔗 Blockchain integration for reward tokens
- 🤖 Local AI processing for data analysis
- 📡 Minimal API server (no frontend)

**Excluded**:
- Geo medallion operations
- User authentication (uses device private keys)
- Frontend serving
- Swagger documentation

**Usage**:
```bash
# Development mode
yarn start:device:dev

# Production mode (after build)
yarn build
yarn start:device

# Device activation CLI
yarn device:activate
```

## 🌍 Production Mode (Master Smart App)
**Purpose**: For infrastructure management and user interactions

**Features**:
- 🏆 Geo medallion purchasing and management
- 👥 User authentication and wallet connection
- 📱 Device registration and management
- 💰 Reward token distribution
- 🌐 Full web server with frontend
- 📚 Complete API documentation

**Excluded**:
- Physical sensor operations
- Pi health monitoring
- Direct device data collection

**Usage**:
```bash
# Development mode
yarn start:production:dev

# Production mode (after build)
yarn build
yarn start:production
```

## 🛠️ Configuration Setup

### 1. Create Blockchain Tokens
First, run the config command to create both NFT collection and reward tokens:

```bash
yarn commander config --force
```

This creates:
- **GeoMedallions (GEM)**: NFT collection for hexagonal areas
- **Climate Reward Token (CRT)**: Fungible token for device rewards

### 2. Device Activation

For Raspberry Pi devices, use the interactive device activation CLI:

```bash
yarn device:activate
```

This provides a menu to:
- 🚀 Activate device with database ID and private key
- 📋 List registered devices
- 📊 Check device status

### 3. Environment Variables

**Device Mode** (additional variables):
```env
DEVICE_PORT=3001
DEVICE_ID=your_device_database_id
DEVICE_PRIVATE_KEY=your_device_private_key
DEVICE_ACCOUNT_ID=0.0.123456
```

**Production Mode** (uses standard variables):
```env
PORT=3000
```

## 🔄 Background Processing

Both modes use Bull queues for background processing:

### Device Mode Queues:
- `pi-health-analysis`: Health monitoring and ML analysis
- `temperature-analysis`: Climate data processing and rewards

### Queue Jobs:
- **Pi Health**: Anomaly detection, failure prediction, health scoring
- **Temperature**: Trend analysis, pattern recognition, blockchain submission

## 📊 Data Flow

### Device Mode:
1. Sensors collect data → Local storage
2. AI processes data → Analysis results
3. Quality data → Blockchain submission
4. Rewards → Device account

### Production Mode:
1. Users purchase medallions → NFT minting
2. Users register devices → Database entry
3. Devices submit data → Reward distribution
4. Analytics → Dashboard display

## 🚨 Security Notes

- **Device Mode**: Uses device private keys for autonomous operation
- **Production Mode**: Full authentication with wallet integration
- Both modes support rate limiting and basic security headers
- Device mode excludes geo-medallion endpoints for security

## 📈 Monitoring

- Device health monitoring with ML predictions
- Temperature anomaly detection
- Blockchain transaction tracking
- Queue job monitoring
- Performance metrics

## 🔧 Development Tips

1. Use device mode for IoT development and testing
2. Use production mode for web app development
3. Both modes share core services and database
4. Queue consumers are automatically registered
5. CLI commands work in both modes