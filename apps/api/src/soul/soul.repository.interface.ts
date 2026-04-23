export const SOUL_REPOSITORY = 'ISoulRepository';

export interface CustomerProfile {
  nickname: string | null;
  name: string | null;
  location: string | null;
  timezone: string | null;
  onboardingDone: boolean;
}

export interface RecentMemo {
  id: string;
  title: string | null;
  content: string;
  createdAt: Date;
}

export interface PrayerReminderInfo {
  location: string;
  prayers: string[];
  isActive: boolean;
}

export interface PendingSchedule {
  id: string;
  content: string;
  scheduledAt: Date;
  targetName: string | null;
}

export interface MemoSearchResult {
  id: string;
  title: string | null;
  content: string;
  similarity: number;
}

export interface ISoulRepository {
  getCustomerProfile(customerId: string): Promise<CustomerProfile | null>;
  getPrayerReminder(customerId: string): Promise<PrayerReminderInfo | null>;
  getMemoCount(customerId: string): Promise<number>;
  getRecentMemos(customerId: string, take?: number): Promise<RecentMemo[]>;
  getPendingSchedules(
    customerId: string,
    take?: number,
  ): Promise<PendingSchedule[]>;
  searchMemosBySimilarity(
    customerId: string,
    embedding: number[],
    limit?: number,
  ): Promise<MemoSearchResult[]>;
}
