# 🚀 Quick Start: Beta Testing Setup

**Goal:** Let testers use your app while backend runs on your PC  
**Time:** 30 minutes  
**No Expo Go needed:** Testers get a real app

---

## ⚡ Super Quick Setup (3 Steps)

### 1️⃣ Install ngrok (5 min)
```bash
# Download and install
https://ngrok.com/download

# Sign up (free) and get auth token
https://dashboard.ngrok.com/get-started/your-authtoken

# Configure
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### 2️⃣ Start Everything (2 min)
```powershell
# Run this script (it does everything for you!)
.\start-beta-testing.ps1
```

**What it does:**
- ✅ Starts PostgreSQL database
- ✅ Starts backend server
- ✅ Starts ngrok tunnel
- ✅ Shows you the public URL

### 3️⃣ Update Config (3 min)
Open `src/config/api.ts` and change:

```typescript
// Line 26: Change environment
const CURRENT_ENV: Environment = 'beta'; // ← Change from 'dev' to 'beta'

// Line 30: Paste your ngrok URL
const NGROK_URL = 'https://abc123.ngrok-free.app'; // ← Paste URL from ngrok
```

**Done!** Your app now connects to your PC via the internet.

---

## 📱 Build App for Testers (15 min)

### Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Build Android APK
```bash
cd "c:\Estate Net\EstateNet"
eas build --platform android --profile preview
```

**Wait:** 10-15 minutes for build

**Result:** Download link like `https://expo.dev/artifacts/eas/abc123.apk`

### Share with Testers
Send them:
1. APK download link
2. Test account credentials
3. Your testing schedule

---

## 🎯 Testing Session Workflow

### Before Testing:
```powershell
# 1. Start everything
.\start-beta-testing.ps1

# 2. Copy ngrok URL (e.g., https://abc123.ngrok-free.app)

# 3. Update src/config/api.ts with URL

# 4. Rebuild app (if URL changed)
eas build --platform android --profile preview
```

### During Testing:
- Keep your PC on and connected to internet
- Monitor ngrok dashboard: http://127.0.0.1:4040
- Watch backend logs for errors
- Collect feedback from testers

### After Testing:
```powershell
# 1. Stop ngrok (Ctrl+C in PowerShell)

# 2. Change src/config/api.ts back to 'dev'

# 3. Optionally stop database
docker stop estatenet-postgres
```

---

## 📊 Monitor Testing

### Ngrok Dashboard
Open: http://127.0.0.1:4040
- See all API requests
- Check response times
- View errors

### Backend Logs
Watch the backend PowerShell window for:
- API calls
- Database queries
- Errors

### Database
```bash
# Connect to database
docker exec -it estatenet-postgres psql -U postgres -d estatenet

# View recent activity
SELECT * FROM payment_claims ORDER BY "createdAt" DESC LIMIT 10;
```

---

## 🐛 Common Issues

### "Network Error" in app
**Fix:**
1. Check ngrok is running (PowerShell window open)
2. Verify NGROK_URL in `src/config/api.ts` is correct
3. Test URL in browser: `https://your-url.ngrok-free.app/health`

### Ngrok URL changes
**Fix:**
- Free ngrok gives new URL each restart
- Update `src/config/api.ts` with new URL
- Rebuild app: `eas build --platform android --profile preview`
- OR upgrade to ngrok paid ($8/month) for static URL

### Backend won't start
**Fix:**
```bash
cd backend
npm install
npm run dev
```

### Database connection failed
**Fix:**
```bash
docker ps  # Check if running
docker start estatenet-postgres  # Start if stopped
```

---

## 💡 Pro Tips

1. **Schedule testing sessions** - Let testers know when you'll be online
2. **Use test data only** - Create fresh test accounts for beta
3. **Version your builds** - Name like `estatenet-beta-v1.0.0.apk`
4. **Collect feedback** - Use Google Forms for structured feedback
5. **Screen recordings** - Ask testers to record bugs

---

## 📋 Tester Instructions

Send this to your beta testers:

```
📱 EstateNet Beta Testing

Download: [Your APK link]

Install:
1. Download APK on Android phone
2. Enable "Install from Unknown Sources" in Settings
3. Open APK file to install
4. Launch app

Test Accounts:
- Owner: george@gmail.com / Ak47grave
- Manager: daniel@gmail.com / Ak47grave  
- Tenant: kazoora@gmail.com / Ak47grave

Testing Window: [Your available hours]

Report Issues: [Your contact/form]

What to Test:
✓ Login/signup
✓ Create property
✓ Send invitations
✓ Submit payment claims
✓ Verify payments
✓ View notifications
✓ Send messages

Thank you for testing! 🙏
```

---

## 🔒 Security Reminders

⚠️ **Important:**
- Ngrok exposes your PC to internet - only run during testing
- Use test data only - no real user information
- Stop ngrok when not testing
- Monitor ngrok dashboard for suspicious activity

---

## 📞 Need Help?

See full guide: `BETA_TESTING_SETUP_GUIDE.md`

**Common Resources:**
- Expo docs: https://docs.expo.dev/build/introduction/
- Ngrok docs: https://ngrok.com/docs
- EAS Build: https://docs.expo.dev/build/setup/

---

**Ready to test? Run:** `.\start-beta-testing.ps1` 🚀
