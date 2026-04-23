import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  ISchedulerRepository,
  ScheduledMessageRecord,
} from './scheduler.repository.interface';

@Injectable()
export class SchedulerRepository implements ISchedulerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    customerId: string;
    targetPhone: string;
    targetName: string | null;
    content: string;
    scheduledAt: Date;
    repeatInterval?: string | null;
  }): Promise<ScheduledMessageRecord> {
    const result = await this.prisma.client.scheduledMessage.create({
      data: {
        customerId: data.customerId,
        targetPhone: data.targetPhone,
        targetName: data.targetName,
        content: data.content,
        scheduledAt: data.scheduledAt,
        repeatInterval: data.repeatInterval ?? null,
      },
      include: { customer: { select: { phoneNumber: true, timezone: true } } },
    });
    return result;
  }

  async findPendingByCustomer(
    customerId: string,
    take = 10,
  ): Promise<ScheduledMessageRecord[]> {
    return this.prisma.client.scheduledMessage.findMany({
      where: { customerId, status: 'pending' },
      orderBy: { scheduledAt: 'asc' },
      take,
      include: { customer: { select: { phoneNumber: true, timezone: true } } },
    });
  }

  async findDueMessages(
    now: Date,
    take = 50,
  ): Promise<ScheduledMessageRecord[]> {
    return this.prisma.client.scheduledMessage.findMany({
      where: {
        status: 'pending',
        scheduledAt: { lte: now },
      },
      include: { customer: { select: { phoneNumber: true, timezone: true } } },
      take,
    });
  }

  async updateStatus(id: string, status: string, sentAt?: Date): Promise<void> {
    await this.prisma.client.scheduledMessage.update({
      where: { id },
      data: { status, ...(sentAt && { sentAt }) },
    });
  }

  async getCustomerPhone(customerId: string): Promise<string | null> {
    const customer = await this.prisma.client.customer.findUnique({
      where: { id: customerId },
      select: { phoneNumber: true },
    });
    return customer?.phoneNumber || null;
  }
}
