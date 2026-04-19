import { Controller, Post, UseGuards } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestion: IngestionService) {}

  @Post('reindex')
  reindexAll() {
    return this.ingestion.reindexAll();
  }

  @Post('reindex/faq')
  reindexFaq() {
    return this.ingestion.ingestAllFaq();
  }
}
