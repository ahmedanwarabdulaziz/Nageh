export type MemberStatus =
  | 'chance'
  | 'contacted'
  | 'committed'
  | 'voteSecured'
  | 'no'
  | 'voted';

export type MemberElectionDayStatus =
  | 'pending'
  | 'confirmed'
  | 'needsSupport'
  | 'absent'
  | 'voted';

export const MEMBER_STATUS_VALUES: MemberStatus[] = [
  'chance',
  'contacted',
  'committed',
  'voteSecured',
  'no',
  'voted',
];

export const MEMBER_ELECTION_DAY_STATUS_VALUES: MemberElectionDayStatus[] = [
  'pending',
  'confirmed',
  'needsSupport',
  'absent',
  'voted',
];

export type MemberStatusScopeType = 'global' | 'head' | 'leader';

export type MemberStatusScopeTimestamp =
  | Date
  | string
  | { toDate: () => Date }
  | null;

export type MemberStatusScope = {
  scopeType: MemberStatusScopeType;
  scopeId: string | null;
  status: MemberStatus;
  updatedAt?: MemberStatusScopeTimestamp;
  updatedBy?: string | null;
  displayName?: string | null;
  categories?: string[];
};

export type MemberCategoryScopeType = Extract<MemberStatusScopeType, 'head' | 'leader'>;

export type MemberCategory = {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
  scopeType: MemberCategoryScopeType;
  scopeId: string;
  createdBy: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

export type MemberCategorySummary = Pick<MemberCategory, 'id' | 'name' | 'color'>;

export type MemberStatusEvent = {
  status: MemberStatus;
  timestamp?: Date | string | null;
  updatedBy?: string | null;
  note?: string | null;
};

export type MemberNote = {
  noteId: string;
  text: string;
  authorId: string;
  createdAt?: Date | string | null;
};

export type MemberAssignments = {
  headId: string | null;
  leaderId: string | null;
  groupIds: string[];
};

export type MemberAnalytics = {
  lastStatusUpdate: Date | string | null;
  commitmentScore?: number | null;
};

export type MemberMeta = {
  createdAt: Date | string | null;
  createdBy: string | null;
  updatedAt: Date | string | null;
  updatedBy: string | null;
};

export type MemberContact = {
  mobile: string | null;
  mobileSecondary?: string | null;
  mobiles?: string[];
  landLine: string | null;
};

export type ClubMember = {
  id: string;
  fullName: string;
  membershipId: string | null;
  address: string | null;
  contact: MemberContact;
  status: MemberStatus;
  electionDayStatus: MemberElectionDayStatus;
  statusScopes: MemberStatusScope[];
  assignments: MemberAssignments;
  analytics: MemberAnalytics;
  meta: MemberMeta;
  searchTokens: string[];
};


