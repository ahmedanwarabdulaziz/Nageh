# Fix Vercel Import - Root Directory Shows as "./"

## Problem
When importing the project, Vercel shows:
- Root Directory: `./` (can't change it)
- Framework Preset: "Other" (can't change it)

## Solution: Import First, Then Fix Settings

### Step 1: Import the Project (Even with Wrong Settings)

1. **Import from GitHub**
   - Go to Vercel Dashboard
   - Click "Add New..." → "Project"
   - Select repository: `ahmedanwarabdulaziz/Nageh`
   - Click "Import"
   - **Don't worry about the settings yet** - just click "Deploy" or "Skip" if it asks

### Step 2: Immediately Fix Settings (Before First Deploy Completes)

**Right after importing, go to Settings:**

1. **Open Project Settings**
   - Click on your project name (top left)
   - Click **"Settings"** tab
   - Click **"General"** in left sidebar

2. **Change Root Directory**
   - Find **"Root Directory"** section
   - Click **"Edit"** button
   - **Delete** the `./` value
   - Type: `web-app` (exactly, no slashes, no dots)
   - Click **"Save"**

3. **Change Framework Preset**
   - Scroll to **"Framework Preset"** section
   - Click **"Edit"** button
   - Select **"Next.js"** from the dropdown
   - Click **"Save"**

4. **Verify Build Settings** (should auto-update after Root Directory change)
   - **Build Command**: Should be `npm run build`
   - **Output Directory**: Should be `.next`
   - **Install Command**: Should be `npm install`
   - If not correct, click "Edit" and fix them

### Step 3: Cancel/Stop the First Deployment (If Still Running)

1. Go to **"Deployments"** tab
2. Find the deployment that's running (or just completed)
3. If it's still running, click the three dots (⋯) → **"Cancel"**
4. If it completed, that's OK - we'll redeploy

### Step 4: Add Environment Variables

1. Go to **Settings** → **Environment Variables**
2. Add all 9 variables from `VERCEL_ENV_VARIABLES.md`
3. Make sure to select **Production**, **Preview**, and **Development** for each

### Step 5: Redeploy

1. Go to **"Deployments"** tab
2. Click **"Redeploy"** on the latest deployment
3. OR click **"Deployments"** → **"..."** → **"Redeploy"**

## Alternative: Delete and Re-import

If the above doesn't work:

1. **Delete the Project**
   - Go to Settings → General
   - Scroll to bottom
   - Click "Delete Project"
   - Confirm deletion

2. **Re-import with Manual Configuration**
   - Click "Add New..." → "Project"
   - Select repository
   - **Before clicking Import**, look for "Configure Project" or "Advanced" options
   - Try to set Root Directory there
   - If not available, import anyway and fix in Settings immediately

## What You Should See After Fixing

✅ Root Directory: `web-app`  
✅ Framework Preset: `Next.js`  
✅ Build Command: `npm run build`  
✅ Output Directory: `.next`  
✅ Build time: 1-5 minutes (not 4 seconds)

## Troubleshooting

**If Root Directory field is grayed out or can't be edited:**
- Make sure you're in the project's Settings (not during import)
- Try refreshing the page
- Make sure you have admin/owner access to the project

**If Framework Preset dropdown is empty:**
- Set Root Directory first, then refresh the page
- Framework Preset should become editable

**If settings don't save:**
- Check browser console for errors
- Try a different browser
- Make sure you have proper permissions

