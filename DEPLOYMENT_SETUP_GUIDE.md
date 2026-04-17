# 🚀 EstateNet Automatic Deployment Setup Guide

## ✅ What's Been Configured

Your EstateNet app now has **automatic OTA (Over-The-Air) updates** configured, just like your backend's automatic deployment to Hostinger!

### How It Works:
1. **You push code to GitHub** → GitHub Action triggers automatically
2. **GitHub Action publishes OTA update** → Expo servers host the update
3. **Users open the app** → Update downloads automatically in background
4. **Users see your changes** → No manual action needed!

---

## 📋 One-Time Setup (15 minutes)

### Step 1: Get Your Expo Access Token

1. **Login to Expo:**
   ```bash
   npx expo login
   ```
   - Email: `muculezigeorge@gmail.com` (or your Expo account)
   - Password: Your Expo password

2. **Generate Access Token:**
   ```bash
   npx eas whoami
   ```
   
   Then visit: https://expo.dev/accounts/muculezigeorge/settings/access-tokens
   
   - Click **"Create Token"**
   - Name: `GitHub Actions - EstateNet`
   - Permissions: Select **"All"** or at minimum **"Read & Write"**
   - Click **"Create"**
   - **Copy the token** (you'll only see it once!)

### Step 2: Add Token to GitHub Secrets

1. Go to your GitHub repository:
   ```
   https://github.com/ArcaneValue/EstateNet/settings/secrets/actions
   ```

2. Click **"New repository secret"**

3. Add the secret:
   - **Name:** `EXPO_TOKEN`
   - **Value:** Paste the token you copied from Expo
   - Click **"Add secret"**

### Step 3: Test the Setup

1. Make a small change to test:
   ```bash
   # Edit any file in src/ folder (e.g., add a comment)
   # Example: src/screens/shared/FeedbackCommunityScreen.tsx
   
   git add .
   git commit -m "Test: OTA deployment setup"
   git push origin main
   ```

2. Watch the GitHub Action:
   - Go to: https://github.com/ArcaneValue/EstateNet/actions
   - You should see "Deploy OTA Update to Production" running
   - Wait for green checkmark ✅

3. Verify the update was published:
   ```bash
   # Check your latest updates
   npx eas update:list --branch production
   ```

---

## 🎯 Daily Workflow (Automatic!)

### For Small Changes (90% of the time):

```bash
# 1. Make your changes (bug fixes, new features, UI updates)
# 2. Test locally
npm start

# 3. Commit and push
git add .
git commit -m "Fixed admin dashboard theme bug"
git push origin main

# 4. That's it! GitHub Action automatically:
#    - Publishes OTA update
#    - Users get update within hours
#    - No manual intervention needed! 🎉
```

### For Major Changes (10% of the time):

When you need to build a new APK (camera, location, rebranding, etc.):

```bash
# 1. Update version in app.json
"version": "1.1.0"

# 2. Build new APK
npx eas build --platform android --profile production

# 3. Wait for build (10-20 minutes)
# 4. Download APK from Expo dashboard
# 5. Upload to Play Store or share with users
# 6. Users tap "Update" in Play Store
```

---

## 📊 What Triggers Automatic OTA Updates

The GitHub Action runs when you push changes to these files/folders:

✅ **Triggers OTA Update:**
- `src/**` - Any file in src folder
- `App.tsx` - Main app file
- `package.json` - Dependencies
- `app.json` - App configuration

❌ **Does NOT Trigger:**
- `backend/**` - Backend changes (separate deployment)
- `README.md` - Documentation
- `.github/**` - Workflow files themselves

---

## 🔍 Monitoring & Verification

### Check if OTA update was published:
```bash
npx eas update:list --branch production
```

### View update details:
```bash
npx eas update:view [UPDATE_ID]
```

### Check GitHub Action logs:
- Go to: https://github.com/ArcaneValue/EstateNet/actions
- Click on latest workflow run
- View logs for any errors

---

## 🎯 Update Channels Explained

Your app has 3 update channels configured:

| Channel | Purpose | APK Profile | Users |
|---------|---------|-------------|-------|
| **production** | Live users | `production` | Public/Play Store users |
| **preview** | Beta testing | `preview` | Beta testers |
| **development** | Your testing | `development` | You (dev builds) |

**Current setup:** GitHub Action publishes to **production** channel when you push to `main` branch.

---

## 🚨 Troubleshooting

### Error: "EXPO_TOKEN secret is not set"
**Solution:** Follow Step 2 above to add the token to GitHub Secrets.

### Error: "Update failed to publish"
**Check:**
1. Expo token is valid (not expired)
2. You're logged into correct Expo account
3. Project ID matches in app.json

### Updates not reaching users
**Check:**
1. Users have internet connection
2. Users are opening the app (updates download on launch)
3. Users are on correct APK version (matching runtimeVersion)

### Want to publish manually instead of automatic?
```bash
# Disable GitHub Action by deleting or renaming the workflow file
# Then publish manually:
npx eas update --branch production --message "Your update message"
```

---

## 📱 User Experience

### What users see:

**First time (Install APK):**
```
1. Download estatenet-v1.0.0.apk
2. Install app
3. Open app → Works immediately
```

**After you push OTA updates:**
```
1. User opens EstateNet app
2. App checks Expo: "Any updates?"
3. If yes: Downloads update (usually <1MB, takes 2-5 seconds)
4. Update applies automatically
5. User sees your latest changes ✅
```

**No notification, no manual action needed!**

---

## 🎉 Benefits

✅ **Speed:** Bug fixes live in minutes, not days
✅ **Automatic:** Push to GitHub → Users get updates
✅ **Seamless:** Users don't even notice updates happening
✅ **Free:** Unlimited OTA updates on Expo free tier
✅ **Just like backend:** Same workflow as Hostinger auto-deploy

---

## 📝 Quick Reference

```bash
# Check who you're logged in as
npx eas whoami

# List all updates
npx eas update:list --branch production

# Publish manual update
npx eas update --branch production --message "Bug fix"

# Build new APK (when needed)
npx eas build --platform android --profile production

# View build status
npx eas build:list
```

---

## 🔐 Security Notes

- ✅ EXPO_TOKEN is stored securely in GitHub Secrets
- ✅ Token is never exposed in logs or code
- ✅ Only you can trigger deployments (via push to main)
- ✅ Updates are signed and verified by Expo

---

## 📞 Support

**Expo Documentation:** https://docs.expo.dev/eas-update/introduction/
**GitHub Actions Logs:** https://github.com/ArcaneValue/EstateNet/actions
**Expo Dashboard:** https://expo.dev/accounts/muculezigeorge/projects/estatenet

---

**Setup Date:** April 18, 2026  
**Configured By:** Cascade AI  
**Status:** ✅ Ready to use after completing Step 1 & 2 above
