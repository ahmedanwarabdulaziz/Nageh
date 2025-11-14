/* eslint-disable no-console */
require('dotenv').config({ path: '.env.local' });
const { readFileSync } = require('node:fs');
const { GoogleAuth } = require('google-auth-library');

async function loadServiceAccount() {
  if (process.env.FIREBASE_RULES_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_RULES_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const buffer = readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8');
    return JSON.parse(buffer);
  }

  throw new Error('Service account credentials not configured.');
}

async function getAccessToken(scopes, serviceAccount) {
  const auth = new GoogleAuth({
    scopes,
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key,
    },
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse || !tokenResponse.token) {
    throw new Error('Failed to obtain access token');
  }

  return tokenResponse.token;
}

function buildRulesContent() {
  return `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userProfiles/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.token.role in ['superAdmin', 'admin'];
    }

    match /members/{memberId} {
      allow read: if request.auth != null && request.auth.token.role in ['superAdmin', 'admin', 'teamHead', 'teamLeader', 'viewer'];
      allow create, update, delete: if request.auth != null && request.auth.token.role in ['superAdmin', 'admin', 'teamHead', 'teamLeader'];

      match /statusHistory/{historyId} {
        allow read: if request.auth != null && request.auth.token.role in ['superAdmin', 'admin', 'teamHead', 'teamLeader'];
        allow create: if request.auth != null && request.auth.token.role in ['superAdmin', 'admin', 'teamHead', 'teamLeader'];
        allow update, delete: if request.auth != null && request.auth.token.role in ['superAdmin', 'admin'];
      }

      match /notes/{noteId} {
        allow read: if request.auth != null && request.auth.token.role in ['superAdmin', 'admin', 'teamHead', 'teamLeader'];
        allow create: if request.auth != null && request.auth.token.role in ['superAdmin', 'admin', 'teamHead', 'teamLeader'];
        allow update, delete: if request.auth != null && request.auth.token.role in ['superAdmin', 'admin'];
      }
    }

    match /memberSearch/{searchId} {
      allow read: if request.auth != null && request.auth.token.role in ['superAdmin', 'admin', 'teamHead', 'teamLeader', 'viewer'];
      allow create, update, delete: if request.auth != null && request.auth.token.role in ['superAdmin', 'admin', 'teamHead', 'teamLeader'];
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`.trim();
}

async function uploadRules({ projectId, accessToken }) {
  const files = [
    {
      name: 'firestore.rules',
      content: buildRulesContent(),
    },
  ];

  const response = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: {
          files,
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create ruleset: ${response.status} ${response.statusText} ${text}`);
  }

  return response.json();
}

async function updateRelease({ projectId, rulesetName, accessToken }) {
  const response = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore?updateMask=rulesetName`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        release: {
          name: `projects/${projectId}/releases/cloud.firestore`,
          rulesetName,
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update release: ${response.status} ${response.statusText} ${text}`);
  }

  return response.json();
}

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!projectId) {
    throw new Error('FIREBASE_ADMIN_PROJECT_ID is not set.');
  }

  const serviceAccount = await loadServiceAccount();

  const scopes = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/firebase',
  ];

  const accessToken = await getAccessToken(scopes, serviceAccount);
  console.log('Access token acquired.');

  const ruleset = await uploadRules({ projectId, accessToken });
  console.log('Created ruleset:', ruleset.name);

  await updateRelease({ projectId, rulesetName: ruleset.name, accessToken });
  console.log('Updated cloud.firestore release to use the new ruleset.');
}

main()
  .then(() => {
    console.log('Firestore rules updated successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to update Firestore rules:', error);
    process.exit(1);
  });


