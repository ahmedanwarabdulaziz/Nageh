# Troubleshooting 500 Errors in API Routes

## Common Errors

If you're seeing 500 errors like:
- `GET /api/team-head/leaders 500`
- `GET /api/member-categories 500`
- `POST /api/member-categories 500`

This means **Firebase Admin is not initializing correctly** at runtime.

## Root Cause

The 500 errors occur because:
1. **Firebase Admin environment variables are missing** in Vercel
2. **Environment variables are set incorrectly** (typos, wrong values)
3. **Environment variables are not set for Production** environment

## Solution: Verify Environment Variables in Vercel

### Step 1: Check Vercel Environment Variables

1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** → **Environment Variables**
3. Verify these **3 server-side variables** are set:

```
FIREBASE_ADMIN_PROJECT_ID=nageh-b040e
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@nageh-b040e.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

### Step 2: Check Environment Settings

For each variable, make sure:
- ✅ It's set for **Production** environment
- ✅ It's set for **Preview** environment (optional)**
- ✅ No typos in the variable name
- ✅ Value matches exactly (especially for `FIREBASE_ADMIN_PRIVATE_KEY`)

### Step 3: Verify FIREBASE_ADMIN_PRIVATE_KEY

The private key is the most common issue. Make sure:
- ✅ Copy the **ENTIRE** value from `VERCEL_ENV_VARIABLES.md`
- ✅ Include the `\n` characters (don't replace them)
- ✅ Starts with `-----BEGIN PRIVATE KEY-----\n`
- ✅ Ends with `\n-----END PRIVATE KEY-----\n`
- ✅ No extra spaces before or after

### Step 4: Redeploy

After verifying/updating environment variables:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Wait for deployment to complete

## How to Check Server Logs

To see the actual error:

1. Go to **Vercel Dashboard** → Your Project
2. Click **Deployments** tab
3. Click on the latest deployment
4. Click **"Functions"** tab (or check runtime logs)
5. Look for error messages about Firebase Admin

The error should say something like:
- "Firebase admin credentials are not configured"
- "Missing FIREBASE_ADMIN_PROJECT_ID or FIREBASE_ADMIN_CLIENT_EMAIL"

## Quick Checklist

- [ ] `FIREBASE_ADMIN_PROJECT_ID` is set
- [ ] `FIREBASE_ADMIN_CLIENT_EMAIL` is set  
- [ ] `FIREBASE_ADMIN_PRIVATE_KEY` is set (with full key including `\n`)
- [ ] All variables are set for **Production** environment
- [ ] No typos in variable names
- [ ] Redeployed after adding/updating variables

## Still Not Working?

If you've verified all environment variables are set correctly but still getting 500 errors:

1. **Check Vercel Function Logs** - Look for the actual error message
2. **Verify the private key format** - Make sure `\n` characters are included
3. **Try deleting and re-adding** the `FIREBASE_ADMIN_PRIVATE_KEY` variable
4. **Check if variables are encrypted** - Vercel should show them as encrypted (that's normal)

The improved error messages in the code will now tell you exactly which variable is missing.

