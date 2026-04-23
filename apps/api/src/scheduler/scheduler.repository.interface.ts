export const SCHEDULER_REPOSITORY = 'ISchedulerRepository';

export interface ScheduledMessageRecord {
  id: string;
  customerId: string;
  targetPhone: string;
  targetName: string | null;
  content: string;
  scheduledAt: Date;
  status: string;
  sentAt: Date | null;
  repeatInterval: string | null;
  customer: { phoneNumber: string; timezone: string };
}

export interface ISchedulerRepository {
  create(data: {
    customerId: string;
    targetPhone: string;
    targetName: string | null;
    content: string;
    scheduledAt: Date;
    repeatInterval?: string | null;
  }): Promise<ScheduledMessageRecord>;

  findPendingByCustomer(
    customerId: string,
    take?: number,
  ): Promise<ScheduledMessageRecord[]>;

  findDueMessages(now: Date, take?: number): Promise<ScheduledMessageRecord[]>;

  updateStatus(id: string, status: string, sentAt?: Date): Promise<void>;

  getCustomerPhone(customerId: string): Promise<string | null>;
}
