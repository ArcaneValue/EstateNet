# Development Build with Hot Reload - Setup Guide

## What is a Development Build?

A development build is a special APK that:
- ✅ Installs once on your phone (like a regular app)
- ✅ Connects to your dev server for live updates
- ✅ Shows code changes instantly without reinstalling
- ✅ Includes debugging tools and error overlays
- ✅ Works on your actual device (not emulator)

## Prerequisites

1. **EAS CLI installed**
   ```powershell
   npm install -g eas-cli
   ```

2. **Expo account** (free)
   ```powershell
   eas login
   ```

3. **Backend server running**
   ```powershell
   cd backend
   npm run dev
   ```

## Step-by-Step Setup

### Step 1: Build the Development APK (One-Time)

This builds a special APK with the Expo development client embedded:

```powershell
# From project root
eas build --platform android --profile development
```

**What happens:**
- EAS builds your app in the cloud (takes 10-20 minutes first time)
- You get a download link for the APK
- The APK is configured to connect to your dev server

**Important:** The build includes your current machine IP (`10.79.234.41:3001/api`) from `eas.json`

### Step 2: Install the APK on Your Phone

1. Download the APK from the link EAS provides
2. Transfer to your phone (email, cloud, USB)
3. Install it (enable "Install from unknown sources" if needed)
4. **Keep this APK installed** - you won't need to reinstall it

### Step 3: Start Development Server

Every time you want to develop:

```powershell
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
npm start
```

### Step 4: Connect Your Phone to Dev Server

1. **Ensure phone is on same WiFi as your PC**
2. Open the development build app on your phone
3. You'll see "Enter URL manually" option
4. Enter: `exp://10.79.234.41:8081` (or scan QR code from terminal)
5. App loads and connects to your dev server

### Step 5: Develop with Hot Reload! 🎉

Now you can:
- Edit code in VS Code
- Save the file
- **Changes appear instantly on your phone** (no reinstall!)
- Shake phone to open dev menu
- Press `r` in terminal to reload manually

## Daily Workflow

```
1. Start backend: cd backend && npm run dev
2. Start frontend: npm start
3. Open dev build app on phone
4. Make code changes → See updates instantly!
```

## When to Rebuild the Development APK

You only need to rebuild when you:
- ❌ Add new native dependencies (e.g., new Expo modules)
- ❌ Change app.json configuration (permissions, icons, etc.)
- ❌ Update Expo SDK version
- ❌ Your machine IP changes and you need to update it

You do NOT need to rebuild for:
- ✅ JavaScript/TypeScript code changes
- ✅ React component changes
- ✅ Styling updates
- ✅ API endpoint changes
- ✅ Most configuration changes

## Troubleshooting

### Issue: "Unable to connect to development server"

**Solutions:**
1. Check phone is on same WiFi as PC
2. Verify backend is running on port 3001
3. Check firewall isn't blocking port 8081
4. Verify IP address in `eas.json` matches your current IP

### Issue: "Network request failed" when calling API

**Solutions:**
1. Backend must be running
2. Check IP in `eas.json` env matches backend IP
3. Try accessing `http://10.79.234.41:3001/health` from phone browser

### Issue: Changes not appearing

**Solutions:**
1. Press `r` in Expo terminal to force reload
2. Shake phone → "Reload"
3. Check Metro bundler is running
4. Clear cache: `npx expo start --clear`

## IP Address Changes

If your machine IP changes (different network):

1. Find new IP:
   ```powershell
   ipconfig
   ```

2. Update `eas.json`:
   ```json
   "env": {
     "EXPO_PUBLIC_API_URL": "http://YOUR_NEW_IP:3001/api"
   }
   ```

3. Update `src/config/api.ts`:
   ```typescript
   const DEVELOPMENT_MACHINE_IP = 'YOUR_NEW_IP';
   ```

4. **Rebuild the development APK** (one-time)

5. Reinstall on phone

## Comparison: Development Build vs Preview Build

| Feature | Development Build | Preview Build |
|---------|------------------|---------------|
| Hot Reload | ✅ Yes | ❌ No |
| Dev Tools | ✅ Yes | ❌ No |
| Debugging | ✅ Full | ⚠️ Limited |
| Needs Dev Server | ✅ Yes | ❌ No |
| Standalone | ❌ No | ✅ Yes |
| Use Case | Daily development | Testing/demos |
| Rebuild Frequency | Rarely | Each change |

## Advanced: Local Build (Faster)

If you have Android Studio installed, build locally instead of cloud:

```powershell
eas build --platform android --profile development --local
```

Benefits:
- Much faster (5-10 min vs 20+ min)
- No cloud queue wait
- Uses your local machine

Requirements:
- Android Studio installed
- Android SDK configured
- Java JDK installed

## Next Steps

After you have the development build working:
1. Use it for all daily development
2. Only build preview APKs for stakeholder demos
3. Consider setting up OTA updates for production

## Quick Reference

```powershell
# Build development APK (once)
eas build --platform android --profile development

# Daily workflow
cd backend && npm run dev          # Terminal 1
npm start                          # Terminal 2
# Open app on phone → Connect → Develop!

# Force reload
# Press 'r' in terminal OR shake phone → Reload

# Rebuild (when needed)
eas build --platform android --profile development
```

---

**You're all set!** Build the development APK once, and enjoy instant updates on your phone without constant reinstalls. 🚀
