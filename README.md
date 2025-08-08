# Planetary Neural Network

> **Ecosphere Hyper-local Climate Intelligence Oracle** - A comprehensive IoT device management and geo-location DApp built with NestJS backend and Ionic/Angular frontend, integrated with Hedera Hashgraph blockchain technology.

## 🌟 Overview

The Planetary Neural Network is a sophisticated distributed application that combines IoT device management, real-time climate data monitoring, and blockchain-based geo-medallion creation. The system consists of a powerful NestJS backend API and an intuitive Ionic/Angular frontend with native mobile support.

## 🏗️ Architecture

```
planetary-neural-network/
├── backend/          # NestJS API Server
├── frontend/         # Ionic/Angular Client
└── README.md         # This file
```

### Key Features

- **🌐 IoT Device Management**: Real-time monitoring and control of environmental sensors
- **🗺️ Geo-Medallion System**: Blockchain-based location verification and rewards
- **📱 Cross-Platform**: Web application with mobile support via Capacitor
- **⚡ Real-time Data**: WebSocket connections for live sensor data
- **🔐 Blockchain Integration**: Hedera Hashgraph for secure transactions
- **🎯 Interactive Maps**: MapBox integration for geo-visualization
- **💰 Wallet Integration**: WalletConnect protocol support

---

## 🎯 Backend (NestJS API)

### Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis for session management and caching
- **Authentication**: Passport.js with JWT tokens
- **Real-time**: Socket.IO for WebSocket connections
- **Blockchain**: Hedera Hashgraph SDK
- **Documentation**: Swagger/OpenAPI
- **Task Queue**: Bull with Redis
- **Validation**: Class-validator and Class-transformer

### Key Dependencies

- `@nestjs/core` - Core NestJS framework
- `@nestjs/mongoose` - MongoDB integration
- `@hsuite/*` - Custom Hedera suite packages
- `socket.io` - Real-time bidirectional communication
- `bull` - Job queue processing
- `@tensorflow/tfjs` - Machine learning capabilities

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
# or
yarn install

# Environment setup
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod
```

### Available Scripts

- `npm run start:dev` - Development server with hot reload
- `npm run start:prod` - Production server
- `npm run start:device` - Device-specific server instance
- `npm run build` - Build the application
- `npm run test` - Run unit tests
- `npm run docs` - Generate API documentation

### API Endpoints

The backend provides RESTful APIs for:
- Device management (`/devices`)
- Geo-medallion operations (`/geo-medallions`) 
- User authentication (`/auth`)
- Real-time data streaming (WebSocket)

---

## 🎨 Frontend (Ionic/Angular)

### Tech Stack

- **Framework**: Ionic 8 + Angular 19
- **Mobile**: Capacitor for native app compilation
- **Maps**: MapBox GL for interactive mapping
- **Charts**: Chart.js for data visualization
- **3D Graphics**: Three.js for 3D visualizations
- **Blockchain**: Hedera SDK + WalletConnect
- **Styling**: SCSS with Ionic design system

### Key Dependencies

- `@ionic/angular` - Ionic framework for Angular
- `@angular/core` - Angular core framework
- `@capacitor/core` - Native mobile capabilities
- `@hashgraph/sdk` - Hedera Hashgraph integration
- `@walletconnect/sign-client` - Wallet connectivity
- `mapbox-gl` - Interactive maps
- `three` - 3D graphics and visualizations
- `socket.io-client` - Real-time data connection

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# or
yarn install

# Start development server
npm run start

# Build for production
npm run build:prod

# Start production server
npm run start:prod

# Build mobile app (requires Capacitor setup)
npx cap build ios
npx cap build android
```

### Available Scripts

- `npm run start` - Development server (http://localhost:8100)
- `npm run build:prod` - Production build
- `npm run serve:prod` - Serve production build
- `npm run start:prod` - Build and serve production
- `npm run test` - Run unit tests
- `npm run lint` - Code linting

### Production Server

The frontend includes a custom Node.js production server (`server.js`) with:
- SPA routing support for Angular routes
- Security headers (CSRF protection, XSS protection)
- Static file serving with caching
- MIME type handling
- Request logging

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- MongoDB database
- Redis server
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone git@github.com:TrustchainLabs/planetary-neural-network.git
   cd planetary-neural-network
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure your .env file
   npm run start:dev
   ```

3. **Frontend Setup** (new terminal)
   ```bash
   cd frontend
   npm install
   npm run start
   ```

4. **Access the application**
   - Backend API: http://localhost:3000
   - Frontend App: http://localhost:8100
   - API Documentation: http://localhost:3000/api

### Production Deployment

#### Backend Production
```bash
cd backend
npm run build
npm run start:prod
```

#### Frontend Production
```bash
cd frontend
npm run build:prod
npm run serve:prod
# Or using PM2
pm2 start ecosystem.config.js
```

---

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
MONGODB_URI=mongodb://localhost:27017/planetary-network
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Hedera
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=your-private-key

# Email (optional)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email
MAIL_PASS=your-password
```

#### Frontend (environment.ts)
```typescript
export const environment = {
  production: false,
  smartAppUrl: 'http://localhost:3000',
  ledger: 'testnet'
};
```

---

## 📱 Mobile App Development

### iOS Setup
```bash
cd frontend
npx cap add ios
npx cap sync ios
npx cap open ios
```

### Android Setup
```bash
cd frontend
npx cap add android
npx cap sync android
npx cap open android
```

---

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm run test          # Unit tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
npm run test:e2e      # End-to-end tests
```

### Frontend Testing
```bash
cd frontend
npm run test          # Unit tests with Karma/Jasmine
npm run lint          # ESLint checks
```

---

## 📊 Monitoring & Logging

- **Backend Logs**: Structured logging with NestJS Logger
- **Frontend Logs**: Console logging in development
- **Production**: PM2 process management with log rotation
- **Health Checks**: Built-in health check endpoints

---

## 🔐 Security

### Backend Security Features
- CSRF protection with `csurf`
- Helmet.js for security headers
- Rate limiting with NestJS Throttler
- JWT authentication
- Input validation and sanitization
- Session management with Redis

### Frontend Security
- Content Security Policy headers
- XSS protection
- Secure cookie handling
- Environment-based API endpoints

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages

---

## 📄 License

This project is licensed under the UNLICENSED License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**TrustchainLabs** - [GitHub Organization](https://github.com/TrustchainLabs)

---

## 🆘 Support

For support, email your-support-email or join our community Discord.

---

## 🗺️ Roadmap

- [ ] Enhanced ML-based climate prediction
- [ ] Multi-chain blockchain support
- [ ] Advanced 3D visualizations
- [ ] IoT device marketplace
- [ ] Mobile app store deployment

---

*Built with ❤️ by TrustchainLabs*
