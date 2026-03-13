# Backend Connection Troubleshooting

## Quick Check: Is Backend Running?

Open your browser and navigate to:
```
http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-04T...",
  "database": "connected"
}
```

If you see this, the backend is running correctly! ✅

If you get "Cannot connect" or timeout, the backend is NOT running. ❌

---

## How to Start the Backend

### Option 1: Using the provided script (Windows)
```powershell
cd backend
.\start-backend.ps1
```

### Option 2: Manual start
```powershell
cd backend
npm run dev
```

**Expected output when backend starts:**
```
🚀 EstateNet Backend running on port 3001
📊 Health check: http://localhost:3001/health
```

---

## Platform-Specific API Configuration

The app automatically uses the correct API URL based on platform:

| Platform | API URL | Notes |
|----------|---------|-------|
| **Web** | `http://localhost:3001/api` | Backend must be running locally |
| **Android** | `http://10.157.136.42:3001/api` | Uses your machine's IP address |
| **iOS** | `http://localhost:3001/api` | Backend must be running locally |

### If Your IP Address Changes

If you're on a different network and your machine IP changes:

1. Find your new IP address:
   ```powershell
   ipconfig
   ```
   Look for "IPv4 Address" under your active network adapter

2. Update the IP in `src/config/api.ts`:
   ```typescript
   const DEVELOPMENT_MACHINE_IP = 'YOUR_NEW_IP_HERE';
   ```

3. Restart the Expo dev server

---

## Common Issues

### Issue 1: "Failed to fetch" or "Network request failed"
**Cause:** Backend server is not running
**Solution:** Start the backend server (see above)

### Issue 2: "Connection timeout" on Android
**Cause:** Android device/emulator cannot reach your machine
**Solutions:**
- Ensure backend is running with `0.0.0.0` binding (already configured)
- Check firewall isn't blocking port 3001
- Verify Android device is on same WiFi network as your PC
- Update `DEVELOPMENT_MACHINE_IP` in `src/config/api.ts` if your IP changed

### Issue 3: "Connection timeout" on Web
**Cause:** Backend not running or running on wrong port
**Solution:** 
- Check backend is running on port 3001
- Visit http://localhost:3001/health to verify

---

## Production Builds

For production builds, set the production API URL in `.env`:

```env
EXPO_PUBLIC_API_URL=https://your-production-api.com/api
```

Then rebuild the app.

---

## Quick Start Checklist

- [ ] Backend server is running (`cd backend && npm run dev`)
- [ ] Health check works (http://localhost:3001/health)
- [ ] Frontend dev server is running (`npm start`)
- [ ] For Android: Machine IP is correct in `src/config/api.ts`
- [ ] For Android: Device is on same network as PC
