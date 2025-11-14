'use server';

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { authenticateRequest, ForbiddenError, UnauthorizedError } from '@/lib/auth/server';
import { adminDb } from '@/lib/firebase/admin';
import {
  type MemberCategory,
  type MemberCategoryScopeType,
} from '@/types/member';

type CreateCategoryPayload = {
  name?: string;
  color?: string | null;
  description?: string | null;
};

type MemberCategoryDocument = Omit<MemberCategory, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt: FirebaseFirestore.FieldValue | Date | string | null;
  updatedAt: FirebaseFirestore.FieldValue | Date | string | null;
};

const ALLOWED_ROLES = ['superAdmin', 'admin', 'teamHead', 'teamLeader'] as const;

function normalizeName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 100) {
    return trimmed.slice(0, 100);
  }
  return trimmed;
}

function normalizeColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const isValid = /^#[0-9A-Fa-f]{3,8}$/.test(hex);
  return isValid ? hex : null;
}

function normalizeDescription(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > 200 ? trimmed.slice(0, 200) : trimmed;
}

async function fetchCategoriesForScope(scopeType: MemberCategoryScopeType, scopeId: string) {
  const snapshot = await adminDb
    .collection('memberCategories')
    .where('scopeType', '==', scopeType)
    .where('scopeId', '==', scopeId)
    .get();

  const categories = snapshot.docs.map((doc) => {
    const data = doc.data() as Omit<MemberCategory, 'id'>;
    return {
      id: doc.id,
      ...data,
    } satisfies MemberCategory;
  });

  // Sort by name in memory to avoid requiring a composite index
  return categories.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export async function GET(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, [...ALLOWED_ROLES]);
    const { searchParams } = new URL(request.url);

    const requestedScopeType = searchParams.get('scopeType');
    const requestedScopeId = searchParams.get('scopeId');

    const categories: MemberCategory[] = [];
    const seen = new Set<string>();

    const addCategories = (list: MemberCategory[]) => {
      list.forEach((category) => {
        if (!seen.has(category.id)) {
          seen.add(category.id);
          categories.push(category);
        }
      });
    };

    if (context.role === 'superAdmin' || context.role === 'admin') {
      // For admin roles, if scopeType and scopeId are provided, only return categories for that scope
      // This ensures categories are properly scoped even for admins
      if (requestedScopeType && requestedScopeId) {
        const scopeType =
          requestedScopeType === 'head' || requestedScopeType === 'leader'
            ? (requestedScopeType as MemberCategoryScopeType)
            : null;
        if (!scopeType) {
          return NextResponse.json({ error: 'نطاق غير صالح' }, { status: 400 });
        }
        const list = await fetchCategoriesForScope(scopeType, requestedScopeId);
        addCategories(list);
      } else {
        // If no scope is specified, return all categories (for admin overview)
        // But this should rarely be used - the UI should always specify scope
        const snapshot = await adminDb.collection('memberCategories').orderBy('name').limit(500).get();
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as Omit<MemberCategory, 'id'>;
          const entry = {
            id: doc.id,
            ...data,
          } satisfies MemberCategory;
          addCategories([entry]);
        });
      }

      return NextResponse.json({ categories });
    }

    if (context.role === 'teamHead') {
      const headId = context.profile.headId;
      if (!headId) {
        throw new ForbiddenError('لا يمكن الوصول إلى التصنيفات بدون ربط رئيس الفريق');
      }
      const list = await fetchCategoriesForScope('head', headId);
      addCategories(list);
      return NextResponse.json({ categories });
    }

    if (context.role === 'teamLeader') {
      const headId = context.profile.headId;
      const leaderIds = Array.isArray(context.profile.leaderIds)
        ? context.profile.leaderIds.filter((id): id is string => Boolean(id))
        : [];
      const leaderScopeId = leaderIds[0] && leaderIds[0].length > 0 ? leaderIds[0] : context.uid;

      const queries: Array<Promise<MemberCategory[]>> = [
        fetchCategoriesForScope('leader', leaderScopeId),
      ];

      if (headId) {
        queries.push(fetchCategoriesForScope('head', headId));
      }

      const results = await Promise.all(queries);
      results.forEach(addCategories);

      return NextResponse.json({ categories });
    }

    return NextResponse.json({ categories });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[GET /api/member-categories] Failed to load categories:', {
      message: errorMessage,
      stack: errorStack,
      error,
    });
    return NextResponse.json(
      { 
        error: 'تعذر تحميل التصنيفات',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, ['teamHead', 'teamLeader']);
    const body = (await request.json()) as CreateCategoryPayload;

    const name = normalizeName(body.name);
    if (!name) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    }

    const color = normalizeColor(body.color ?? null);
    const description = normalizeDescription(body.description ?? null);

    let scopeType: MemberCategoryScopeType | null = null;
    let scopeId: string | null = null;

    if (context.role === 'teamHead') {
      scopeType = 'head';
      scopeId = context.profile.headId ?? null;
    } else if (context.role === 'teamLeader') {
      scopeType = 'leader';
      const leaderIds = Array.isArray(context.profile.leaderIds)
        ? context.profile.leaderIds.filter((id): id is string => Boolean(id))
        : [];
      scopeId = leaderIds[0] && leaderIds[0].length > 0 ? leaderIds[0] : context.uid;
    }

    if (!scopeType || !scopeId) {
      throw new ForbiddenError('لا يمكن إنشاء التصنيفات لهذا الحساب');
    }

    const docRef = adminDb.collection('memberCategories').doc();
    const payload: MemberCategoryDocument = {
      name,
      color: color ?? null,
      description: description ?? null,
      scopeType,
      scopeId,
      createdBy: context.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(payload);

    const category: MemberCategory = {
      id: docRef.id,
      name,
      color: color ?? null,
      description: description ?? null,
      scopeType,
      scopeId,
      createdBy: context.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[POST /api/member-categories] Failed to create category:', {
      message: errorMessage,
      stack: errorStack,
      error,
    });
    return NextResponse.json(
      { 
        error: 'تعذر إنشاء التصنيف',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

