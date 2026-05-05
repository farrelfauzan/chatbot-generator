import { Module } from '@nestjs/common';
import { CsPhonesController } from './cs-phones.controller';
import { CsPhonesService } from './cs-phones.service';
import { CsPhonesRepository } from './cs-phones.repository';
import { CS_PHONES_REPOSITORY } from './cs-phones.repository.interface';

@Module({
  controllers: [CsPhonesController],
  providers: [
    CsPhonesService,
    { provide: CS_PHONES_REPOSITORY, useClass: CsPhonesRepository },
  ],
  exports: [CsPhonesService],
})
export class CsPhonesModule {}
