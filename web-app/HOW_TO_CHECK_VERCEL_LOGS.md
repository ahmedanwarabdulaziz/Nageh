# How to Check Vercel Logs for 500 Errors

## Step-by-Step Guide

### 1. Go to Vercel Dashboard
- Visit [vercel.com](https://vercel.com) and log in
- Select your project: **nageh-green**

### 2. View Deployment Logs
- Click on the **"Deployments"** tab
- Click on the **latest deployment** (the most recent one)
- Click on the **"Functions"** tab or **"Runtime Logs"** tab

### 3. Find the Error
Look for log entries that contain:
- `[GET /api/member-categories] Failed to load categories:`
- `[GET /api/team-head/leaders] Failed to load leaders:`

These will show the **actual error message** that's causing the 500 errors.

## What to Look For

The error message will tell you exactly what's wrong. Common errors:

### Missing Environment Variables
```
Firebase admin credentials are not configured. Please set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in Vercel environment variables.
```

### Incomplete Configuration
```
Firebase admin configuration incomplete. Missing FIREBASE_ADMIN_PROJECT_ID or FIREBASE_ADMIN_CLIENT_EMAIL.
```

### Invalid Private Key
```
Failed to initialize Firebase Admin: Error: Invalid key format...
```

## Alternative: Check Real-Time Logs

1. In Vercel Dashboard → Your Project
2. Click **"Logs"** in the left sidebar
3. Make a request to the failing API endpoint
4. Watch the logs appear in real-time

## What to Do After Finding the Error

1. **If environment variables are missing:**
   - Go to **Settings** → **Environment Variables**
   - Add the missing variables (see `VERCEL_ENV_VARIABLES.md`)

2. **If variables are set but still failing:**
   - Check for typos in variable names
   - Verify the `FIREBASE_ADMIN_PRIVATE_KEY` includes all `\n` characters
   - Make sure variables are set for **Production** environment

3. **After fixing:**
   - Redeploy the project
   - Check logs again to confirm the error is resolved

## Quick Test

After the new deployment completes, try accessing:
- `https://nageh-green.vercel.app/api/member-categories?scopeType=head&scopeId=N3VjL5akgrBgZRsn04Z1`

Then immediately check the Vercel logs - you should see a detailed error message that tells you exactly what's wrong.

