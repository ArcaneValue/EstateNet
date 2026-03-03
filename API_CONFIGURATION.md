# API Configuration Guide

This document explains how to configure the EstateNet frontend to connect to the backend API.

## Overview

The frontend uses environment-based configuration to determine the backend API URL. This prevents hardcoded IP addresses that become stale when your network changes.

## Default Behavior

**By default, the app connects to `http://localhost:3002/api`**

This works perfectly for:
- Local web development (browser)
- Development on the same machine

## Configuration File

The API configuration is located in: `src/config/api.ts`

## Environment Variables

### EXPO_PUBLIC_API_URL

Set this environment variable to override the default API URL.

**Format:** `http://YOUR_IP:PORT/api`

## Setup Instructions

### 1. Local Web Development (Default)

No configuration needed! Just run:

```bash
npm start
```

The app will automatically use `http://localhost:3002/api`

### 2. Testing on Phone (Same WiFi Network)

When testing on a physical device or emulator on the same network:

#### Step 1: Find Your PC's IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.100`)

**macOS/Linux:**
```bash
ifconfig | grep "inet "
```
Look for your local IP (usually starts with `192.168` or `10.0`)

#### Step 2: Create .env File

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env
```

#### Step 3: Set API URL

Edit `.env` and add:

```env
EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3002/api
```

**Example:**
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3002/api
```

#### Step 4: Restart Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm start
```

### 3. Backend Requirements

The backend must be:
1. **Running** on the specified port (default: 3002)
2. **Bound to 0.0.0.0** (not just localhost) to accept network connections
3. **Firewall configured** to allow connections on the port

Verify backend is accessible:
```bash
# From your phone's browser, visit:
http://YOUR_PC_IP:3002/health
```

## Verification

When the app starts, check the console for:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 API Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Base URL: http://192.168.1.100:3002/api
🔧 Source: .env file
📱 Platform: ios
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

This confirms:
- ✅ The API URL being used
- ✅ Whether it's from .env or default
- ✅ The platform (web/ios/android)

## Troubleshooting

### "Cannot connect to server" Error

1. **Check backend is running:**
   ```bash
   # In backend directory
   npm run dev
   ```

2. **Verify backend port:**
   - Check backend console output
   - Look for: "🚀 EstateNet Backend running on port 3002"

3. **Test backend connectivity:**
   ```bash
   # From your development machine
   curl http://localhost:3002/health
   
   # From your phone (replace IP)
   # Open browser and visit:
   http://YOUR_PC_IP:3002/health
   ```

4. **Check firewall:**
   - Windows: Allow Node.js through Windows Firewall
   - macOS: System Preferences → Security & Privacy → Firewall
   - Linux: Check iptables/ufw rules

5. **Verify .env is loaded:**
   - Check console logs on app startup
   - Should show "Source: .env file" if loaded correctly

### IP Address Changed

If your network IP changes (common with DHCP):

1. Find new IP address (see Step 1 above)
2. Update `.env` file with new IP
3. Restart Expo dev server

### Port Already in Use

If backend shows "Port 3001 is already in use":
- Backend will automatically try port 3002
- Update your .env to match: `EXPO_PUBLIC_API_URL=http://YOUR_IP:3002/api`

## Examples

### Example 1: Local Development
```env
# No .env needed - uses default localhost:3002
```

### Example 2: Phone on Home WiFi
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3002/api
```

### Example 3: Phone on Office WiFi
```env
EXPO_PUBLIC_API_URL=http://10.0.0.50:3002/api
```

### Example 4: Custom Port
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3003/api
```

## Security Notes

- ⚠️ Never commit `.env` to version control
- ✅ `.env` is already in `.gitignore`
- ✅ Use `.env.example` as a template
- ⚠️ Only use this setup for development
- ⚠️ For production, use proper environment configuration

## Related Files

- `src/config/api.ts` - API configuration logic
- `.env.example` - Template with documentation
- `.env` - Your local configuration (not in git)
- `src/utils/apiClient.ts` - API client using the configuration

## Support

If you continue to have connection issues:
1. Check all steps in Troubleshooting section
2. Verify backend logs for errors
3. Check network connectivity between devices
4. Ensure both devices are on the same network
