# Check Environment Variables in Vercel

## The Error You're Seeing

`Firebase: Error (auth/invalid-api-key)` means that the Firebase environment variables are either:
1. **Not set** in Vercel
2. **Set incorrectly** (wrong values or typos)
3. **Not available** to the client-side code

## How to Fix

### Step 1: Go to Vercel Environment Variables

1. Open your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**

### Step 2: Verify These 6 Variables Are Set

Check that ALL of these are present with the correct values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCJupHsXA9CFnEvi_cpQNIST4prNBMpw6o
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nageh-b040e.firebaseapp.com
NEXT_PUBLIC_FIRELIC_FIREBASE_PROJECT_ID=nageh-b040e
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nageh-b040e.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=296272784816
NEXT_PUBLIC_FIREBASE_APP_ID=1:296272784816:web:59d85458fa418a9b433a75
```

### Step 3: Important Settings

For each variable:
- ✅ Make sure it's set for **Production** environment
- ✅ Make sure it's set for **Preview** environment  
- ✅ Make sure it's set for **Development** environment (optional but recommended)

### Step 4: Check for Typos

Common mistakes:
- ❌ `NEXT_PUBLIC_FIREBASE_API_KEY` (missing underscore)
- ❌ `NEXT_PUBLIC_FIREBASE_APIKEY` (wrong)
- ❌ `FIREBASE_API_KEY` (missing NEXT_PUBLIC_ prefix)
- ✅ `NEXT_PUBLIC_FIREBASE_API_KEY` (correct)

**The `NEXT_PUBLIC_` prefix is REQUIRED** for client-side variables in Next.js!

### Step 5: Redeploy

After adding/updating environment variables:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Or push a new commit to trigger a new deployment

## Verify Variables Are Set

After redeploying, check the build logs. You should NOT see any errors about missing environment variables.

## Still Not Working?

1. **Double-check the values** - Copy them exactly from `web-app/VERCEL_ENV_VARIABLES.md`
2. **Check for extra spaces** - Make sure there are no leading/trailing spaces
3. **Verify the API key** - Make sure it matches your Firebase project settings
4. **Check Vercel logs** - Look for any warnings about environment variables

## Quick Test

After setting variables and redeploying, open your app in the browser and check the console. The Firebase error should be gone.

