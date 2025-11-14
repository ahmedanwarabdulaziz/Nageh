import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { authenticateRequest, ForbiddenError, UnauthorizedError } from '@/lib/auth/server';
import { adminDb } from '@/lib/firebase/admin';

function serializeTimestamp(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request, ['superAdmin', 'admin']);

    const [headersSnapshot, leadersSnapshot] = await Promise.all([
      adminDb.collection('teamHeaders').orderBy('displayName').get(),
      adminDb.collection('teamLeaders').orderBy('displayName').get(),
    ]);

    const leadersByHead = new Map<
      string,
      Array<{
        id: string;
        displayName: string;
        email: string;
        phone: string | null;
        userId: string;
        mustChangePassword: boolean;
        createdAt: string | null;
        updatedAt: string | null;
      }>
    >();

    leadersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const headId = String(data.headId ?? '');
      if (!headId) {
        return;
      }
      const bucket = leadersByHead.get(headId) ?? [];
      bucket.push({
        id: doc.id,
        displayName: String(data.displayName ?? ''),
        email: String(data.email ?? ''),
        phone: data.phone ? String(data.phone) : null,
        userId: String(data.userId ?? ''),
        mustChangePassword: Boolean(data.mustChangePassword),
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      });
      leadersByHead.set(headId, bucket);
    });

    const headers = headersSnapshot.docs.map((doc) => {
      const data = doc.data();
      const headLeaders = leadersByHead.get(doc.id) ?? [];
      return {
        id: doc.id,
        displayName: String(data.displayName ?? ''),
        email: String(data.email ?? ''),
        phone: data.phone ? String(data.phone) : null,
        userId: String(data.userId ?? ''),
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
        leaders: headLeaders,
      };
    });

    return NextResponse.json({ headers });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Failed to load team structure', error);
    return NextResponse.json({ error: 'Failed to load team structure' }, { status: 500 });
  }
}


