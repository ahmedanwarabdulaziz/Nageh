import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { authenticateRequest, ForbiddenError, UnauthorizedError } from '@/lib/auth/server';

const DEFAULT_PASSWORD = '123456';

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request, ['superAdmin', 'admin']);

    const { displayName, email, phone } = (await request.json()) as {
      displayName?: string;
      email?: string;
      phone?: string;
    };

    const normalizedDisplayName = displayName?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedDisplayName) {
      return NextResponse.json({ error: 'displayName is required' }, { status: 400 });
    }

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const userRecord = await adminAuth.createUser({
      email: normalizedEmail,
      password: DEFAULT_PASSWORD,
      displayName: normalizedDisplayName,
      disabled: false,
      emailVerified: false,
    });

    await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'teamHead' });

    const now = FieldValue.serverTimestamp();
    const headerRef = adminDb.collection('teamHeaders').doc();

    await headerRef.set({
      displayName: normalizedDisplayName,
      email: normalizedEmail,
      phone: phone?.trim() ?? null,
      userId: userRecord.uid,
      createdAt: now,
      updatedAt: now,
    });

    await adminDb
      .collection('userProfiles')
      .doc(userRecord.uid)
      .set(
        {
          role: 'teamHead',
          displayName: normalizedDisplayName,
          email: normalizedEmail,
          phone: phone?.trim() ?? null,
          headId: headerRef.id,
          mustChangePassword: true,
          superAdminManaged: true,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );

    return NextResponse.json({
      id: headerRef.id,
      displayName: normalizedDisplayName,
      email: normalizedEmail,
      phone: phone?.trim() ?? null,
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
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    console.error('Failed to create team head', error);
    return NextResponse.json({ error: 'Failed to create team head' }, { status: 500 });
  }
}



