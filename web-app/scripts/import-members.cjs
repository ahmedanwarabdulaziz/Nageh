/* eslint-disable no-console */
require('dotenv').config({ path: '.env.local' });

const path = require('node:path');
const admin = require('firebase-admin');
const ExcelJS = require('exceljs');

const DEFAULT_EXCEL_PATH = path.resolve(__dirname, '..', '..', 'ASC .xlsx');
const DEFAULT_SHEET_INDEX = 0;
const BATCH_SIZE = 400;

const HEADER_ALIASES = {
  fullName: ['name', 'fullname', 'full name', 'الاسم', 'اسم', 'اسم العضو'],
  address: ['address', 'العنوان', 'عنوان', 'محل الاقامة'],
  landLine: [
    'landline',
    'land line',
    'الهاتف الارضي',
    'التليفون الارضى',
    'تليفون',
    'تليفونارضى',
    'تليفون المنزل',
  ],
  mobile: ['mobile', 'phone', 'الهاتف المحمول', 'الموبايل', 'الجوال', 'رقمالهاتف', 'المحمول'],
  membershipId: ['membership', 'membershipid', 'رقمالعضوية', 'id', 'memberid', 'عضوية', 'رقم العضوية'],
};

const NORMALIZED_ALIASES = Object.fromEntries(
  Object.entries(HEADER_ALIASES).map(([key, aliases]) => [
    key,
    aliases.map((alias) => normalizeHeader(alias)),
  ]),
);

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

function toPlainText(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText.map((segment) => segment.text ?? '').join('');
    }
    if (typeof value.text === 'string') {
      return value.text;
    }
  }
  return value.toString();
}

function normalizeHeader(value) {
  const text = toPlainText(value).trim().toLowerCase();
  return text.replace(/\s+/g, '').replace(/[_\-]+/g, '');
}

function stripPhone(value) {
  if (!value) return undefined;
  const raw = value.toString().replace(/[^\d+]+/g, '');
  if (!raw) return undefined;

  let digits = raw;

  if (digits.startsWith('+20') && digits.length >= 13) {
    digits = `0${digits.slice(3)}`;
  } else if (digits.startsWith('20') && digits.length >= 11) {
    digits = `0${digits.slice(2)}`;
  } else if (!digits.startsWith('0') && digits.length >= 9 && digits.length <= 11) {
    digits = `0${digits}`;
  }

  return digits;
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

async function resolveSheet(workbook, sheetSpecifier) {
  if (!sheetSpecifier) {
    return workbook.worksheets[DEFAULT_SHEET_INDEX];
  }

  const index = Number.parseInt(sheetSpecifier, 10);
  if (!Number.isNaN(index)) {
    return workbook.worksheets[index];
  }

  return workbook.getWorksheet(sheetSpecifier);
}

function mapHeaders(headerRow) {
  const headerMap = {};

  headerRow.eachCell((cell, colNumber) => {
    const value = cell.value;
    if (value == null || value === '') return;
    const normalized = normalizeHeader(value);
    if (!normalized) return;

    for (const [key, aliases] of Object.entries(NORMALIZED_ALIASES)) {
      if (aliases.includes(normalized)) {
        headerMap[key] = colNumber;
        break;
      }
    }
  });

  const missing = Object.keys(HEADER_ALIASES).filter((field) => headerMap[field] == null);
  if (missing.length > 0) {
    console.warn('⚠️  لم يتم العثور على الأعمدة التالية تلقائياً:', missing.join(', '));
    console.warn('سيتم استيراد الحقول المتاحة فقط. يمكنك تعديل HEADER_ALIASES لتطابق عناوين الأعمدة.');
  }

  return headerMap;
}

function getHeaderRow(worksheet) {
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    let hasValue = false;
    row.eachCell((cell) => {
      if (cell.value != null && cell.value !== '') {
        hasValue = true;
      }
    });

    if (hasValue) {
      return { headerRow: row, headerRowNumber: rowNumber };
    }
  }

  throw new Error('تعذر العثور على صف العناوين في الملف.');
}

function extractCell(row, columnIndex) {
  if (columnIndex == null) return undefined;
  const raw = row.getCell(columnIndex).value;
  if (raw == null) return undefined;

  const text = toPlainText(raw).trim();
  return text.length > 0 ? text : undefined;
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function importMembers({ excelPath, sheetName }) {
  initializeFirebaseAdmin();
  const db = admin.firestore();

  console.log(`🧾 قراءة الملف: ${excelPath}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = await resolveSheet(workbook, sheetName);

  if (!worksheet) {
    throw new Error('تعذر العثور على ورقة العمل المطلوبة داخل ملف Excel.');
  }

  console.log(`📄 استخدام ورقة العمل: ${worksheet.name}`);

  const { headerRow, headerRowNumber } = getHeaderRow(worksheet);
  const headerMap = mapHeaders(headerRow);
  console.log('🪪 رؤوس الأعمدة المتاحة:', headerRow.values.slice(1).map((value) => (value ?? '').toString().trim()));

  const members = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;

    const fullName = extractCell(row, headerMap.fullName);
    if (!fullName) {
      return;
    }

    const membershipId = extractCell(row, headerMap.membershipId);
    const mobile = stripPhone(extractCell(row, headerMap.mobile));
    const landLine = stripPhone(extractCell(row, headerMap.landLine));
    const address = extractCell(row, headerMap.address);

    members.push({
      fullName,
      membershipId,
      mobile,
      landLine,
      address,
    });
  });

  if (members.length === 0) {
    console.log('لم يتم العثور على سجلات صالحة للاستيراد.');
    return;
  }

  console.log(`📦 سيتم استيراد ${members.length} عضواً إلى Firestore.`);

  const memberChunks = chunkArray(members, BATCH_SIZE);
  const collectionRef = db.collection('members');
  let processed = 0;

  for (const chunk of memberChunks) {
    const batch = db.batch();

    chunk.forEach((member) => {
      const { membershipId, ...rest } = member;
      const docRef = membershipId
        ? collectionRef.doc(membershipId.toString())
        : collectionRef.doc();

      const mobilesArray = Array.from(new Set([rest.mobile].filter(Boolean)));

      const searchTokens = buildSearchTokens([
        rest.fullName,
        membershipId,
        rest.mobile,
        rest.landLine,
        rest.address,
      ]);

      batch.set(
        docRef,
        {
          fullName: rest.fullName,
          fullNameNormalized: normalizeArabic(rest.fullName),
          membershipId: membershipId?.toString() ?? null,
          address: rest.address ?? null,
          contact: {
            mobile: rest.mobile ?? null,
            landLine: rest.landLine ?? null,
            mobiles: mobilesArray,
          },
          status: 'chance',
          electionDayStatus: 'pending',
          statusScopes: [
            {
              scopeType: 'global',
              scopeId: null,
              status: 'chance',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedBy: 'import-script',
              displayName: 'عام',
            },
          ],
          assignments: {
            headId: null,
            leaderId: null,
            groupIds: [],
          },
          analytics: {
            lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp(),
            commitmentScore: null,
          },
          meta: {
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'import-script',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'import-script',
          },
          searchTokens,
        },
        { merge: true },
      );

      const searchRef = db.collection('memberSearch').doc(docRef.id);
      batch.set(
        searchRef,
        {
          memberId: docRef.id,
          fullName: rest.fullName,
          fullNameNormalized: normalizeArabic(rest.fullName),
          membershipId: membershipId?.toString() ?? null,
          address: rest.address ?? null,
          mobiles: mobilesArray,
          landLine: rest.landLine ?? null,
          status: 'chance',
          electionDayStatus: 'pending',
          statusScopes: [
            {
              scopeType: 'global',
              scopeId: null,
              status: 'chance',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedBy: 'import-script',
            },
          ],
          assignments: {
            headId: null,
            leaderId: null,
            groupIds: [],
          },
          meta: {
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'import-script',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'import-script',
          },
          tokens: searchTokens,
        },
        { merge: true },
      );

      const historyRef = docRef.collection('statusHistory').doc();
      batch.set(historyRef, {
        status: 'chance',
        note: 'Imported from Excel source data.',
        updatedBy: 'import-script',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    processed += chunk.length;
    console.log(`✅ تم استيراد ${processed}/${members.length} عضوًا...`);
  }

  console.log('🎉 اكتمل استيراد بيانات الأعضاء بنجاح.');
}

const excelPathArg = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_EXCEL_PATH;
const sheetArg = process.argv[3];

importMembers({ excelPath: excelPathArg, sheetName: sheetArg }).catch((error) => {
  console.error('فشل استيراد بيانات الأعضاء:', error);
  process.exit(1);
});


