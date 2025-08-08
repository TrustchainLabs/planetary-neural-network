# 🚀 Production Server Setup

This project includes a custom Node.js production server for serving your Ionic/Angular application.

## 📁 Build Output

- **Build Directory**: `www/` (configured in `angular.json`)
- **Production Build**: Optimized, minified, and ready for deployment

## 🛠️ Available Commands

### Development
```bash
npm start                    # Development server (with hot reload)
npm run watch               # Build and watch for changes
```

### Production
```bash
npm run build:prod          # Build for production only
npm run serve:prod          # Serve production build only
npm run start:prod          # Build + Serve production (recommended)
```

## 🌐 Production Server Features

- ✅ **SPA Routing Support** - Handles Angular routes properly
- ✅ **Security Headers** - HSTS, XSS protection, etc.
- ✅ **Static Asset Caching** - 1-year cache for JS/CSS/images
- ✅ **MIME Type Handling** - Proper content types
- ✅ **Logging** - Request logging with timestamps
- ✅ **Graceful Shutdown** - Handles Ctrl+C properly
- ✅ **Network Access** - Accessible from other devices (0.0.0.0)

## 🚀 Quick Start

1. **Build and run production server:**
   ```bash
   npm run start:prod
   ```

2. **Access your app:**
   - Local: http://localhost:4200
   - Network: http://[your-ip]:4200

## 🔧 Environment Variables

You can customize the server using environment variables:

```bash
PORT=8080 HOST=localhost npm run serve:prod
```

- `PORT` - Server port (default: 4200)
- `HOST` - Server host (default: 0.0.0.0)

## 📱 Mobile App (Capacitor)

For mobile deployment:

```bash
# iOS
npx cap add ios
npx cap copy ios
npx cap open ios

# Android
npx cap add android
npx cap copy android
npx cap open android
```

## 🔄 Continuous Deployment

For production deployment, the build artifacts in the `www/` folder can be:

- Served by any web server (Nginx, Apache, etc.)
- Deployed to CDNs (Netlify, Vercel, AWS S3, etc.)
- Used with the included Node.js server

## 📊 Build Analysis

After running `npm run build:prod`, check:
- Bundle sizes in the terminal output
- Generated files in the `www/` directory
- Performance warnings and suggestions
