# 📱 EstateNet Beta Testing Setup Guide

**Purpose:** Allow testers to use your app while backend/database run on your PC  
**No Expo Go Required:** Testers get a standalone app  
**Duration:** Setup takes ~30-45 minutes

---

## 🎯 Overview

You'll create a **tunnel** from the internet to your PC using **ngrok**, then build a **standalone app** that testers can install directly on their phones.

```
Internet → Ngrok Tunnel → Your PC Backend → Your PC Database
   ↑
Tester's Phone (Standalone App)
```

---

## 📋 Prerequisites

- ✅ Backend running on your PC (port 3001)
- ✅ PostgreSQL database running (Docker)
- ✅ Expo account (free)
- ✅ Your PC stays on during testing
- ✅ Stable internet connection

---

## 🚀 STEP 1: Install Ngrok (5 minutes)

### Option A: Download Installer (Easiest)
1. Go to https://ngrok.com/download
2. Sign up for free account
3. Download Windows version
4. Extract to `C:\ngrok\`
5. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken

### Option B: Install via npm
```bash
npm install -g ngrok
```

### Configure Ngrok
```bash
# Add your auth token (get from ngrok dashboard)
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

---

## 🚀 STEP 2: Start Ngrok Tunnel (2 minutes)

### Open PowerShell and run:
```powershell
# Navigate to your backend folder
cd "c:\Estate Net\EstateNet\backend"

# Start your backend (if not already running)
npm run dev

# Open a NEW PowerShell window and start ngrok
ngrok http 3001
```

### You'll see output like this:
```
Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:3001

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**IMPORTANT:** Copy the `https://abc123def456.ngrok-free.app` URL - this is your public backend URL!

⚠️ **Keep this PowerShell window open** - closing it stops the tunnel!

---

## 🚀 STEP 3: Update Backend CORS (5 minutes)

Your backend needs to accept requests from the ngrok domain.

### Edit `backend/src/index.ts`:

Find the CORS configuration (around line 20-30) and update it:

```typescript
// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:19006',
    'exp://192.168.1.100:8081', // Your local IP
    'https://*.ngrok-free.app', // ← ADD THIS for ngrok
    'https://*.ngrok.io',       // ← ADD THIS for ngrok (alternative domain)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Restart your backend** after making this change.

---

## 🚀 STEP 4: Create API Configuration File (5 minutes)

This allows you to easily switch between development and beta testing modes.

### Create `src/config/api.ts`:

```typescript
// API Configuration for different environments

const ENV = {
  // Development (your PC, Expo Go)
  dev: {
    apiUrl: 'http://localhost:3001',
  },
  
  // Beta Testing (ngrok tunnel)
  beta: {
    apiUrl: 'https://YOUR-NGROK-URL.ngrok-free.app', // ← REPLACE with your ngrok URL
  },
  
  // Production (when deployed to cloud)
  prod: {
    apiUrl: 'https://estatenet-backend.up.railway.app',
  },
};

// ⚠️ CHANGE THIS to switch environments
const CURRENT_ENV: 'dev' | 'beta' | 'prod' = 'beta'; // ← Set to 'beta' for testing

export const API_BASE_URL = ENV[CURRENT_ENV].apiUrl;

export default {
  API_BASE_URL,
  CURRENT_ENV,
};
```

**IMPORTANT:** Replace `YOUR-NGROK-URL.ngrok-free.app` with your actual ngrok URL from Step 2!

---

## 🚀 STEP 5: Update API Calls (10 minutes)

Find all places where you make API calls and update them to use the config.

### Example: Update `src/services/api.ts` (or wherever you define your API base):

**BEFORE:**
```typescript
const API_BASE_URL = 'http://localhost:3001';
```

**AFTER:**
```typescript
import { API_BASE_URL } from '../config/api';
// Now API_BASE_URL automatically uses the correct environment
```

### Common files to update:
- `src/services/api.ts`
- `src/services/authService.ts`
- `src/contexts/AuthContext.tsx`
- Any file with `axios.create()` or `fetch()` calls

**Search for:** `localhost:3001` in your codebase and replace with the config import.

---

## 🚀 STEP 6: Build Standalone App with Expo EAS (15 minutes)

### Install EAS CLI:
```bash
npm install -g eas-cli
```

### Login to Expo:
```bash
eas login
```

### Configure EAS:
```bash
cd "c:\Estate Net\EstateNet"
eas build:configure
```

This creates `eas.json`. Update it:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

### Build for Android (APK for easy sharing):
```bash
eas build --platform android --profile preview
```

### Build for iOS (requires Apple Developer account - $99/year):
```bash
eas build --platform ios --profile preview
```

**Wait time:** 10-20 minutes for build to complete

**Result:** You'll get a download link like:
```
https://expo.dev/artifacts/eas/abc123.apk
```

---

## 🚀 STEP 7: Share with Testers (5 minutes)

### Send testers this information:

```
📱 EstateNet Beta Testing

1. Download the app:
   Android: https://expo.dev/artifacts/eas/YOUR-BUILD-ID.apk
   iOS: https://expo.dev/artifacts/eas/YOUR-BUILD-ID.ipa

2. Install instructions:
   Android: 
   - Download APK
   - Enable "Install from Unknown Sources" in Settings
   - Open APK file to install
   
   iOS:
   - Download IPA
   - Install via TestFlight or direct install (requires UDID registration)

3. Test accounts:
   Owner: george@gmail.com / Ak47grave
   Manager: daniel@gmail.com / Ak47grave
   Tenant: kazoora@gmail.com / Ak47grave

4. Important: 
   - Testing window: [Your available hours]
   - My PC must be on and connected to internet
   - Report bugs to: [Your contact]
```

---

## 🎯 Testing Checklist for Testers

Send this to your beta testers:

### Owner Flow:
- [ ] Login as owner
- [ ] Create property
- [ ] Invite manager
- [ ] View properties
- [ ] View financial dashboard

### Manager Flow:
- [ ] Login as manager
- [ ] Accept owner invitation
- [ ] Create property
- [ ] Create lease
- [ ] Verify payment claims
- [ ] View financial reports

### Tenant Flow:
- [ ] Login as tenant
- [ ] View lease details
- [ ] Submit payment claim
- [ ] View payment history
- [ ] Check notifications

---

## 🛠️ Troubleshooting

### Problem: Testers can't connect to backend
**Solution:**
1. Check ngrok is still running (PowerShell window open)
2. Check backend is running (`npm run dev`)
3. Verify ngrok URL in `src/config/api.ts` is correct
4. Check your PC firewall isn't blocking connections

### Problem: Ngrok URL changes every time
**Solution:**
- Free ngrok gives you a new URL each restart
- Upgrade to ngrok paid ($8/month) for static domain
- OR rebuild app each time with new URL

### Problem: App shows "Network Error"
**Solution:**
1. Check CORS settings in backend
2. Verify API_BASE_URL in app config
3. Test ngrok URL in browser: `https://your-ngrok-url.ngrok-free.app/health`

### Problem: Database connection fails
**Solution:**
1. Check Docker container is running: `docker ps`
2. Restart PostgreSQL: `docker restart estatenet-postgres`
3. Check backend .env has correct DATABASE_URL

### Problem: Build fails
**Solution:**
1. Clear Expo cache: `expo start -c`
2. Delete node_modules and reinstall: `rm -rf node_modules && npm install`
3. Check eas.json configuration
4. Check Expo account has build credits

---

## 📊 Monitoring During Testing

### Check Ngrok Traffic:
Open http://127.0.0.1:4040 in your browser to see:
- All API requests
- Response times
- Errors

### Check Backend Logs:
Watch your backend terminal for:
- API calls
- Database queries
- Errors

### Check Database:
```bash
# Connect to PostgreSQL
docker exec -it estatenet-postgres psql -U postgres -d estatenet

# View recent claims
SELECT id, "billingPeriod", status, "createdAt" FROM payment_claims ORDER BY "createdAt" DESC LIMIT 10;

# View users
SELECT id, email, role FROM users;
```

---

## 🔒 Security Notes

### ⚠️ Important:
1. **Ngrok exposes your PC to internet** - only run during testing
2. **Use test data only** - don't use real user information
3. **Limit testing window** - schedule specific testing hours
4. **Monitor ngrok dashboard** - watch for suspicious activity
5. **Stop ngrok when done** - close PowerShell window

### After Testing:
```bash
# Stop ngrok (Ctrl+C in PowerShell)
# Stop backend (Ctrl+C)
# Stop Docker (optional)
docker stop estatenet-postgres
```

---

## 💡 Tips for Smooth Testing

1. **Schedule testing sessions** - Let testers know when you'll be online
2. **Use test accounts** - Don't let testers create real accounts during beta
3. **Collect feedback** - Use Google Forms or Typeform for structured feedback
4. **Screen record** - Ask testers to record bugs
5. **Version your builds** - Name builds like `estatenet-beta-v1.0.0.apk`

---

## 📱 Alternative: Quick Testing with Expo Go (No Build Required)

If you just want quick testing without building:

1. Start ngrok tunnel (same as above)
2. Update `src/config/api.ts` with ngrok URL
3. Start Expo: `expo start`
4. Share QR code with testers
5. Testers scan QR with Expo Go app

**Pros:** No build time, instant updates  
**Cons:** Requires Expo Go app, less "real app" feel

---

## 🎯 Next Steps After Beta Testing

1. **Collect feedback** - Fix bugs and improve UX
2. **Deploy to cloud** - Move to Railway/Supabase for 24/7 availability
3. **Submit to stores** - Google Play & Apple App Store
4. **Launch!** 🚀

---

## 📞 Need Help?

Common issues and solutions are in the Troubleshooting section above.

For Expo build issues: https://docs.expo.dev/build/introduction/  
For ngrok issues: https://ngrok.com/docs

---

**Good luck with your beta testing!** 🎉
