# EstateNet - Complete Setup Requirements

**Project:** EstateNet - Professional Property Management System  
**Stack:** React Native (Expo) + Node.js/Express + PostgreSQL + Prisma ORM  
**Last Updated:** March 17, 2026

---

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Required Software & Tools](#required-software--tools)
3. [Node.js Dependencies](#nodejs-dependencies)
4. [Database Setup](#database-setup)
5. [Environment Configuration](#environment-configuration)
6. [Installation Steps](#installation-steps)
7. [Running the Application](#running-the-application)
8. [Development Tools](#development-tools)
9. [Testing Requirements](#testing-requirements)
10. [Troubleshooting](#troubleshooting)

---

## 🖥️ System Requirements

### Minimum Requirements
- **OS:** Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 10GB free space
- **Processor:** Intel i5 or equivalent
- **Network:** Stable internet connection for package installation

### Mobile Testing Requirements
- **iOS:** macOS with Xcode 14+ (for iOS development)
- **Android:** Android Studio with SDK 33+ (for Android development)
- **Physical Device or Emulator:** For testing the mobile app

---

## 🛠️ Required Software & Tools

### 1. Node.js & npm
**Version:** Node.js 18.0.0 or higher  
**Download:** https://nodejs.org/

```bash
# Verify installation
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```

### 2. Git
**Version:** Latest stable  
**Download:** https://git-scm.com/

```bash
# Verify installation
git --version
```

### 3. PostgreSQL
**Version:** 14.0 or higher  
**Download:** https://www.postgresql.org/download/

**Installation Notes:**
- Install PostgreSQL server
- Remember your postgres user password
- Default port: 5432
- Create a database named `estatenet_db`

```bash
# Verify installation
psql --version

# Create database (after PostgreSQL is installed)
psql -U postgres
CREATE DATABASE estatenet_db;
\q
```

### 4. Expo CLI
**Version:** Latest  
**Installation:**

```bash
npm install -g expo-cli
```

### 5. Code Editor
**Recommended:** Visual Studio Code  
**Download:** https://code.visualstudio.com/

**Recommended VS Code Extensions:**
- ESLint
- Prettier
- Prisma
- React Native Tools
- TypeScript and JavaScript Language Features

### 6. Mobile Development Tools (Optional but Recommended)

#### For iOS Development (macOS only):
- **Xcode:** Version 14+ from Mac App Store
- **iOS Simulator:** Included with Xcode
- **CocoaPods:** `sudo gem install cocoapods`

#### For Android Development:
- **Android Studio:** https://developer.android.com/studio
- **Android SDK:** API Level 33 (Android 13) or higher
- **Android Emulator:** Set up via Android Studio AVD Manager

#### For Physical Device Testing:
- **Expo Go App:** Install from App Store (iOS) or Play Store (Android)

---

## 📦 Node.js Dependencies

### Frontend (React Native - Expo)

**Core Dependencies:**
```json
{
  "expo": "~54.0.32",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "react-dom": "19.1.0",
  "react-native-web": "^0.21.0"
}
```

**Navigation:**
```json
{
  "@react-navigation/native": "^7.1.27",
  "@react-navigation/native-stack": "^7.9.1",
  "@react-navigation/bottom-tabs": "^7.9.1",
  "react-native-screens": "~4.16.0",
  "react-native-safe-area-context": "~5.6.0"
}
```

**UI & Components:**
```json
{
  "@expo/vector-icons": "^15.0.3",
  "expo-linear-gradient": "~15.0.8",
  "expo-blur": "~15.0.8",
  "expo-status-bar": "~3.0.9"
}
```

**Utilities:**
```json
{
  "@react-native-async-storage/async-storage": "^2.2.0",
  "@react-native-community/datetimepicker": "8.4.4",
  "@react-native-picker/picker": "^2.11.4",
  "expo-file-system": "~19.0.21",
  "expo-image-picker": "~17.0.10",
  "expo-print": "~15.0.8",
  "expo-sharing": "~14.0.8",
  "react-native-webview": "^13.16.0"
}
```

**Development:**
```json
{
  "@expo/metro-runtime": "~6.1.2",
  "expo-dev-client": "^55.0.10",
  "@types/react": "~19.1.0",
  "typescript": "~5.9.2",
  "babel-plugin-module-resolver": "^5.0.2"
}
```

### Backend (Node.js + Express)

**Core Dependencies:**
```json
{
  "express": "^4.18.2",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "morgan": "^1.10.0"
}
```

**Database & ORM:**
```json
{
  "@prisma/client": "^5.6.0",
  "prisma": "^5.6.0"
}
```

**Authentication & Security:**
```json
{
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "express-rate-limit": "^7.1.5",
  "express-validator": "^7.3.1"
}
```

**Utilities:**
```json
{
  "node-cron": "^3.0.3",
  "nodemailer": "^6.9.7",
  "pdfkit": "^0.13.0",
  "puppeteer": "^24.37.3"
}
```

**Development & Testing:**
```json
{
  "@types/express": "^4.17.21",
  "@types/bcryptjs": "^2.4.6",
  "@types/cors": "^2.8.17",
  "@types/jsonwebtoken": "^9.0.5",
  "@types/morgan": "^1.9.9",
  "@types/node": "^20.8.10",
  "@types/node-cron": "^3.0.11",
  "@types/jest": "^29.5.5",
  "@types/supertest": "^2.0.12",
  "typescript": "^5.2.2",
  "ts-node": "^10.9.1",
  "nodemon": "^3.0.1",
  "jest": "^29.7.0",
  "ts-jest": "^29.1.1",
  "supertest": "^6.3.3"
}
```

---

## 🗄️ Database Setup

### PostgreSQL Configuration

1. **Install PostgreSQL** (version 14.0+)

2. **Create Database:**
```sql
CREATE DATABASE estatenet_db;
```

3. **Create User (Optional but Recommended):**
```sql
CREATE USER estatenet_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE estatenet_db TO estatenet_user;
```

4. **Verify Connection:**
```bash
psql -U postgres -d estatenet_db
```

### Prisma Setup

The project uses Prisma ORM for database management.

**Schema Location:** `backend/prisma/schema.prisma`

**Key Commands:**
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Run migrations (production)
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database with initial data
npm run db:seed

# Reset database (WARNING: Deletes all data)
npm run db:reset
```

---

## ⚙️ Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/estatenet_db"

# Server
PORT=3001
NODE_ENV=development

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:8081,exp://192.168.1.100:8081

# Email (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Cron Jobs
ENABLE_CRON_JOBS=true
```

### Frontend Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
API_BASE_URL=http://192.168.1.100:3001/api
# Replace 192.168.1.100 with your computer's local IP address

# Environment
NODE_ENV=development
```

**Important:** Replace `192.168.1.100` with your actual local IP address.

**To find your IP:**
- **Windows:** `ipconfig` (look for IPv4 Address)
- **macOS/Linux:** `ifconfig` or `ip addr`

---

## 📥 Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/ArcaneValue/EstateNet.git
cd EstateNet
```

### 2. Install Frontend Dependencies

```bash
# In the root directory
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Set Up Environment Files

```bash
# Create backend .env
cd backend
cp .env.example .env  # If example exists, otherwise create manually
# Edit .env with your database credentials and settings
cd ..

# Create frontend .env
cp .env.example .env  # If example exists, otherwise create manually
# Edit .env with your local IP address
```

### 5. Set Up Database

```bash
cd backend

# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with initial data
npm run db:seed

cd ..
```

### 6. Verify Installation

```bash
# Check backend
cd backend
npm run dev
# Should start on http://localhost:3001

# In a new terminal, check frontend
cd EstateNet
npm start
# Should open Expo Dev Tools
```

---

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```
Server runs on: `http://localhost:3001`

**Terminal 2 - Frontend (Expo):**
```bash
npm start
```
Expo Dev Tools opens in browser

**Terminal 3 - Mobile App:**
```bash
# For iOS Simulator (macOS only)
npm run ios

# For Android Emulator
npm run android

# For Web Browser
npm run web

# Or scan QR code with Expo Go app on physical device
```

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
# Build for production
expo build:android  # For Android
expo build:ios      # For iOS (requires macOS)
```

---

## 🛠️ Development Tools

### Recommended Global npm Packages

```bash
# Expo CLI
npm install -g expo-cli

# TypeScript (optional, for global TS support)
npm install -g typescript

# Nodemon (optional, for backend development)
npm install -g nodemon

# Prisma CLI (optional, for database management)
npm install -g prisma
```

### Database Management

**Prisma Studio** (Visual Database Editor):
```bash
cd backend
npm run db:studio
```
Opens at: `http://localhost:5555`

### API Testing

**Recommended Tools:**
- **Postman:** https://www.postman.com/
- **Insomnia:** https://insomnia.rest/
- **Thunder Client:** VS Code extension

**API Base URL:** `http://localhost:3001/api`

**Key Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/properties` - List properties
- `GET /api/payments` - List payments

---

## 🧪 Testing Requirements

### Backend Testing

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- paymentClaim.test.ts

# Run with coverage
npm test -- --coverage
```

### Test Dependencies (Already Included)
- **Jest:** Testing framework
- **Supertest:** HTTP assertion library
- **ts-jest:** TypeScript support for Jest

### E2E Testing

```bash
# Run E2E verification script
cd backend
.\e2e-verification-clean-run.ps1
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. "Cannot find module '@prisma/client'"
```bash
cd backend
npm run db:generate
```

#### 2. "Port 3001 already in use"
```bash
cd backend
npm run kill-server
# Or manually kill the process
```

#### 3. "Database connection failed"
- Verify PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Ensure database exists: `CREATE DATABASE estatenet_db;`

#### 4. "Expo app won't connect to backend"
- Verify backend is running on port 3001
- Check API_BASE_URL in root .env uses your local IP
- Ensure phone/emulator is on same network as computer
- Disable firewall temporarily to test

#### 5. "Module not found" errors
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install

# For backend
cd backend
rm -rf node_modules package-lock.json
npm install
```

#### 6. Metro bundler issues
```bash
# Clear Expo cache
npx expo start -c

# Or clear all caches
rm -rf .expo node_modules
npm install
```

#### 7. TypeScript errors
```bash
# Regenerate TypeScript types
npm run db:generate  # In backend
```

---

## 📱 Mobile Device Setup

### iOS (Physical Device)
1. Install **Expo Go** from App Store
2. Ensure iPhone is on same WiFi as computer
3. Scan QR code from Expo Dev Tools
4. App should load automatically

### Android (Physical Device)
1. Install **Expo Go** from Play Store
2. Ensure Android is on same WiFi as computer
3. Scan QR code from Expo Dev Tools
4. App should load automatically

### iOS Simulator (macOS only)
1. Install Xcode from Mac App Store
2. Open Xcode → Preferences → Components → Install iOS Simulator
3. Run: `npm run ios`

### Android Emulator
1. Install Android Studio
2. Open AVD Manager
3. Create virtual device (Pixel 5, API 33+)
4. Start emulator
5. Run: `npm run android`

---

## 📚 Additional Resources

### Documentation
- **React Native:** https://reactnative.dev/
- **Expo:** https://docs.expo.dev/
- **Prisma:** https://www.prisma.io/docs/
- **Express:** https://expressjs.com/
- **PostgreSQL:** https://www.postgresql.org/docs/

### Project Documentation
- `BRAND_REDESIGN_SUMMARY.md` - UI/UX design system
- `PREMIUM_BACKGROUND_REFINEMENT.md` - Color palette details
- `QUICK_START_BETA_TESTING.md` - Beta testing guide
- `E2E_VERIFICATION_FINAL_REPORT.md` - Test results

---

## 🔐 Security Notes

### Before Deployment

1. **Change JWT_SECRET** in backend/.env to a strong random string
2. **Update DATABASE_URL** with production credentials
3. **Set NODE_ENV=production**
4. **Enable HTTPS** for API endpoints
5. **Review CORS settings** in backend/src/index.ts
6. **Set up proper email credentials** for notifications
7. **Configure rate limiting** appropriately
8. **Never commit .env files** to version control

---

## 👥 Team Collaboration

### Git Workflow

```bash
# Pull latest changes
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Description of changes"

# Push to remote
git push origin feature/your-feature-name

# Create pull request on GitHub
```

### Code Standards
- Use TypeScript for type safety
- Follow existing code structure
- Write tests for new features
- Update documentation as needed
- Use meaningful commit messages

---

## ✅ Quick Start Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ installed and running
- [ ] Git installed
- [ ] Repository cloned
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Backend .env file created and configured
- [ ] Frontend .env file created with local IP
- [ ] Database created (`estatenet_db`)
- [ ] Prisma client generated (`npm run db:generate`)
- [ ] Database schema pushed (`npm run db:push`)
- [ ] Database seeded (`npm run db:seed`)
- [ ] Backend server running (`npm run dev`)
- [ ] Frontend Expo server running (`npm start`)
- [ ] Mobile app tested (simulator/device/Expo Go)

---

## 📞 Support

For issues or questions:
1. Check this REQUIREMENTS.md file
2. Review project documentation in `/docs`
3. Check existing GitHub issues
4. Create new issue with detailed description

---

**Last Updated:** March 17, 2026  
**Project Version:** 1.0.0  
**Maintainer:** EstateNet Team
