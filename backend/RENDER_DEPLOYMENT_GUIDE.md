# RENDER DEPLOYMENT GUIDE - ESTATENET BACKEND

## ✅ Changes Applied

Your `package.json` has been updated with:
1. ✅ Build script now includes Prisma generation
2. ✅ Postinstall script added for automatic Prisma Client generation
3. ✅ Duplicate Prisma dependency removed from devDependencies

---

## 🔧 RENDER CONFIGURATION

### Build Command
```bash
npm install && npm run build
```

### Start Command
```bash
npm start
```

---

## 🔐 ENVIRONMENT VARIABLES (Required)

Add these in your Render dashboard under **Environment** tab:

### **1. Database Configuration**
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```
**Example:**
```
DATABASE_URL=postgresql://estatenet_user:your_strong_password@dpg-abc123xyz.oregon-postgres.render.com:5432/estatenet_db
```
**⚠️ IMPORTANT:** Get this from your Render PostgreSQL database's "Internal Database URL"

---

### **2. JWT Secret (CRITICAL)**
```
JWT_SECRET=your_super_strong_random_secret_here_minimum_64_characters
```
**Generate strong secret:**
```bash
# On Linux/Mac:
openssl rand -base64 64

# On Windows PowerShell:
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

### **3. Node Environment**
```
NODE_ENV=production
```

---

### **4. Server Port (Optional)**
```
PORT=3001
```
**Note:** Render automatically sets PORT, but you can override it

---

### **5. Xyle Payment Provider**
```
PAYMENT_PROVIDER=XYLE
XYLE_SANDBOX_API_KEY=xyl_d3c25c7f9b713c79cf9084c06e40e0eebab8256a6e636b2584138a5e861951b6
XYLE_API_URL=https://api.xylepayments.com/sandbox/api/v1/client
XYLE_WEBHOOK_SECRET=your_webhook_secret_here
PAYMENTS_WEBHOOK_SECRET=your_webhook_secret_here
```
**⚠️ For Production:** Replace sandbox key with production key from Xyle dashboard

---

### **6. Frontend URL (CORS)**
```
FRONTEND_URL=https://your-frontend-app.com,https://www.your-frontend-app.com
```
**Example:**
```
FRONTEND_URL=https://estatenet-mobile.vercel.app,https://estatenet.app
```

---

### **7. Rate Limiting (Optional)**
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

### **8. Flutterwave (Optional - if using)**
```
PAYMENTS_PROVIDER=mock
FLW_PUBLIC_KEY=your_flutterwave_public_key
FLW_SECRET_KEY=your_flutterwave_secret_key
FLW_WEBHOOK_SECRET=your_flutterwave_webhook_secret
```

---

## 📋 COMPLETE ENVIRONMENT VARIABLES LIST

Copy this template and fill in your values:

```env
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# JWT Authentication
JWT_SECRET=your_super_strong_random_secret_here_minimum_64_characters

# Server
NODE_ENV=production
PORT=3001

# Xyle Payments (Manager Service Fees)
PAYMENT_PROVIDER=XYLE
XYLE_SANDBOX_API_KEY=xyl_d3c25c7f9b713c79cf9084c06e40e0eebab8256a6e636b2584138a5e861951b6
XYLE_API_URL=https://api.xylepayments.com/sandbox/api/v1/client
XYLE_WEBHOOK_SECRET=your_webhook_secret_here
PAYMENTS_WEBHOOK_SECRET=your_webhook_secret_here

# Frontend CORS
FRONTEND_URL=https://your-frontend-app.com

# Rate Limiting (Optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Flutterwave (Optional - Tenant Payments)
PAYMENTS_PROVIDER=mock
FLW_PUBLIC_KEY=your_flutterwave_public_key
FLW_SECRET_KEY=your_flutterwave_secret_key
FLW_WEBHOOK_SECRET=your_flutterwave_webhook_secret
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Create PostgreSQL Database
1. In Render dashboard, click **New +** → **PostgreSQL**
2. Name: `estatenet-db`
3. Database: `estatenet_db`
4. User: `estatenet_user`
5. Region: Choose closest to your users
6. Plan: Free or Starter
7. Click **Create Database**
8. Copy the **Internal Database URL** (starts with `postgresql://`)

---

### Step 2: Create Web Service
1. In Render dashboard, click **New +** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `estatenet-backend`
   - **Region:** Same as database
   - **Branch:** `main` (or your production branch)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free or Starter

---

### Step 3: Add Environment Variables
1. In your web service, go to **Environment** tab
2. Click **Add Environment Variable**
3. Add all variables from the list above
4. **CRITICAL:** Set `DATABASE_URL` to the Internal Database URL from Step 1

---

### Step 4: Deploy
1. Click **Manual Deploy** → **Deploy latest commit**
2. Watch the build logs
3. Wait for "Your service is live 🎉"

---

## 🔍 TROUBLESHOOTING

### Error: "Prisma Client not generated"
**Solution:** Already fixed with `postinstall` script ✅

### Error: "Cannot connect to database"
**Check:**
- `DATABASE_URL` is set correctly
- Using **Internal Database URL** (not External)
- Database is in same region as web service

### Error: "Build failed: Command failed with exit code 1"
**Check:**
- All TypeScript files compile locally: `npm run build`
- No missing dependencies
- `tsconfig.build.json` is present

### Error: "Application failed to respond"
**Check:**
- `PORT` environment variable is set
- Server binds to `0.0.0.0` (already configured ✅)
- Health check endpoint works: `GET /health`

### Error: "CORS blocking requests"
**Solution:** Set `FRONTEND_URL` environment variable with your frontend domain

---

## ✅ VERIFICATION CHECKLIST

After deployment, verify:

- [ ] Health check works: `https://your-app.onrender.com/health`
- [ ] API info works: `https://your-app.onrender.com/api`
- [ ] Database connection successful (check logs)
- [ ] Login endpoint works: `POST /api/auth/login`
- [ ] Billing scheduler starts (check logs for "BillingScheduler")
- [ ] Webhooks configured with your Render URL

---

## 🔗 WEBHOOK CONFIGURATION

Update your Xyle dashboard with production webhook URL:
```
https://your-app.onrender.com/api/payments/webhook/xyle
```

**Webhook Secret:** Use the same value as `PAYMENTS_WEBHOOK_SECRET`

---

## 📊 MONITORING

### Check Logs
```
Render Dashboard → Your Service → Logs
```

### Health Check
```bash
curl https://your-app.onrender.com/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2026-04-03T16:25:00.000Z",
  "architecture": "identity-first",
  "version": "1.0.0"
}
```

---

## 🔒 SECURITY NOTES

1. **Never commit `.env` files** - Already in `.gitignore` ✅
2. **Use strong secrets** - Generate with `openssl rand -base64 64`
3. **Rotate secrets regularly** - Every 90 days recommended
4. **Use production API keys** - Replace sandbox keys before launch
5. **Enable HTTPS only** - Render provides this automatically ✅

---

## 📱 FRONTEND CONFIGURATION

After backend is deployed, update your frontend `.env`:

```env
EXPO_PUBLIC_API_URL=https://your-app.onrender.com/api
```

**File:** `c:\Estate Net\EstateNet\.env`

---

## 🎯 NEXT STEPS

1. ✅ Deploy backend to Render
2. ✅ Verify all endpoints work
3. ✅ Update frontend API URL
4. ✅ Configure Xyle webhooks
5. ✅ Test payment flow end-to-end
6. ✅ Monitor logs for errors
7. ✅ Set up custom domain (optional)

---

**Deployment Date:** April 3, 2026  
**Guide Version:** 1.0
