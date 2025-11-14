import type { Timestamp } from 'firebase/firestore';

export type TeamHeaderRecord = {
  displayName: string;
  email: string;
  phone?: string | null;
  userId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

export type TeamLeaderRecord = {
  displayName: string;
  email: string;
  phone?: string | null;
  headId: string;
  userId: string;
  mustChangePassword?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};



