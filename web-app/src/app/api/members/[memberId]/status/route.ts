'use server';

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { authenticateRequest, ForbiddenError, UnauthorizedError } from '@/lib/auth/server';
import { adminDb } from '@/lib/firebase/admin';
import {
  MEMBER_ELECTION_DAY_STATUS_VALUES,
  MEMBER_STATUS_VALUES,
  type MemberElectionDayStatus,
  type MemberStatus,
  type MemberStatusScope,
  type MemberStatusScopeType,
} from '@/types/member';

type StatusPayload = {
  status?: MemberStatus;
  electionDayStatus?: MemberElectionDayStatus | null;
  note?: string | null;
  categories?: unknown;
};

function isMemberStatus(value: unknown): value is MemberStatus {
  return typeof value === 'string' && MEMBER_STATUS_VALUES.includes(value as MemberStatus);
}

function isElectionDayStatus(value: unknown): value is MemberElectionDayStatus {
  return (
    typeof value === 'string' &&
    MEMBER_ELECTION_DAY_STATUS_VALUES.includes(value as MemberElectionDayStatus)
  );
}

function parseCategoryIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const ids = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry): entry is string => Boolean(entry));
  // Only allow one category per member per scope
  // Take only the first category if multiple are provided
  return ids.length > 0 ? [ids[0]] : [];
}

async function resolveScopeCategoryIds(
  scopeType: Extract<MemberStatusScopeType, 'head' | 'leader'>,
  scopeId: string,
  categoryIds: string[],
) {
  const uniqueIds = Array.from(new Set(categoryIds));
  if (uniqueIds.length === 0) {
    return [];
  }

  const results = await Promise.all(
    uniqueIds.map(async (categoryId) => {
      try {
        const snapshot = await adminDb.collection('memberCategories').doc(categoryId).get();
        if (!snapshot.exists) {
          return null;
        }
        const data = snapshot.data() as {
          scopeType?: MemberStatusScopeType;
          scopeId?: string | null;
        };
        if (data.scopeType !== scopeType) {
          return null;
        }
        if (data.scopeId !== scopeId) {
          return null;
        }
        return categoryId;
      } catch (error) {
        console.error('Failed to verify category ownership', error);
        return null;
      }
    }),
  );

  return results.filter((value): value is string => Boolean(value));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    const context = await authenticateRequest(request, [
      'superAdmin',
      'admin',
      'teamHead',
      'teamLeader',
    ]);

    const { memberId } = await params;
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const body = (await request.json()) as StatusPayload;
    if (!isMemberStatus(body.status)) {
      return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 });
    }

    const electionDayStatus =
      body.electionDayStatus === undefined || body.electionDayStatus === null
        ? undefined
        : isElectionDayStatus(body.electionDayStatus)
          ? body.electionDayStatus
          : null;

    if (electionDayStatus === null) {
      return NextResponse.json({ error: 'حالة يوم الانتخاب غير صالحة' }, { status: 400 });
    }

    const memberRef = adminDb.collection('members').doc(memberId);
    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'العضو غير موجود' }, { status: 404 });
    }

    const memberData = memberSnap.data() as {
      status?: MemberStatus;
      electionDayStatus?: MemberElectionDayStatus;
      assignments?: {
        headId?: string | null;
        leaderId?: string | null;
        groupIds?: string[];
      };
      statusScopes?: unknown;
    };

    const assignments = memberData.assignments ?? {};
    const nextAssignments = {
      headId: assignments.headId ?? null,
      leaderId: assignments.leaderId ?? null,
      groupIds: Array.isArray(assignments.groupIds) ? assignments.groupIds : [],
    };

    const scopeEntriesRaw = Array.isArray(memberData.statusScopes)
      ? memberData.statusScopes
      : [];

    const hasCategoryPayload = Object.prototype.hasOwnProperty.call(body, 'categories');
    let categoryIdsPayload: string[] | undefined;
    if (hasCategoryPayload) {
      const parsed = parseCategoryIds(body.categories);
      if (parsed === null) {
        return NextResponse.json({ error: 'قائمة التصنيفات غير صالحة' }, { status: 400 });
      }
      categoryIdsPayload = parsed;
    }

    type MutableScopeEntry = {
      scopeType: MemberStatusScopeType;
      scopeId: string | null;
      status: MemberStatus;
      updatedAt: string | null;
      updatedBy?: string | null;
      displayName?: string | null;
      categories: string[];
      wasUpdated?: boolean;
    };

    const normalizeTimestamp = (value: unknown): string | null => {
      if (!value) return null;
      if (typeof value === 'string') return value;
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'object' && value !== null && 'toDate' in value) {
        try {
          return (value as { toDate: () => Date }).toDate().toISOString();
        } catch {
          return null;
        }
      }
      return null;
    };

    const scopeMap = new Map<string, MutableScopeEntry>();

    const toScopeType = (value: unknown): MemberStatusScopeType => {
      return value === 'head' || value === 'leader' ? value : 'global';
    };

    scopeEntriesRaw.forEach((entry) => {
      if (typeof entry !== 'object' || entry === null) {
        return;
      }
      const raw = entry as Record<string, unknown>;
      const scopeType = toScopeType(raw.scopeType);
      const scopeId =
        raw.scopeId === undefined || raw.scopeId === null ? null : String(raw.scopeId);
      const status = isMemberStatus(raw.status) ? (raw.status as MemberStatus) : 'chance';
      const updatedAt = normalizeTimestamp(raw.updatedAt);
      const updatedBy =
        raw.updatedBy === undefined || raw.updatedBy === null ? null : String(raw.updatedBy);
      const displayName =
        raw.displayName === undefined || raw.displayName === null
          ? null
          : String(raw.displayName);
      const categories =
        Array.isArray(raw.categories)
          ? raw.categories
              .map((value) => (typeof value === 'string' ? value.trim() : ''))
              .filter((value): value is string => Boolean(value))
          : [];
      const key = `${scopeType}:${scopeId ?? ''}`;
      scopeMap.set(key, {
        scopeType,
        scopeId,
        status,
        updatedAt,
        updatedBy,
        displayName,
        categories,
        wasUpdated: false,
      });
    });

    if (!scopeMap.has('global:')) {
      scopeMap.set('global:', {
        scopeType: 'global',
        scopeId: null,
        status: memberData.status ?? 'chance',
        updatedAt: null,
        updatedBy: null,
        displayName: 'عام',
        categories: [],
        wasUpdated: false,
      });
    }

    const memberUpdates: Record<string, unknown> = {};
    const searchUpdates: Record<string, unknown> = {};

    const isAdminRole = context.role === 'superAdmin' || context.role === 'admin';
    const headIdFromProfile = context.profile.headId ?? null;
    const leaderIdsFromProfile = Array.isArray(context.profile.leaderIds)
      ? context.profile.leaderIds.filter((id): id is string => Boolean(id))
      : [];
    const leaderScopeId =
      leaderIdsFromProfile[0] && leaderIdsFromProfile[0].length > 0
        ? leaderIdsFromProfile[0]
        : context.uid;

    let allowed = isAdminRole;

    if (!allowed) {
      if (context.role === 'teamHead') {
        if (!headIdFromProfile) {
          throw new ForbiddenError('حسابك غير مرتبط برئيس فريق');
        }
        allowed = true;
      } else if (context.role === 'teamLeader') {
        if (!headIdFromProfile) {
          throw new ForbiddenError('حسابك غير مرتبط برئيس فريق');
        }
        allowed = true;
      }
    }

    if (!allowed) {
      throw new ForbiddenError('لا تملك صلاحية تحديث حالة هذا العضو');
    }

    let headScopeCategories: string[] | undefined;
    let leaderScopeCategories: string[] | undefined;

    if (hasCategoryPayload) {
      const requestedCategoryIds = categoryIdsPayload ?? [];
      if (context.role === 'teamHead') {
        if (!headIdFromProfile) {
          throw new ForbiddenError('حسابك غير مرتبط برئيس فريق');
        }
        headScopeCategories = await resolveScopeCategoryIds('head', headIdFromProfile, requestedCategoryIds);
      } else if (context.role === 'teamLeader') {
        leaderScopeCategories = await resolveScopeCategoryIds('leader', leaderScopeId, requestedCategoryIds);
      }
    }

    const nowIso = new Date().toISOString();

    const upsertScope = (
      scopeType: MemberStatusScopeType,
      scopeId: string | null,
      displayName: string | null,
      categories?: string[],
      updateStatus: boolean = true,
    ) => {
      const key = `${scopeType}:${scopeId ?? ''}`;
      const existing = scopeMap.get(key);
      const nextCategories =
        categories !== undefined
          ? categories
          : existing?.categories ?? [];
      const nextStatus = updateStatus
        ? (body.status as MemberStatus)
        : (existing?.status ?? (body.status as MemberStatus));
      scopeMap.set(key, {
        scopeType,
        scopeId,
        status: nextStatus,
        updatedAt: nowIso,
        updatedBy: context.uid,
        displayName,
        categories: nextCategories,
        wasUpdated: true,
      });
    };

    if (isAdminRole) {
      upsertScope('global', null, 'عام', undefined, !hasCategoryPayload);
    } else if (context.role === 'teamHead') {
      const displayName = context.profile.displayName ?? 'الرئيس';
      if (hasCategoryPayload) {
        const categories = headScopeCategories ?? [];
        upsertScope('head', headIdFromProfile, displayName, categories, false);
      } else {
        upsertScope('head', headIdFromProfile, displayName, undefined, true);
      }
      if (headIdFromProfile && nextAssignments.headId !== headIdFromProfile) {
        nextAssignments.headId = headIdFromProfile;
      }
    } else if (context.role === 'teamLeader') {
      const displayName = context.profile.displayName ?? 'القائد';
      if (hasCategoryPayload) {
        const categories = leaderScopeCategories ?? [];
        upsertScope('leader', leaderScopeId, displayName, categories, false);
      } else {
        upsertScope('leader', leaderScopeId, displayName, undefined, true);
      }
      if (nextAssignments.leaderId !== leaderScopeId) {
        nextAssignments.leaderId = leaderScopeId;
      }
      if (!nextAssignments.headId && headIdFromProfile) {
        nextAssignments.headId = headIdFromProfile;
      }
    }

    const nextElectionDayStatus =
      electionDayStatus ?? memberData?.electionDayStatus ?? 'pending';

    const nextMemberScopes = Array.from(scopeMap.values()).map(
      (entry): MemberStatusScope => ({
        scopeType: entry.scopeType,
        scopeId: entry.scopeId,
        status: entry.status,
        updatedAt: entry.updatedAt,
        updatedBy: entry.updatedBy ?? null,
        displayName: entry.displayName ?? null,
        categories: Array.isArray(entry.categories) ? entry.categories : [],
      }),
    );

    const globalScope = scopeMap.get('global:');
    const globalStatus = globalScope ? globalScope.status : memberData.status ?? 'chance';

    memberUpdates.statusScopes = nextMemberScopes;
    memberUpdates.status = globalStatus;
    memberUpdates.electionDayStatus = nextElectionDayStatus;
    memberUpdates.assignments = nextAssignments;
    memberUpdates['analytics.lastStatusUpdate'] = FieldValue.serverTimestamp();
    memberUpdates['meta.updatedAt'] = FieldValue.serverTimestamp();
    memberUpdates['meta.updatedBy'] = context.uid;

    searchUpdates.statusScopes = nextMemberScopes;
    searchUpdates.status = globalStatus;
    searchUpdates.electionDayStatus = nextElectionDayStatus;
    searchUpdates.assignments = nextAssignments;
    searchUpdates['meta.updatedAt'] = FieldValue.serverTimestamp();
    searchUpdates['meta.updatedBy'] = context.uid;

    await Promise.all([
      memberRef.set(memberUpdates, { merge: true }),
      adminDb.collection('memberSearch').doc(memberId).set(searchUpdates, { merge: true }),
      memberRef.collection('statusHistory').add({
        status: body.status,
        note: body.note ?? null,
        updatedBy: context.uid,
        timestamp: FieldValue.serverTimestamp(),
      }),
    ]);

    const responseStatus = globalStatus;

    return NextResponse.json({
      memberId,
      status: responseStatus,
      electionDayStatus: nextElectionDayStatus,
      statusScopes: nextMemberScopes,
      assignments: nextAssignments,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Failed to update member status', error);
    return NextResponse.json({ error: 'تعذر تحديث حالة العضو' }, { status: 500 });
  }
}


