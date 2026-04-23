import { Module } from '@nestjs/common';
import { GowaModule } from '../gowa/gowa.module';
import { QuotesService } from './quotes.service';
import { QuotesRepository } from './quotes.repository';
import { DailyQuoteJob } from './jobs/daily-quote.job';
import { QUOTES_REPOSITORY } from './quotes.repository.interface';

@Module({
  imports: [GowaModule],
  providers: [
    { provide: QUOTES_REPOSITORY, useClass: QuotesRepository },
    QuotesService,
    DailyQuoteJob,
  ],
  exports: [QuotesService],
})
export class QuotesModule {}
