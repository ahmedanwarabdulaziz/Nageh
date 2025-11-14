'use server';

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { authenticateRequest, ForbiddenError, UnauthorizedError } from '@/lib/auth/server';
import { adminDb } from '@/lib/firebase/admin';
import {
  type MemberCategory,
} from '@/types/member';

type UpdatePayload = {
  name?: string;
  color?: string | null;
  description?: string | null;
};

function normalizeName(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 100) {
    return trimmed.slice(0, 100);
  }
  return trimmed;
}

function normalizeColor(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const isValid = /^#[0-9A-Fa-f]{3,8}$/.test(hex);
  return isValid ? hex : undefined;
}

function normalizeDescription(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > 200 ? trimmed.slice(0, 200) : trimmed;
}

function assertScopeAccess(
  category: MemberCategory,
  context: Awaited<ReturnType<typeof authenticateRequest>>,
) {
  if (context.role === 'superAdmin' || context.role === 'admin') {
    return;
  }

  if (context.role === 'teamHead') {
    const headId = context.profile.headId;
    if (!headId || category.scopeType !== 'head' || category.scopeId !== headId) {
      throw new ForbiddenError('لا تملك صلاحية إدارة هذا التصنيف');
    }
    return;
  }

  if (context.role === 'teamLeader') {
    const leaderIds = Array.isArray(context.profile.leaderIds)
      ? context.profile.leaderIds.filter((id): id is string => Boolean(id))
      : [];
    const leaderScopeId = leaderIds[0] && leaderIds[0].length > 0 ? leaderIds[0] : context.uid;
    const headId = context.profile.headId ?? null;

    const valid =
      (category.scopeType === 'leader' && category.scopeId === leaderScopeId) ||
      (category.scopeType === 'head' && headId && category.scopeId === headId);

    if (!valid) {
      throw new ForbiddenError('لا تملك صلاحية إدارة هذا التصنيف');
    }
    return;
  }

  throw new ForbiddenError('لا تملك صلاحية إدارة هذا التصنيف');
}

async function loadCategory(categoryId: string): Promise<MemberCategory | null> {
  const doc = await adminDb.collection('memberCategories').doc(categoryId).get();
  if (!doc.exists) return null;
  const data = doc.data() as Omit<MemberCategory, 'id'>;
  return { id: doc.id, ...data };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
    const context = await authenticateRequest(request, ['superAdmin', 'admin', 'teamHead', 'teamLeader']);

    const { categoryId } = await params;
    if (!categoryId) {
      return NextResponse.json({ error: 'معرف التصنيف مطلوب' }, { status: 400 });
    }

    const exists = await loadCategory(categoryId);
    if (!exists) {
      return NextResponse.json({ error: 'التصنيف غير موجود' }, { status: 404 });
    }

    assertScopeAccess(exists, context);

    const body = (await request.json()) as UpdatePayload;
    const name = normalizeName(body.name);
    const color = normalizeColor(body.color);
    const description = normalizeDescription(body.description);

    const updates: Record<string, unknown> = {};

    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ category: exists });
    }

    updates.updatedAt = FieldValue.serverTimestamp();

    await adminDb.collection('memberCategories').doc(categoryId).set(updates, { merge: true });

    const refreshed = await loadCategory(categoryId);

    return NextResponse.json({ category: refreshed ?? { ...exists, ...updates } });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Failed to update member category', error);
    return NextResponse.json({ error: 'تعذر تحديث التصنيف' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
    const context = await authenticateRequest(request, ['superAdmin', 'admin', 'teamHead', 'teamLeader']);

    const { categoryId } = await params;
    if (!categoryId) {
      return NextResponse.json({ error: 'معرف التصنيف مطلوب' }, { status: 400 });
    }

    const exists = await loadCategory(categoryId);
    if (!exists) {
      return NextResponse.json({ error: 'التصنيف غير موجود' }, { status: 404 });
    }

    assertScopeAccess(exists, context);

    await adminDb.collection('memberCategories').doc(categoryId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Failed to delete member category', error);
    return NextResponse.json({ error: 'تعذر حذف التصنيف' }, { status: 500 });
  }
}


