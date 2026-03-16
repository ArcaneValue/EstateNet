# 📱 EstateNet Beta Testing - Session Information

**Date:** March 16, 2026  
**Setup By:** Windsurf AI  
**Status:** ✅ ACTIVE

---

## 🌐 Current Configuration

### Ngrok Tunnel
**Public URL:** `https://nonstanzaic-unlovably-collin.ngrok-free.dev`  
**Local Port:** 3001  
**Status:** ✅ Active  
**Dashboard:** http://127.0.0.1:4040

⚠️ **Important:** This URL changes every time you restart ngrok!

### Backend Server
**Local URL:** http://localhost:3001  
**Public URL:** https://nonstanzaic-unlovably-collin.ngrok-free.dev  
**Status:** ✅ Running  
**Database:** PostgreSQL (Docker: estatenet-postgres)

### App Configuration
**File:** `src/config/api.ts`  
**Environment:** `beta`  
**API URL:** `https://nonstanzaic-unlovably-collin.ngrok-free.dev/api`

---

## 📦 Build Information

### EAS Build
**Platform:** Android  
**Profile:** preview  
**Build Type:** APK (standalone app)  
**Account:** muculezigeorge  
**Status:** 🔄 Building...

**Build Command:**
```bash
eas build --platform android --profile preview
```

**Expected Time:** 10-15 minutes

---

## 👥 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| **Owner** | george@gmail.com | Ak47grave |
| **Manager** | daniel@gmail.com | Ak47grave |
| **Tenant** | kazoora@gmail.com | Ak47grave |

---

## ✅ What's Working

### Policy Changes Implemented:
1. ✅ **Billing Period Duplicate Enforcement**
   - One active claim per lease per billing period (YYYY-MM)
   - Tested and verified with live data

2. ✅ **Owner Org Oversight**
   - Manager-created properties owned by org owner
   - Owner can see all properties in their organization
   - Tested and verified with live data

### Full Feature Set:
- ✅ User authentication (Owner, Manager, Tenant)
- ✅ Property management
- ✅ Invitation system (Owner→Manager, Manager→Tenant)
- ✅ Lease management
- ✅ Payment claims with billing period enforcement
- ✅ Payment verification
- ✅ Notifications
- ✅ Messages
- ✅ Financial dashboards
- ✅ Org-based property visibility

---

## 🚀 How to Share with Testers

### Once Build Completes:

1. **Get Download Link**
   - EAS will provide a URL like: `https://expo.dev/artifacts/eas/abc123.apk`
   - Copy this link

2. **Send to Testers**
   ```
   📱 EstateNet Beta Testing
   
   Download: [APK link]
   
   Installation:
   1. Download APK on Android phone
   2. Enable "Install from Unknown Sources" in Settings → Security
   3. Open downloaded APK to install
   4. Launch EstateNet app
   
   Test Accounts:
   - Owner: george@gmail.com / Ak47grave
   - Manager: daniel@gmail.com / Ak47grave
   - Tenant: kazoora@gmail.com / Ak47grave
   
   Testing Window: [Your available hours]
   
   What to Test:
   ✓ Login/signup
   ✓ Create property
   ✓ Send invitations
   ✓ Submit payment claims
   ✓ Verify payments
   ✓ View notifications
   ✓ Send messages
   
   Report Issues: [Your contact]
   
   Thank you! 🙏
   ```

---

## 📊 Monitoring During Testing

### Ngrok Dashboard
**URL:** http://127.0.0.1:4040  
**Shows:**
- All API requests
- Response times
- Request/response details
- Errors

### Backend Logs
Check the PowerShell window running `npm run dev` for:
- API calls
- Database queries
- Errors and warnings

### Database Access
```bash
# Connect to database
docker exec -it estatenet-postgres psql -U postgres -d estatenet

# View recent claims
SELECT id, "billingPeriod", status, "createdAt" 
FROM payment_claims 
ORDER BY "createdAt" DESC 
LIMIT 10;

# View users
SELECT id, email, role FROM users;
```

---

## ⚠️ Important Reminders

### During Testing:
- ✅ Keep your PC on and connected to internet
- ✅ Keep ngrok PowerShell window open
- ✅ Keep backend PowerShell window open
- ✅ Keep Docker database running
- ✅ Monitor ngrok dashboard for activity

### Security:
- ⚠️ Ngrok exposes your PC to internet - only run during scheduled testing
- ⚠️ Use test data only - no real user information
- ⚠️ Stop ngrok when not testing
- ⚠️ Monitor for suspicious activity

### If Ngrok URL Changes:
1. Get new URL from ngrok window
2. Update `src/config/api.ts` line 30
3. Rebuild app: `eas build --platform android --profile preview`
4. Send new APK link to testers

---

## 🛑 Stopping Beta Testing Session

When testing is complete:

```powershell
# 1. Stop ngrok (Ctrl+C in ngrok PowerShell window)

# 2. Stop backend (Ctrl+C in backend PowerShell window)

# 3. Update config back to dev mode
# Edit src/config/api.ts:
#   Line 26: const CURRENT_ENV = 'dev';

# 4. Optionally stop database
docker stop estatenet-postgres
```

---

## 🔄 Restarting Beta Testing

```powershell
# 1. Start database
docker start estatenet-postgres

# 2. Start backend
cd backend
npm run dev

# 3. Start ngrok (in new terminal)
ngrok http 3001

# 4. Copy new ngrok URL

# 5. Update src/config/api.ts with new URL

# 6. Rebuild app if URL changed
eas build --platform android --profile preview
```

---

## 📞 Troubleshooting

### "Network Error" in App
**Fix:**
1. Check ngrok is running (PowerShell window open)
2. Verify URL in `src/config/api.ts` matches ngrok URL
3. Test URL in browser: `https://nonstanzaic-unlovably-collin.ngrok-free.dev/health`

### Backend Not Responding
**Fix:**
```bash
cd backend
npm install
npm run dev
```

### Database Connection Failed
**Fix:**
```bash
docker ps  # Check if running
docker start estatenet-postgres
```

### Ngrok Tunnel Closed
**Fix:**
```bash
# Restart ngrok
ngrok http 3001

# Update config with new URL
# Rebuild app if needed
```

---

## 📈 Success Metrics

Track during testing:
- [ ] All 3 roles can login successfully
- [ ] Owner can create properties
- [ ] Owner can invite managers
- [ ] Manager can accept invitations
- [ ] Manager can create properties (owned by org owner)
- [ ] Manager can create leases
- [ ] Tenant can submit payment claims
- [ ] Duplicate claims blocked (same billing period)
- [ ] Different month claims allowed
- [ ] Manager can verify claims
- [ ] Payments created correctly
- [ ] Notifications working
- [ ] Messages working
- [ ] Owner sees all org properties

---

## 📝 Feedback Collection

Create a Google Form or use this template:

**Beta Testing Feedback Form:**
1. Which role did you test? (Owner/Manager/Tenant)
2. What device/Android version?
3. What worked well?
4. What didn't work?
5. Any errors or crashes?
6. Screenshots of issues (if any)
7. Overall experience (1-5 stars)
8. Suggestions for improvement

---

## 🎯 Next Steps After Beta

1. **Collect & Review Feedback**
   - Fix critical bugs
   - Improve UX based on feedback

2. **Deploy to Production**
   - Move database to Supabase
   - Move backend to Railway
   - Update app config to production URLs

3. **Submit to App Stores**
   - Google Play Store ($25 one-time)
   - Apple App Store ($99/year)
   - Use EAS for submission

4. **Launch!** 🚀

---

**Session Started:** March 16, 2026  
**Ngrok URL Valid Until:** Session ends (or ngrok restart)  
**Build Status:** Check EAS dashboard or terminal output

**Keep this document handy during your beta testing session!**
