# Vercel Deployment Setup

## Important Configuration

1. **Root Directory**: The Next.js app is in the `web-app/` folder. In Vercel dashboard:
   - Go to Project Settings → General
   - Set "Root Directory" to `web-app`

2. **Environment Variables**: Add these in Vercel dashboard (Settings → Environment Variables):
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCJupHsXA9CFnEvi_cpQNIST4prNBMpw6o
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nageh-b040e.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=nageh-b040e
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nageh-b040e.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=296272784816
   NEXT_PUBLIC_FIREBASE_APP_ID=1:296272784816:web:59d85458fa418a9b433a75
   
   FIREBASE_ADMIN_PROJECT_ID=nageh-b040e
   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@nageh-b040e.iam.gserviceaccount.com
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

3. **Build Settings**: 
   - Framework Preset: Next.js
   - Build Command: `npm run build` (runs from web-app directory)
   - Output Directory: `.next`
   - Install Command: `npm install`

## Troubleshooting 404 Errors

If you're getting 404 errors:
1. Verify the Root Directory is set to `web-app` in Vercel settings
2. Check that all environment variables are set correctly
3. Ensure the build completes successfully (check build logs)
4. Verify API routes are accessible (they should be at `/api/*`)

## Important: Root Directory Must Be Set in Vercel Dashboard

The `rootDirectory` property is NOT valid in `vercel.json`. You MUST manually set the Root Directory in the Vercel dashboard:

1. Go to your project in Vercel
2. Navigate to Settings → General
3. Scroll to "Root Directory"
4. Click "Edit" and set it to `web-app`
5. Save the changes

This is the ONLY way to tell Vercel where your Next.js app is located when it's in a subdirectory.

