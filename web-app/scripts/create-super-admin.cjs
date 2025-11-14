/* eslint-disable no-console */
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const admin = require('firebase-admin');

function initializeAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  let credential;

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const buffer = readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8');
    credential = JSON.parse(buffer);
  } else {
    const localPath = join(__dirname, '..', '..', 'nageh-b040e-firebase-adminsdk-fbsvc-b767e8dcc3.json');
    const buffer = readFileSync(localPath, 'utf8');
    credential = JSON.parse(buffer);
  }

  return admin.initializeApp({
    credential: admin.credential.cert(credential),
  });
}

async function ensureSuperAdmin() {
  initializeAdmin();
  const auth = admin.auth();
  const db = admin.firestore();

  const email = 'x@x.com';
  const password = 'Aa2025';
  const displayName = 'المشرف الأعلى';

  let userRecord;

  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`User ${email} already exists. Updating password and profile...`);
    await auth.updateUser(userRecord.uid, {
      password,
      displayName,
      disabled: false,
    });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`User ${email} not found. Creating new super admin user...`);
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: false,
        disabled: false,
      });
    } else {
      throw error;
    }
  }

  await db
    .collection('userProfiles')
    .doc(userRecord.uid)
    .set(
      {
        role: 'superAdmin',
        displayName,
        email,
        superAdminManaged: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  // Optional: set custom claims if we decide to leverage them later
  await auth.setCustomUserClaims(userRecord.uid, { role: 'superAdmin' });

  console.log('Super admin user is ready:', {
    email,
    uid: userRecord.uid,
  });
}

ensureSuperAdmin()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to ensure super admin user:', error);
    process.exit(1);
  });



