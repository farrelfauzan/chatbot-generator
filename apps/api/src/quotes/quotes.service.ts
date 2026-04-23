import { Inject, Injectable } from '@nestjs/common';
import { QUOTES_REPOSITORY } from './quotes.repository.interface';
import type { IQuotesRepository } from './quotes.repository.interface';

@Injectable()
export class QuotesService {
  constructor(
    @Inject(QUOTES_REPOSITORY) private readonly repo: IQuotesRepository,
  ) {}

  async getDailyQuote(category?: string): Promise<string> {
    const count = await this.repo.count(category);
    if (count === 0) {
      return '💫 _"Sesungguhnya sesudah kesulitan itu ada kemudahan."_ — QS. Al-Insyirah: 6';
    }

    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
        86400000,
    );
    const offset = dayOfYear % count;

    const quote = await this.repo.findOneByOffset(offset, category);
    if (!quote) {
      return '💫 _"Sesungguhnya sesudah kesulitan itu ada kemudahan."_ — QS. Al-Insyirah: 6';
    }

    const source = quote.source ? ` — ${quote.source}` : '';
    return `💫 _"${quote.content}"_${source}`;
  }

  async getRandomQuote(category?: string): Promise<string> {
    const count = await this.repo.count(category);
    if (count === 0) {
      return '💫 _"Sesungguhnya sesudah kesulitan itu ada kemudahan."_ — QS. Al-Insyirah: 6';
    }

    const offset = Math.floor(Math.random() * count);
    const quote = await this.repo.findOneByOffset(offset, category);
    if (!quote) {
      return '💫 _"Sesungguhnya sesudah kesulitan itu ada kemudahan."_ — QS. Al-Insyirah: 6';
    }

    const source = quote.source ? ` — ${quote.source}` : '';
    return `💫 _"${quote.content}"_${source}`;
  }
}
