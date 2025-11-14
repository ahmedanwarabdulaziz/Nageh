import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { authenticateRequest, ForbiddenError, UnauthorizedError } from '@/lib/auth/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

const DEFAULT_PASSWORD = '123456';

function serializeTimestamp(value: unknown) {
  if (value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, ['teamHead']);
    const headId = context.profile.headId;

    if (!headId) {
      return NextResponse.json({ error: 'لم يتم ربط حسابك برئيس فريق' }, { status: 400 });
    }

    const snapshot = await adminDb.collection('teamLeaders').where('headId', '==', headId).get();

    const leaders = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        displayName: String(data.displayName ?? ''),
        email: String(data.email ?? ''),
        phone: data.phone ? String(data.phone) : null,
        mustChangePassword: Boolean(data.mustChangePassword),
        userId: String(data.userId ?? ''),
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      };
    }).sort((a, b) => a.displayName.localeCompare(b.displayName, 'ar', { sensitivity: 'base' }));

    return NextResponse.json({ leaders });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Failed to load leaders for head', error);
    return NextResponse.json({ error: 'تعذر تحميل القادة' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, ['teamHead']);
    const headId = context.profile.headId;

    if (!headId) {
      return NextResponse.json({ error: 'لم يتم ربط حسابك برئيس فريق' }, { status: 400 });
    }

    const { displayName, email, phone } = (await request.json()) as {
      displayName?: string;
      email?: string;
      phone?: string;
    };

    const normalizedDisplayName = displayName?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedDisplayName) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    }

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'البريد الإلكتروني مطلوب' }, { status: 400 });
    }

    const headDoc = await adminDb.collection('teamHeaders').doc(headId).get();
    if (!headDoc.exists) {
      return NextResponse.json({ error: 'تعذر تحديد حساب الرئيس' }, { status: 404 });
    }

    const userRecord = await adminAuth.createUser({
      email: normalizedEmail,
      password: DEFAULT_PASSWORD,
      displayName: normalizedDisplayName,
      disabled: false,
      emailVerified: false,
    });

    await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'teamLeader' });

    const now = FieldValue.serverTimestamp();
    const leaderRef = adminDb.collection('teamLeaders').doc();

    await leaderRef.set({
      displayName: normalizedDisplayName,
      email: normalizedEmail,
      phone: phone?.trim() ?? null,
      headId,
      userId: userRecord.uid,
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    });

    await adminDb
      .collection('userProfiles')
      .doc(userRecord.uid)
      .set(
        {
          role: 'teamLeader',
          displayName: normalizedDisplayName,
          email: normalizedEmail,
          phone: phone?.trim() ?? null,
          headId,
          leaderIds: FieldValue.arrayUnion(leaderRef.id),
          mustChangePassword: true,
          superAdminManaged: false,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );

    return NextResponse.json({
      id: leaderRef.id,
      displayName: normalizedDisplayName,
      email: normalizedEmail,
      phone: phone?.trim() ?? null,
      headId,
      userId: userRecord.uid,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if ((error as { code?: string }).code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'هذا البريد الإلكتروني مستخدم بالفعل' }, { status: 409 });
    }
    console.error('Failed to create leader for head', error);
    return NextResponse.json({ error: 'تعذر إنشاء القائد' }, { status: 500 });
  }
}


