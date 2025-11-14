/* eslint-disable no-console */
require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

function normalizeArabic(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ئ/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/\u0640/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchTokens(values) {
  const tokens = new Set();

  values
    .filter((value) => value != null)
    .forEach((value) => {
      const text = value.toString();
      const normalized = normalizeArabic(text);

      text
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .forEach((word) => tokens.add(word));

      normalized
        .split(/\s+/)
        .filter(Boolean)
        .forEach((word) => {
          tokens.add(word);
          const maxPrefix = Math.min(word.length, 12);
          for (let i = 2; i <= maxPrefix; i += 1) {
            tokens.add(word.slice(0, i));
          }
        });
    });

  return Array.from(tokens);
}

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : (() => {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS must point to a service account JSON file.');
      })();

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccountJson),
  });
}

async function updateMembers() {
  initializeFirebaseAdmin();
  const db = admin.firestore();

  console.log('📚 Fetching members collection...');
  const snapshot = await db.collection('members').get();
  if (snapshot.empty) {
    console.log('لا توجد سجلات لتحديثها.');
    return;
  }

  console.log(`🔄 Updating ${snapshot.size} documents...`);

  const docs = snapshot.docs;
  const batchSize = 400;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const group = docs.slice(i, i + batchSize);

    group.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const mobiles = Array.from(
        new Set([
          data.contact?.mobile,
          data.contact?.mobileSecondary,
          ...(data.contact?.mobiles ?? []),
        ].filter(Boolean)),
      );

      const searchTokens = buildSearchTokens([
        data.fullName,
        data.membershipId,
        data.address,
        ...mobiles,
      ]);

      batch.update(docSnapshot.ref, {
        fullNameNormalized: normalizeArabic(data.fullName ?? ''),
        'contact.mobiles': mobiles,
        searchTokens,
      });

      const searchRef = db.collection('memberSearch').doc(docSnapshot.id);
      batch.set(
        searchRef,
        {
          memberId: docSnapshot.id,
          fullName: data.fullName ?? '',
          fullNameNormalized: normalizeArabic(data.fullName ?? ''),
          membershipId: data.membershipId ?? null,
          address: data.address ?? null,
          mobiles,
          landLine: data.contact?.landLine ?? null,
          status: data.status ?? 'chance',
          electionDayStatus: data.electionDayStatus ?? 'pending',
          statusScopes: Array.isArray(data.statusScopes)
            ? data.statusScopes
            : [
                {
                  scopeType: 'global',
                  scopeId: null,
                  status: data.status ?? 'chance',
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedBy: 'update-member-search-tokens',
                  displayName: 'عام',
                },
              ],
          assignments: data.assignments ?? {},
          meta: data.meta ?? {},
          tokens: searchTokens,
        },
        { merge: true },
      );
    });

    await batch.commit();
    console.log(`✅ Updated ${group.length} documents...`);
  }

  console.log('🎉 Finished updating member search index.');
}

updateMembers().catch((error) => {
  console.error('Failed to update members:', error);
  process.exit(1);
});
