import { Injectable } from '@nestjs/common';
import { prisma } from '@chatbot-generator/database';

type PrismaClientInstance = typeof prisma;

@Injectable()
export class PrismaService {
  get client(): PrismaClientInstance {
    return prisma;
  }
}
