/* eslint-disable no-console */
require('dotenv').config({ path: '.env.local' });

const { GoogleAuth } = require('google-auth-library');

async function getAccessToken(scopes) {
  const auth = new GoogleAuth({
    scopes,
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? undefined
      : undefined,
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse || !tokenResponse.token) {
    throw new Error('Failed to acquire access token');
  }

  return tokenResponse.token;
}

function loadServiceAccount() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }
  if (process.env.FIREBASE_RULES_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_RULES_SERVICE_ACCOUNT_JSON);
  }
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_RULES_SERVICE_ACCOUNT_JSON must be set.');
}

async function createIndex({ projectId, collectionId, fields }) {
  const serviceAccount = loadServiceAccount();
  const auth = new GoogleAuth({
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key,
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/datastore'],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse || !tokenResponse.token) {
    throw new Error('Failed to obtain access token for index creation.');
  }

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/${collectionId}/indexes`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenResponse.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields,
        queryScope: 'COLLECTION',
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 409 && text.includes('ALREADY_EXISTS')) {
      console.log(`ℹ️  Index already exists for ${collectionId}:`, text);
      return;
    }
    throw new Error(`Failed to create index (${collectionId}): ${response.status} ${response.statusText} ${text}`);
  }

  const data = await response.json();
  console.log(`✅ Index creation started for ${collectionId}: ${data.name}`);
}

async function main() {
  console.log('🚀 Starting Firestore index creation...');
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!projectId) {
    throw new Error('FIREBASE_ADMIN_PROJECT_ID is not set.');
  }

  const indexDefinitions = [
    {
      collectionId: 'memberSearch',
      fields: [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'tokens', arrayConfig: 'CONTAINS' },
        { fieldPath: 'fullNameNormalized', order: 'ASCENDING' },
      ],
    },
    {
      collectionId: 'memberSearch',
      fields: [
        { fieldPath: 'tokens', arrayConfig: 'CONTAINS' },
      ],
    },
    {
      collectionId: 'memberSearch',
      fields: [
        { fieldPath: 'mobiles', arrayConfig: 'CONTAINS' },
      ],
    },
  ];

  for (const definition of indexDefinitions) {
    try {
      await createIndex({ projectId, ...definition });
    } catch (error) {
      console.error('Failed to create index:', error);
    }
  }
}

main()
  .then(() => {
    console.log('📊 Index creation requests submitted.');
  })
  .catch((error) => {
    console.error('Failed to create indexes:', error);
    process.exit(1);
  });


