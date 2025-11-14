# Complete List of Environment Variables for Vercel

## ✅ REQUIRED Variables (9 total)

You **MUST** add all 9 of these variables to Vercel for the app to work:

### 🔵 Client-Side Variables (6) - Required for Firebase Client

These are used by the browser/client-side code. **All must start with `NEXT_PUBLIC_`**:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCJupHsXA9CFnEvi_cpQNIST4prNBMpw6o
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nageh-b040e.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nageh-b040e
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nageh-b040e.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=296272784816
NEXT_PUBLIC_FIREBASE_APP_ID=1:296272784816:web:59d85458fa418a9b433a75
```

### 🔴 Server-Side Variables (3) - Required for Firebase Admin

These are used by API routes and server-side code:

```
FIREBASE_ADMIN_PROJECT_ID=nageh-b040e
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@nageh-b040e.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCwccxvi73DgzJg\nM3NvXN/lhdApfYLw+gC9+z4RUmUwZlLrQadV0pNZ/kEwITDViNiMlA4b5eJDvtJD\n/IYOa3BIhOZCqGUxf3PxsNfoXzAjIW3rJBgJm2AGpjcStx/r06m/C/Z6gv+wPK7T\n66P7UVMx+ewrwVxjJkERQqq78JyE3GzcJG6wkb5QEnpRiGaQpNvUDHgMRzK0hJgP\ngwJ7WIFcAPjGLH3czIOg1whWFDkwJ+wdNMz9hWhioUxd5OuSWWissSZXC8ETmE34\n09PjbylypqSqhQb6XsK3l4hlzQTky5q4pEWsfMY7CAKN/+d1pvhn96cmcXX550I1\nzrkdeU0NAgMBAAECggEAOcJO33b5vD4+5+H/2EUpX/vBbEuTaSoVwxszMr1rtX/R\nhgSccAo6RTvngAdlcolVBhPTWIuU2YNmVm4cPi0qePrUW56/XYgw3r36t60tV1qy\nnkZW/hIYSaTwo1ZCA1NrHkieu3UVmU4MFwBs0jDJkLMU/i/Se/yCUVGnDVXTDuSE\nGBP7pqOFwbtXhZIa4T+pkYk7SGdj97LKABT8sG0w9muh2Ikx1gH3ZgeKLXlM6lRg\nWBUg47CtMDbz+WCma7cOqos9Ld9jVHv9zze8N+qS4PP5l5O8/LACsGBYmAxA5nPk\nDc6clBSlTkvmIsUY/0g37vvFc/C3wtPX+be7Ksjw6wKBgQDc6lIaVyraMiV9WCOI\nykz4nQtSHFj0TpxdjYzvXica12djWjnXKLjfX+iKBiCSY//UO+ac4pd24mfaFEsC\nb0SYSDLDH7bK3OWHFo8DYbg/oft+qyb11/WAyuMLcyCPHsIZPzJJivbS7/R55pq/\nLwAxJ5V1EIMuzT3qtJ1bavBDiwKBgQDMd3GqTLQPyCnj3NlqFpKooOR2xK8lC7pf\n29tlS9DXeO205fpeBLcCLr8tbP8VoK0Qbz2BlyMU3W+Hj0mFnP4sSSUXhOl+IS4A\n1TtRFiw6HEnRcPIasw3v+LucwAVUgKT+7u74YbsbNxAFOWPV58iEBRAxvjkHT0Vy\n6FZdb0fkxwKBgEngIiyk0bO96UONYfSwkiThf5Op3yVz1F6Eo4i4l6MmPXDAD2+g\nMpKgZAckHWhXAIpcrbXxIG2lMM2A08SwqOOz4SXXSS11yVvvc0vSNecxqASn/5Ne\n8L5tGpgNm+nAg3Al7g8h5YCMtdi+ASnF8e5+KkDHkNbp07bVR3n2vPoZAoGAP30/\nYEAdEWF4EHc9U4Ha3F3JU0/Tis9PegCM6bFXEfFM7oUS7yrLoPPfDT3xH0gbNSU1\nlg3WKN5xiUhm7gRHsHyt9dWhozauUDfmCVG3PfwWt+A4bS34P/GeYBgID6s6kKak\nsZ+3N8YrRVQCuiMU0lm4I5oLn0dwKzQVzUGGs3UCgYBkEy6AEs+U83G68yHVZPi/\neahk1Wy2jzK8s3YwR+OTv5z/xhrcmZrqJoCh9O6xNsefXY09ls/sU06gCs01jBtP\nGA0GXO+YJvCevP8yiUIDfnCa+jFOM9aQ8g2I7YoqolbgYO4XU0rafb6m53S8AOSx\n/Ley4gxbmRNaGvqNGu7Jrg==\n-----END PRIVATE KEY-----\n
```

**Important for FIREBASE_ADMIN_PRIVATE_KEY:**
- Copy the ENTIRE value above (includes `\n` characters)
- Paste it EXACTLY as shown in Vercel
- The code automatically converts `\n` to newlines

## ❌ Optional Variables (Not Required)

These are NOT needed for the app to work:

- `FIREBASE_ADMIN_CLIENT_ID` - Optional
- `FIREBASE_ADMIN_CLIENT_CERT_URL` - Optional  
- `GOOGLE_APPLICATION_CREDENTIALS` - Only needed if using file-based credentials (not used in this app)

## ✅ Automatically Set by Vercel (Don't Add These)

These are automatically set by Vercel - you don't need to add them:

- `VERCEL_ENV` - Automatically set to "production", "preview", or "development"
- `NEXT_PHASE` - Automatically set by Next.js during build
- `NODE_ENV` - Automatically set to "production" in Vercel

## 📋 Quick Checklist

Make sure you have added all 9 required variables:

- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] `FIREBASE_ADMIN_PROJECT_ID`
- [ ] `FIREBASE_ADMIN_CLIENT_EMAIL`
- [ ] `FIREBASE_ADMIN_PRIVATE_KEY`

## 🎯 Summary

**Total Required: 9 variables**
- 6 client-side (NEXT_PUBLIC_*)
- 3 server-side (FIREBASE_ADMIN_*)

**Total Optional: 0 variables** (all optional ones are not needed)

That's it! These 9 variables are all you need.

