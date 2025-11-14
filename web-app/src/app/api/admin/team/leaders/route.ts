import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { authenticateRequest, ForbiddenError, UnauthorizedError } from '@/lib/auth/server';

const DEFAULT_PASSWORD = '123456';

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request, ['superAdmin', 'admin']);

    const { displayName, email, phone, headId } = (await request.json()) as {
      displayName?: string;
      email?: string;
      phone?: string;
      headId?: string;
    };

    const normalizedDisplayName = displayName?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedHeadId = headId?.trim();

    if (!normalizedDisplayName) {
      return NextResponse.json({ error: 'displayName is required' }, { status: 400 });
    }
    if (!normalizedEmail) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }
    if (!normalizedHeadId) {
      return NextResponse.json({ error: 'headId is required' }, { status: 400 });
    }

    const headSnapshot = await adminDb.collection('teamHeaders').doc(normalizedHeadId).get();
    if (!headSnapshot.exists) {
      return NextResponse.json({ error: 'Head not found' }, { status: 404 });
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
      headId: normalizedHeadId,
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
          headId: normalizedHeadId,
          leaderIds: FieldValue.arrayUnion(leaderRef.id),
          mustChangePassword: true,
          superAdminManaged: true,
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
      headId: normalizedHeadId,
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
    console.error('Failed to create team leader', error);
    return NextResponse.json({ error: 'Failed to create team leader' }, { status: 500 });
  }
}


