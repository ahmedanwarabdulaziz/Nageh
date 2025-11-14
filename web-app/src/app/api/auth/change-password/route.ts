import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { authenticateRequest, ForbiddenError, UnauthorizedError } from '@/lib/auth/server';

type ChangePasswordPayload = {
  newPassword?: string;
};

function validatePassword(password: string) {
  if (password === '123456') {
    return 'يجب اختيار كلمة مرور مختلفة عن الكلمة الافتراضية';
  }
  if (password.length < 8) {
    return 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل';
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, ['teamHead', 'teamLeader']);
    const { newPassword } = (await request.json()) as ChangePasswordPayload;
    const sanitized = newPassword?.trim() ?? '';

    if (!sanitized) {
      return NextResponse.json({ error: 'newPassword is required' }, { status: 400 });
    }

    const validationError = validatePassword(sanitized);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (!context.profile.mustChangePassword) {
      return NextResponse.json({ error: 'لا توجد حاجة لتغيير كلمة المرور' }, { status: 400 });
    }

    await adminAuth.updateUser(context.uid, {
      password: sanitized,
    });

    const now = FieldValue.serverTimestamp();

    await adminDb
      .collection('userProfiles')
      .doc(context.uid)
      .set(
        {
          mustChangePassword: false,
          updatedAt: now,
          lastPasswordChangeAt: now,
        },
        { merge: true },
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Failed to change password', error);
    return NextResponse.json({ error: 'تعذر تحديث كلمة المرور' }, { status: 500 });
  }
}



