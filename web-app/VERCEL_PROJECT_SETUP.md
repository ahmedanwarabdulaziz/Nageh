# How to Import Project to Vercel Correctly

## Problem: Vercel Shows "Framework Preset: Others"

This happens because Vercel scans the repository root, but your Next.js app is in the `web-app/` folder.

## Solution: Set Root Directory During Import

### Option 1: During Project Import (Recommended)

1. **Go to Vercel Dashboard** → Click **"Add New..."** → **"Project"**

2. **Import from GitHub**
   - Select your repository: `ahmedanwarabdulaziz/Nageh`
   - Click **"Import"**

3. **Configure Project Settings**
   - **Framework Preset**: It will show "Others" - that's OK, we'll fix it
   - **Root Directory**: Click the folder icon or type: `web-app`
   - **Build Command**: Should auto-fill to `npm run build` (if not, type it)
   - **Output Directory**: Should auto-fill to `.next` (if not, type it)
   - **Install Command**: Should auto-fill to `npm install` (if not, type it)

4. **After setting Root Directory to `web-app`**:
   - Vercel will re-scan the folder
   - **Framework Preset should change to "Next.js"** automatically
   - If it doesn't, manually select "Next.js" from the dropdown

5. **Add Environment Variables** (before deploying)
   - Click **"Environment Variables"** section
   - Add all variables from `VERCEL_ENV_VARIABLES.md`

6. **Deploy**
   - Click **"Deploy"**

### Option 2: If Already Imported (Fix Existing Project)

1. **Go to Project Settings**
   - Open your project in Vercel
   - Click **Settings** tab
   - Click **General** in left sidebar

2. **Set Root Directory**
   - Find **"Root Directory"** section
   - Click **"Edit"**
   - Type: `web-app`
   - Click **"Save"**

3. **Update Framework Preset**
   - Scroll to **"Framework Preset"** section
   - Click **"Edit"**
   - Select **"Next.js"** from dropdown
   - Click **"Save"**

4. **Verify Build Settings**
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

5. **Redeploy**
   - Go to **Deployments** tab
   - Click **"Redeploy"** on latest deployment

## What Should Happen

After setting Root Directory to `web-app`:

✅ Framework Preset should change to **"Next.js"**  
✅ Build Command should be: `npm run build`  
✅ Output Directory should be: `.next`  
✅ Build should take 1-5 minutes (not 4 seconds)  
✅ App should work correctly

## Troubleshooting

**If Framework Preset still shows "Others":**
1. Make sure Root Directory is set to `web-app` (not `/web-app` or `./web-app`)
2. Make sure `web-app/package.json` exists in your repo
3. Make sure `web-app/next.config.mjs` exists
4. Try deleting and re-importing the project

**If build still fails:**
1. Check build logs for errors
2. Verify all environment variables are set
3. Make sure `web-app/node_modules` is in `.gitignore` (it should be)

