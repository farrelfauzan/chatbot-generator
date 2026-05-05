import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CS_PHONES_REPOSITORY,
  type ICsPhonesRepository,
  type CsPhoneRecord,
} from './cs-phones.repository.interface';

@Injectable()
export class CsPhonesService {
  private readonly logger = new Logger(CsPhonesService.name);

  constructor(
    @Inject(CS_PHONES_REPOSITORY)
    private readonly repo: ICsPhonesRepository,
  ) {}

  async findAll(): Promise<CsPhoneRecord[]> {
    return this.repo.findAll();
  }

  async create(data: { phone: string; name: string }): Promise<CsPhoneRecord> {
    return this.repo.create(data);
  }

  async update(
    id: string,
    data: Partial<{ phone: string; name: string; isActive: boolean }>,
  ): Promise<CsPhoneRecord> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }

  /**
   * Pick the active CS phone with the least load.
   * Returns null if no active CS phones are configured.
   */
  async pickLeastLoaded(): Promise<CsPhoneRecord | null> {
    const active = await this.repo.findActive();
    if (active.length === 0) return null;
    // Already sorted by loadCount ASC from repo
    return active[0];
  }

  /**
   * Increment load counter after escalation is sent.
   */
  async recordEscalation(id: string): Promise<void> {
    await this.repo.incrementLoad(id);
  }

  /**
   * Reset all load counters (e.g. daily via cron).
   */
  async resetLoads(): Promise<void> {
    await this.repo.resetAllLoads();
    this.logger.log('All CS phone load counters reset');
  }
}
