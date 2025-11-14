/* eslint-disable no-console */
require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

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

async function clearCollection(collectionName, batchSize = 400) {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  const collectionRef = db.collection(collectionName);

  const snapshot = await collectionRef.select().get();
  if (snapshot.empty) {
    console.log(`😊 لا توجد مستندات في مجموعة ${collectionName}. لا حاجة للحذف.`);
    return;
  }

  console.log(`🧹 سيتم حذف ${snapshot.size} مستندًا من مجموعة ${collectionName}.`);

  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    docs.slice(i, i + batchSize).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`✅ تم حذف ${Math.min(i + batchSize, docs.length)}/${docs.length}`);
  }

  console.log('🎉 اكتمل حذف جميع المستندات.');
}

const collectionName = process.argv[2] || 'members';

clearCollection(collectionName).catch((error) => {
  console.error('فشل حذف المستندات:', error);
  process.exit(1);
});


