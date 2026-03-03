# EstateNet Build Guide

## Prerequisites

1. **Node.js** (v18 or higher) installed
2. **npm** or **yarn** package manager
3. **Expo Account** (for APK builds)
4. **Android Studio** (for local Android builds)
5. **Xcode** (for iOS builds on Mac)

## Web Build (Laptop/Desktop)

### Quick Start:
```bash
# Run the build script
build-web.bat

# Or manually:
npm install
npm run web
```

The web app will be available at: http://localhost:8081

## Android APK Build

### Option 1: EAS Build (Recommended)
```bash
# Run the build script
build-apk.bat

# Or manually:
npm install
npx eas build --platform android
```

### First-time setup for EAS Build:
1. Configure EAS Build:
   ```bash
   npx eas build:configure
   ```

2. Login to Expo:
   ```bash
   npx expo login
   ```

3. Configure app.json if needed (already configured)

### Option 2: Local Build (Advanced)
```bash
# Setup local build environment
npx expo install:fix
npx expo run:android
```

## iOS Build (Mac Only)

```bash
npx eas build --platform ios
```

## Configuration Updates Applied

### 1. API Configuration
- **Web/Laptop**: Uses `localhost:3001` (set `FORCE_LOCALHOST = true`)
- **Physical Device**: Uses `192.168.0.103:3001` (set `FORCE_LOCALHOST = false`)

### 2. Firewall Rule
Ensure Windows Firewall allows connections on port 3001:
```powershell
netsh advfirewall firewall add rule name="Node.js Server Port 3001" dir=in action=allow protocol=TCP localport=3001
```

### 3. Backend Requirements
- Docker Desktop must be running
- PostgreSQL container must be active:
  ```bash
  cd backend
  docker compose up -d
  npm run dev
  ```

## Testing Before Build

1. **Start Backend**:
   ```bash
   cd backend
   docker compose up -d
   npm run dev
   ```

2. **Test Web Version**:
   ```bash
   npm start
   # Open http://localhost:8081
   # Test login, billing, and all features
   ```

3. **Test on Physical Device**:
   - Install Expo Go app on your phone
   - Ensure phone and PC are on same WiFi
   - Run: `npx expo start`
   - Scan QR code with Expo Go

## Build Files Created

- `build-web.bat` - Quick web build script
- `build-apk.bat` - Android APK build script
- `BUILD_GUIDE.md` - This documentation

## Troubleshooting

### Backend Connection Issues
- Verify Docker is running
- Check if PostgreSQL container is up: `docker ps`
- Ensure firewall rule is added for port 3001

### Build Errors
- Clear Expo cache: `npx expo start -c`
- Clear node_modules: `rm -rf node_modules && npm install`
- Update dependencies: `npm update`

### APK Build Issues
- Ensure EAS is configured: `npx eas build:configure`
- Check Expo login: `npx expo whoami`
- Verify app.json configuration

## Recent Fixes Applied

1. ✅ Database connection retry mechanism
2. ✅ JWT token date serialization fix
3. ✅ API configuration for both localhost and LAN
4. ✅ Terms acceptance navigation fix
5. ✅ Firewall rule for external connections
6. ✅ TypeScript compilation errors resolved

## Support

For issues:
1. Check the console logs for errors
2. Verify backend is running and accessible
3. Ensure all prerequisites are installed
4. Review the troubleshooting section above
