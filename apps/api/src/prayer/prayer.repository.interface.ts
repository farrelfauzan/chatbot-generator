export const PRAYER_REPOSITORY = 'IPrayerRepository';

export interface PrayerReminderRecord {
  id: string;
  customerId: string;
  location: string;
  timezone: string;
  prayers: string[];
  isActive: boolean;
  lastSentKey: string | null;
  customer: {
    phoneNumber: string;
    nickname: string | null;
    name: string | null;
  };
}

export interface IPrayerRepository {
  upsertReminder(
    customerId: string,
    location: string,
    prayers: string[],
    isActive: boolean,
    timezone?: string,
  ): Promise<void>;

  updateLastSentKey(reminderId: string, key: string): Promise<void>;

  findActiveReminders(): Promise<PrayerReminderRecord[]>;

  findByCustomerId(customerId: string): Promise<{
    location: string;
    prayers: string[];
    isActive: boolean;
  } | null>;

  disableReminder(customerId: string): Promise<void>;
}
