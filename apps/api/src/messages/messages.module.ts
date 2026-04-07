import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessageRepository } from './messages.repository';
import { MESSAGE_REPOSITORY } from './messages.repository.interface';

@Module({
  providers: [
    MessagesService,
    { provide: MESSAGE_REPOSITORY, useClass: MessageRepository },
  ],
  exports: [MessagesService],
})
export class MessagesModule {}
